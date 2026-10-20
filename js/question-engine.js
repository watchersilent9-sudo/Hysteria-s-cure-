import { selectPracticeSetAsync } from "./question-selector.js";
import { validateQuestionCatalogue } from "./question-catalogue.js";
import { auth, database } from "./firebase-client.js";
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

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
let loadingQuestions = false;

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== "") element.textContent = text;

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
      `Local catalogue valid: ${result.totalQuestions} questions, ` +
      `${result.uniqueIds} unique IDs.`;
  } else {
    catalogueStatus.textContent =
      `Local catalogue has ${result.errors.length} issue(s): ` +
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

// Simple helper for unique string hashing if question has no ID
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

async function saveProgressToFirebase() {
  const user = auth.currentUser;
  if (!user) {
    console.warn("No user logged in. Progress not saved to Firebase.");
    return false;
  }

  const userProgressRef = ref(database, `users/${user.uid}/progress`);

  try {
    // Fetch existing progress to accumulate values correctly
    const snapshot = await get(userProgressRef);
    let existingData = {
      xp: 0,
      points: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      sessionsCompleted: 0
    };

    if (snapshot.exists()) {
      const data = snapshot.val();
      existingData.xp = Number(data.xp || 0);
      existingData.points = Number(data.points || 0);
      existingData.totalAnswered = Number(data.totalAnswered || 0);
      existingData.totalCorrect = Number(data.totalCorrect || 0);
      existingData.sessionsCompleted = Number(data.sessionsCompleted || 0);
    }

    const newXp = existingData.xp + sessionPoints;
    const newPoints = existingData.points + sessionPoints;
    const newTotalAnswered = existingData.totalAnswered + questionsAnswered;
    const newTotalCorrect = existingData.totalCorrect + correctAnswers;
    const newSessionsCompleted = existingData.sessionsCompleted + 1;

    // Save updated progress back to Firebase
    await set(userProgressRef, {
      xp: newXp,
      points: newPoints,
      totalAnswered: newTotalAnswered,
      totalCorrect: newTotalCorrect,
      sessionsCompleted: newSessionsCompleted,
      lastActive: new Date().toISOString()
    });

    // Save incorrect questions to Firebase mistakes bank
    if (incorrectQuestions.length > 0) {
      for (const q of incorrectQuestions) {
        const mistakeKey = `q_${q.id || Math.abs(hashCode(q.question))}`;
        const singleMistakeRef = ref(database, `users/${user.uid}/mistakes/${mistakeKey}`);
        
        await set(singleMistakeRef, {
          questionId: q.id || "unknown",
          questionText: q.question,
          subject: q.subject,
          topic: q.topic,
          correctAnswer: q.options[q.answerIndex],
          explanation: q.explanation || "",
          failedAt: new Date().toISOString()
        });
      }
    }

    console.log("Progress and mistakes successfully saved to Firebase!");
    return true;
  } catch (error) {
    console.error("Failed to save progress to Firebase:", error);
    return false;
  }
}

async function finishSession() {
  const results = document.getElementById("question-results");
  if (!results) return;

  const accuracy = questionsAnswered
    ? Math.round((correctAnswers / questionsAnswered) * 100)
    : 0;

  // Save session data and mistakes to Firebase if a user is logged in
  const saved = await saveProgressToFirebase();

  results.replaceChildren();

  results.appendChild(
    createElement("h2", "", "Practice session complete")
  );

  if (saved) {
    results.appendChild(createElement("p", "success-msg", "✓ Progress and mistakes saved to your account."));
  } else {
    results.appendChild(createElement("p", "warning-msg", "⚠ Session not saved (Guest mode or network issue)."));
  }

  results.appendChild(
    createElement("p", "", `Questions answered: ${questionsAnswered}`)
  );
  results.appendChild(
    createElement("p", "", `Correct answers: ${correctAnswers}`)
  );
  results.appendChild(
    createElement("p", "", `Accuracy: ${accuracy}%`)
  );
  results.appendChild(
    createElement("p", "", `Session points: ${sessionPoints}`)
  );

  let message = "
