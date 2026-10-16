import { selectPracticeSet } from "./question-selector.js";
import { validateQuestionCatalogue } from "./question-catalogue.js";

const subjectSearch = document.getElementById("subject-search");
const topicSearch = document.getElementById("topic-search");
const starSelector = document.getElementById("star-selector");
const starDescription = document.getElementById("star-description");
const materialsInput = document.getElementById("materials");
const fileList = document.getElementById("file-list");
const findButton = document.getElementById("find-questions");
const engineMessage = document.getElementById("engine-message");
const questionCountInput = document.getElementById("question-count");
const strategyInput = document.getElementById("practice-strategy");

const descriptions = {
  1: "Level 1 — Easy: build your foundation.",
  2: "Level 2 — Basic: practise core knowledge.",
  3: "Level 3 — Moderate: apply what you know.",
  4: "Level 4 — Intermediate: connect related ideas.",
  5: "Level 5 — Hard: solve demanding questions.",
  6: "Level 6 — Very hard: handle complex applications.",
  7: "Level 7 — Expert: tackle advanced challenges."
};

const rewardPoints = {
  1: 2, 2: 5, 3: 10, 4: 15, 5: 20, 6: 20, 7: 20
};

let selectedLevel = 1;
let sessionPoints = 0;
const answeredQuestions = new Set();

function showMessage(message) {
  if (engineMessage) engineMessage.textContent = message;
}

function updateDifficulty(level) {
  selectedLevel = Number(level);

  starSelector?.querySelectorAll("[data-level]").forEach((button) => {
    const selected = Number(button.dataset.level) === selectedLevel;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  if (starDescription) {
    starDescription.textContent = descriptions[selectedLevel] || descriptions[1];
  }
}

starSelector?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-level]");
  if (!button || !starSelector.contains(button)) return;

  const level = Number(button.dataset.level);
  if (level >= 1 && level <= 7) updateDifficulty(level);
});

materialsInput?.addEventListener("change", () => {
  if (!fileList) return;

  fileList.replaceChildren();
  const files = Array.from(materialsInput.files || []);

  if (!files.length) {
    fileList.textContent = "No materials selected.";
    return;
  }

  files.forEach((file) => {
    const item = document.createElement("p");
    item.textContent =
      `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
    fileList.appendChild(item);
  });
});

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderResults(questions) {
  document.getElementById("search-results")?.remove();

  const results = createElement("section", "search-results");
  results.id = "search-results";

  if (!questions.length) {
    results.appendChild(createElement(
      "p",
      "empty-results",
      "No questions match your choices yet. Try another subject, topic, or difficulty."
    ));
    findButton?.insertAdjacentElement("afterend", results);
    return;
  }

  questions.forEach((question, index) => {
    const card = createElement("article", "question-card");
    card.append(
      createElement("h3", "question-heading", `Question ${index + 1}`),
      createElement(
        "p",
        "question-details",
        `${question.subject} • ${question.topic} • ${question.difficulty} star(s)`
      ),
      createElement("p", "question-prompt", question.question)
    );

    const feedback = createElement("p", "answer-feedback");
    feedback.setAttribute("aria-live", "polite");

    if (question.type !== "multiple-choice") {
      card.appendChild(createElement(
        "p",
        "question-type-not-supported",
        "This question type is not supported by the current answer checker yet."
      ));
      results.appendChild(card);
      return;
    }

    const optionGroup = createElement("div", "question-options");
    const groupName = `answer-${question.id}-${index}`;
    let selectedAnswer = null;

    question.options.forEach((option, optionIndex) => {
      const label = createElement("label", "answer-option");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = groupName;
      radio.value = String(optionIndex);

      radio.addEventListener("change", () => {
        selectedAnswer = optionIndex;
      });

      label.append(radio, document.createTextNode(` ${option}`));
      optionGroup.appendChild(label);
    });

    const checkButton = createElement("button", "check-answer", "Check answer");
    checkButton.type = "button";

    checkButton.addEventListener("click", () => {
      if (answeredQuestions.has(question.id)) return;

      if (selectedAnswer === null) {
        feedback.textContent = "Choose an answer first.";
        return;
      }

      answeredQuestions.add(question.id);
      const correct = selectedAnswer === question.answer;

      if (correct) {
        const earned = rewardPoints[question.difficulty] || 2;
        sessionPoints += earned;
        feedback.textContent = `Correct! You earned ${earned} points.`;
      } else {
        sessionPoints = Math.max(0, sessionPoints - 2);
        feedback.textContent =
          `Not quite. The correct answer is: ${question.options[question.answer]}.`;
      }

      if (question.explanation) {
        feedback.textContent += ` Explanation: ${question.explanation}`;
      }

      optionGroup.querySelectorAll("input").forEach((input) => {
        input.disabled = true;
      });
      checkButton.disabled = true;

      const score = document.getElementById("session-points");
      if (score) score.textContent = `Session points: ${sessionPoints}`;
    });

    card.append(optionGroup, checkButton, feedback);
    results.appendChild(card);
  });

  findButton?.insertAdjacentElement("afterend", results);
}

findButton?.addEventListener("click", () => {
  const subject = subjectSearch?.value.trim() || "";
  const topic = topicSearch?.value.trim() || "";

  if (!subject && !topic) {
    showMessage("Enter a subject or topic before finding questions.");
    return;
  }

  const count = Number(questionCountInput?.value || 10);
  const strategy = strategyInput?.value || "random";

  try {
    const questions = selectPracticeSet({
      subject,
      topic,
      minDifficulty: selectedLevel,
      maxDifficulty: selectedLevel,
      count,
      strategy
    });

    renderResults(questions);

    showMessage(
      questions.length
        ? `Found ${questions.length} question(s) at ${selectedLevel}-star difficulty.`
        : "No matching questions were found. Try a different subject, topic, or star level."
    );
  } catch (error) {
    console.error("Question selection failed:", error);
    showMessage("Something went wrong while finding questions. Please try again.");
  }
});

if (!document.getElementById("session-points")) {
  const score = createElement("p", "session-points", "Session points: 0");
  score.id = "session-points";
  findButton?.insertAdjacentElement("afterend", score);
}

updateDifficulty(1);

// Check the question catalogue when the practice page loads.
const catalogueReport = validateQuestionCatalogue();

if (!catalogueReport.valid) {
  console.error("Question catalogue validation failed:", catalogueReport.errors);
  showMessage(
    `Catalogue check found ${catalogueReport.errors.length} problem(s). Check the browser console.`
  );
} else {
  console.info(
    `Catalogue check passed: ${catalogueReport.totalQuestions} questions, ` +
    `${catalogueReport.uniqueIds} unique IDs.`
  );
}
