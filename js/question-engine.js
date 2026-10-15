
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
  ? files.map(file => `${file.name} (${formatSize(file.size)})`).join("\n")
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
  heading.textContent = `Search Results (${questions.length})`;
  container.appendChild(heading);

  if (questions.length === 0) {
    const empty = document.createElement("p");
    empty.textContent =
      "No matching questions found in the current catalogue. " +
      "Try another topic or difficulty, or add more questions.";
    container.appendChild(empty);
  }

  questions.forEach(question => {
    const card = document.createElement("article");
    card.className = "panel";

    const title = document.createElement("h3");
    title.textContent = question.question;

    const meta = document.createElement("p");
    meta.textContent =
      `${question.subject} • ${question.topic} • ` +
      `${"★".repeat(question.difficulty)}`;

    const list = document.createElement("ol");
    list.type = "A";

    question.options.forEach(option => {
      const item = document.createElement("li");
      item.textContent = option;
      list.appendChild(item);
    });

    const answer = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Show answer and explanation";

    const explanation = document.createElement("p");
    explanation.textContent =
      `Answer: ${question.options[question.answerIndex]}. ` +
      question.explanation;

    answer.append(summary, explanation);
    card.append(title, meta, list, answer);
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
