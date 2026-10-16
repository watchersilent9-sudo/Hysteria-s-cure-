
import { selectPracticeSet } from "./question-selector.js";
import { validateQuestionCatalogue } from "./question-catalogue.js";

const subjectSearch = document.getElementById("subject-search");
const topicSearch = document.getElementById("topic-search");
const starSelector = document.getElementById("star-selector");
const materialsInput = document.getElementById("materials");
const fileList = document.getElementById("file-list");
const questionCountSelect = document.getElementById("question-count");
const practiceStrategy = document.getElementById("practice-strategy");
const findButton = document.getElementById("find-questions");
const engineMessage = document.getElementById("engine-message");
const catalogueStatus = document.getElementById("catalogue-status");

const rewardPoints = {
  1: 2,
  2: 5,
  3: 10,
  4: 15,
  5: 20,
  6: 20,
  7: 20
};

let selectedDifficulty = 1;
let sessionPoints = 0;
let questionsAnswered = 0;
let correctAnswers = 0;
let currentQuestions = [];
let answeredQuestions = new Set();
let incorrectQuestions = [];

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function showMessage(message) {
  if (engineMessage) engineMessage.textContent = message;
}

function updateCatalogueStatus() {
  if (!catalogueStatus) return;

  const result = validateQuestionCatalogue();

  if (result.valid) {
    catalogueStatus.textContent =
      `Catalogue valid: ${result.totalQuestions} questions, ` +
      `${result.uniqueIds} unique IDs.`;
  } else {
    catalogueStatus.textContent =
      `Catalogue has ${result.errors.length} issue(s): ` +
      result.errors.slice(0, 3).join(" ");
  }
}

function selectDifficulty(level) {
  selectedDifficulty = Number(level);

  starSelector?.querySelectorAll("[data-level]").forEach(button => {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.level) === selectedDifficulty)
    );
  });
}

starSelector?.querySelectorAll("[data-level]").forEach(button => {
  button.addEventListener("click", () => {
    selectDifficulty(button.dataset.level);
  });
});

selectDifficulty(selectedDifficulty);

materialsInput?.addEventListener("change", () => {
  if (!fileList) return;

  fileList.replaceChildren();

  const files = Array.from(materialsInput.files || []);

  if (!files.length) {
    fileList.textContent = "No files selected.";
    return;
  }

  files.forEach(file => {
    fileList.appendChild(
      createElement(
        "p",
        "",
        `${file.name} — ${(file.size / 1024).toFixed(1)} KB`
      )
    );
  });

  showMessage(
    "Files listed only. Document extraction is not available yet."
  );
});

function resetSession() {
  sessionPoints = 0;
  questionsAnswered = 0;
  correctAnswers = 0;
  answeredQuestions = new Set();
  incorrectQuestions = [];
}

function finishSession() {
  const results = document.getElementById("question-results");
  if (!results) return;

  const accuracy = questionsAnswered
    ? Math.round((correctAnswers / questionsAnswered) * 100)
    : 0;

  results.replaceChildren();
  results.appendChild(createElement("h2", "", "Practice session complete"));
  results.appendChild(createElement("p", "", `Questions answered: ${questionsAnswered}`));
  results.appendChild(createElement("p", "", `Correct answers: ${correctAnswers}`));
  results.appendChild(createElement("p", "", `Accuracy: ${accuracy}%`));
  results.appendChild(createElement("p", "", `Session points: ${sessionPoints}`));

  let message = "Keep practising. Every attempt helps you improve.";
  if (accuracy === 100 && questionsAnswered > 0) {
    message = "Perfect session! Excellent work.";
  } else if (accuracy >= 80) {
    message = "Great work! Keep building on this progress.";
  } else if (accuracy >= 50) {
    message = "Good effort. Review your mistakes and try again.";
  }

  results.appendChild(createElement("p", "", message));

  if (!incorrectQuestions.length) {
    results.appendChild(
      createElement("p", "", "Excellent! No incorrect answers to review.")
    );
  } else {
    results.appendChild(
      createElement("h3", "", "Review your incorrect answers")
    );

    incorrectQuestions.forEach((question, index) => {
      const card = createElement("section", "panel");
      card.appendChild(
        createElement("h4", "", `${index + 1}. ${question.question}`)
      );
      card.appendChild(
        createElement(
          "p",
          "",
          `Correct answer: ${question.options[question.answerIndex]}`
        )
      );

      if (question.explanation) {
        card.appendChild(
          createElement("p", "", `Explanation: ${question.explanation}`)
        );
      }

      results.appendChild(card);
    });
  }

  showMessage("Session finished. Your results are ready to review.");
}

