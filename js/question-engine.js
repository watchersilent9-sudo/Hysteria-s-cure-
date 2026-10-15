
const descriptions = {
  1: "Foundation — recall essential facts.",
  2: "Understanding — explain key concepts.",
  3: "Application — use knowledge in familiar situations.",
  4: "Analysis — interpret information and patterns.",
  5: "Multi-concept — connect different ideas.",
  6: "Advanced reasoning — solve unfamiliar problems.",
  7: "Mastery — tackle complex, multi-step challenges."
};

const starSelector = document.getElementById("star-selector");
const starDescription = document.getElementById("star-description");
const subjectSearch = document.getElementById("subject-search");
const topicSearch = document.getElementById("topic-search");
const materialsInput = document.getElementById("materials");
const fileList = document.getElementById("file-list");
const findButton = document.getElementById("find-questions");
const message = document.getElementById("engine-message");

let selectedLevel = 1;

starSelector.addEventListener("click", event => {
  const button = event.target.closest("button[data-level]");
  if (!button) return;

  selectedLevel = Number(button.dataset.level);

  starSelector.querySelectorAll("button").forEach(star => {
    const selected = Number(star.dataset.level) === selectedLevel;
    star.classList.toggle("selected", selected);
    star.setAttribute("aria-pressed", String(selected));
  });

  starDescription.textContent =
    `${selectedLevel} star${selectedLevel === 1 ? "" : "s"} — ` +
    descriptions[selectedLevel];
});

materialsInput.addEventListener("change", () => {
  const files = Array.from(materialsInput.files);

  if (files.length === 0) {
    fileList.textContent = "No files selected.";
    return;
  }

  fileList.textContent = files
    .map(file => `${file.name} (${formatSize(file.size)})`)
    .join("\n");
});

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

findButton.addEventListener("click", () => {
  const subject = subjectSearch.value.trim();
  const topic = topicSearch.value.trim();

  if (!subject) {
    message.textContent = "Enter a subject first.";
    subjectSearch.focus();
    return;
  }

  message.textContent =
    `Search request prepared for ${subject}` +
    `${topic ? ` — ${topic}` : ""}, ` +
    `difficulty ${selectedLevel}/7. ` +
    "The question search service has not been connected yet.";
});

// Set the initial selected state.
starSelector.querySelector('[data-level="1"]')
  .setAttribute("aria-pressed", "true");
