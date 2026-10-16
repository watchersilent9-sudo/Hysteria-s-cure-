
import { searchQuestions } from "./question-catalogue.js";

const subjectSearch = document.getElementById("subject-search");
const topicSearch = document.getElementById("topic-search");
const starSelector = document.getElementById("star-selector");
const starDescription = document.getElementById("star-description");
const materialsInput = document.getElementById("materials");
const fileList = document.getElementById("file-list");
const findButton = document.getElementById("find-questions");
const message = document.getElementById("engine-message");

let selectedLevel = 1;

const descriptions = {
  1: "Foundation — recall essential facts.",
  2: "Understanding — explain key concepts.",
  3: "Application — use knowledge in familiar situations.",
  4: "Analysis — interpret information and patterns.",
  5: "Multi-concept — connect different ideas.",
  6: "Advanced reasoning — solve unfamiliar problems.",
  7: "Mastery — tackle complex challenges."
};

const rewardTiers = {
  1: { name: "Easy", points: 2 },
  2: { name: "Medium", points: 5 },
  3: { name: "Hard", points: 10 },
  4: { name: "Very Hard", points: 15 },
  5: { name: "Expert", points: 20 },
  6: { name: "Expert", points: 20 },
  7: { name: "Expert", points: 20 }
};

function updateDifficulty(level) {
  selectedLevel = level;

  starSelector.querySelectorAll("button").forEach(button => {
    const selected = Number(button.dataset.level) === level;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  starDescription.textContent =
    `${level} star${level === 1 ? "" : "s"} — ${descriptions[level]}`;
}

starSelector.addEventListener("click", event => {
  const button = event.target.closest("button[data-level]");
  if (button) updateDifficulty(Number(button.dataset.level));
});

materialsInput.addEventListener("change", () => {
  const files = Array.from(materialsInput.files);

  fileList.textContent = files.length
    ? files.map(file =>
        `${file.name} (${formatSize(file.size)})`
      ).join("\n")
    : "No files selected.";
});

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderResults(questions) {
  const oldResults = document.getElementById("search-results");
  if (oldResults) oldResults.remove();

  const container = document.createElement("section");
  container.id = "search-results";
  container.className = "panel";

  const heading = document.createElement("h2");
  heading.textContent = `Practice Questions (${questions.length})`;

  const scoreDisplay = document.createElement("p");
  scoreDisplay.textContent = "Session points: 0";

  container.append(heading, scoreDisplay);

  if (questions.length === 0) {
    const empty = document.createElement("p");
    empty.textContent =
      "No matching questions found. Try another topic or difficulty.";
    container.appendChild(empty);
  }

  let score = 0;

  questions.forEach((question, index) => {
    const card = document.createElement("article");
    card.className = "panel";

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${question.question}`;

    const meta = document.createElement("p");
    meta.textContent =
      `${question.subject} • ${question.topic} • ` +
      `${"★".repeat(question.difficulty)}`;

    const optionsBox = document.createElement("div");
    optionsBox.className = "answer-options";

    const feedback = document.createElement("p");
    feedback.setAttribute("aria-live", "polite");

    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.textContent = "Check Answer";

    let selectedIndex = null;
    let answered = false;

    question.options.forEach((option, optionIndex) => {
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.margin = "10px 0";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `question-${index}`;
      radio.value = optionIndex;

      radio.addEventListener("change", () => {
        selectedIndex = optionIndex;
      });

      label.append(radio, document.createTextNode(` ${option}`));
      optionsBox.appendChild(label);
    });

    checkButton.addEventListener("click", () => {
      if (answered) return;

      if (selectedIndex === null) {
        feedback.textContent = "Choose an answer first.";
        return;
      }

      answered = true;

      const correct = selectedIndex === question.answerIndex;
      const reward = rewardTiers[question.difficulty] || rewardTiers[1];

      if (correct) {
        score += reward.points;

        feedback.textContent =
          `Correct! +${reward.points} points (${reward.name}). ` +
          question.explanation;
      } else {
        const previousScore = score;
        score = Math.max(0, score - 2);

        const pointsLost = previousScore - score;

        feedback.textContent =
          `Not quite. ${pointsLost > 0 ? `-${pointsLost}` : "0"} points. ` +
          `Correct answer: ${question.options[question.answerIndex]}. ` +
          question.explanation;
      }

      scoreDisplay.textContent = `Session points: ${score}`;

      optionsBox.querySelectorAll("input").forEach(input => {
        input.disabled = true;
      });

      checkButton.disabled = true;
      checkButton.textContent = "Answer Checked";
    });

    card.append(title, meta, optionsBox, checkButton, feedback);
    container.appendChild(card);
  });

  message.insertAdjacentElement("afterend", container);
}

findButton.addEventListener("click", () => {
  const subject = subjectSearch.value.trim();
  const topic = topicSearch.value.trim();

  if (!subject && !topic) {
    message.textContent =
      "Enter a subject or topic to search the catalogue.";
    return;
  }

  const results = searchQuestions({
    subject,
    topic,
    difficulty: selectedLevel
  });

  message.textContent =
    `Searching the current catalogue at ${selectedLevel}-star difficulty.`;

  renderResults(results);
});

updateDifficulty(1);