function renderQuestions(questions) {
  document.getElementById("question-results")?.remove();

  const results = createElement("div", "");
  results.id = "question-results";

  const finishButton = createElement(
    "button",
    "finish-session",
    "Finish practice session"
  );

  finishButton.type = "button";
  finishButton.disabled = true;
  finishButton.addEventListener("click", finishSession);

  results.appendChild(createElement("h2", "", "Your practice questions"));
  results.appendChild(
    createElement(
      "p",
      "",
      `Loaded ${questions.length} question(s). Answer all of them to finish.`
    )
  );

  questions.forEach((question, index) => {
    const card = createElement("section", "panel");
    card.appendChild(
      createElement("h3", "", `${index + 1}. ${question.question}`)
    );
    card.appendChild(
      createElement("p", "", `Difficulty: ${question.difficulty} star(s)`)
    );

    const optionsContainer = createElement("div", "question-options");
    const optionInputs = [];

    question.options.forEach((option, optionIndex) => {
      const label = createElement("label", "question-option");
      const input = document.createElement("input");

      input.type = "radio";
      input.name = `question-${index}`;
      input.value = String(optionIndex);

      label.append(input, document.createTextNode(` ${option}`));
      optionsContainer.appendChild(label);
      optionInputs.push(input);
    });

    const checkButton = createElement("button", "check-answer", "Check answer");
    checkButton.type = "button";

    const feedback = createElement("p", "question-feedback");
    feedback.setAttribute("aria-live", "polite");

    checkButton.addEventListener("click", () => {
      if (answeredQuestions.has(question.id)) return;

      const chosenInput = optionInputs.find(input => input.checked);

      if (!chosenInput) {
        feedback.textContent = "Choose an answer first.";
        return;
      }

      const chosenAnswer = Number(chosenInput.value);
      const isCorrect = chosenAnswer === question.answerIndex;

      questionsAnswered++;
      answeredQuestions.add(question.id);

      optionInputs.forEach(input => {
        input.disabled = true;
      });
      checkButton.disabled = true;

      if (isCorrect) {
        correctAnswers++;
        const earned = rewardPoints[question.difficulty] || 0;
        sessionPoints += earned;
        feedback.textContent = `Correct! You earned ${earned} points.`;
      } else {
        sessionPoints = Math.max(0, sessionPoints - 2);
        incorrectQuestions.push(question);
        feedback.textContent =
          `Not quite. The correct answer is: ${question.options[question.answerIndex]}.`;
      }

      if (question.explanation) {
        feedback.textContent += ` ${question.explanation}`;
      }

      if (questionsAnswered === currentQuestions.length) {
        finishButton.disabled = false;
        showMessage("All questions answered. You can finish your session.");
      } else {
        showMessage(
          `${questionsAnswered} of ${currentQuestions.length} questions answered.`
        );
      }
    });

    card.append(optionsContainer, checkButton, feedback);
    results.appendChild(card);
  });

  results.appendChild(finishButton);
  findButton?.insertAdjacentElement("afterend", results);
}

findButton?.addEventListener("click", () => {
  try {
    resetSession();

    currentQuestions = selectPracticeSet({
      subject: subjectSearch?.value.trim() || "",
      topic: topicSearch?.value.trim() || "",
      minDifficulty: selectedDifficulty,
      maxDifficulty: selectedDifficulty,
      count: Number(questionCountSelect?.value || 10),
      strategy: practiceStrategy?.value || "random"
    });

    if (!currentQuestions.length) {
      document.getElementById("question-results")?.remove();
      showMessage(
        "No questions match these filters yet. Try another subject, topic, or difficulty."
      );
      return;
    }

    renderQuestions(currentQuestions);

    showMessage(`${currentQuestions.length} question(s) loaded.`);
  } catch (error) {
    showMessage(error.message || "Could not load questions.");
  }
});

updateCatalogueStatus();
