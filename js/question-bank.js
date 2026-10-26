/*
 * Hysteria's Cure — Question Engine
 * Features:
 * - Seven-star difficulty selection
 * - Subject and topic search
 * - Random, progressive and challenge ordering
 * - Local and Firebase question bank integration
 * - Question display and answer checking
 * - XP, points, progress and mistakes tracking
 * - Session results and error handling
 */

import {
  selectPracticeSetAsync,
  selectPracticeSet
} from "./question-selector.js";

import { validateQuestionCatalogue } from "./question-catalogue.js";
import { auth, database } from "./firebase-client.js";

import {
  ref,
  get,
  runTransaction,
  set
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

// --------------------------------------------------
// PAGE ELEMENTS
// --------------------------------------------------

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

const starDescription = document.getElementById("star-description");
const mainContainer = document.querySelector("main.engine");

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const rewardPoints = {
  1: 2,
  2: 5,
  3: 10,
  4: 15,
  5: 20,
  6: 20,
  7: 20
};

const difficultyDescriptions = {
  1: "Foundation recall",
  2: "Understanding",
  3: "Application",
  4: "Analysis",
  5: "Multi-concept",
  6: "Advanced reasoning",
  7: "Mastery"
};

// --------------------------------------------------
// SESSION STATE
// --------------------------------------------------

let selectedDifficulty = 1;
let sessionPoints = 0;
let questionsAnswered = 0;
let correctAnswers = 0;

let currentQuestions = [];
let currentQuestionIndex = 0;

let answeredQuestions = new Set();
let incorrectQuestions = [];

let loadingQuestions = false;
let answeringQuestion = false;
let sessionFinished = false;

let questionArea;
let resultsArea;

// --------------------------------------------------
// GENERAL HELPERS
// --------------------------------------------------

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== "") {
    element.textContent = text;
  }

  return element;
}

function showMessage(message) {
  if (engineMessage) {
    engineMessage.textContent = message;
  }
}

function setButtonBusy(busy) {
  if (!findButton) return;

  findButton.disabled = busy;
  findButton.textContent = busy
    ? "Loading questions..."
    : "Find Questions";
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function hashCode(value) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return hash;
}

function getQuestionKey(question) {
  const original = String(
    question.id || question.question || "unknown"
  );

  const safe = original.replace(/[^a-zA-Z0-9_-]/g, "_");

  return safe || `question_${Math.abs(hashCode(original))}`;
}

// --------------------------------------------------
// STAR SELECTOR
// --------------------------------------------------

function selectDifficulty(level) {
  const difficulty = Number(level);

  if (
    !Number.isInteger(difficulty) ||
    difficulty < 1 ||
    difficulty > 7
  ) {
    return;
  }

  selectedDifficulty = difficulty;

  starSelector?.querySelectorAll("[data-level]").forEach(button => {
    const isSelected =
      Number(button.dataset.level) === selectedDifficulty;

    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  if (starDescription) {
    starDescription.textContent =
      `${difficulty} star${difficulty === 1 ? "" : "s"} — ` +
      difficultyDescriptions[difficulty];
  }
}

starSelector?.querySelectorAll("[data-level]").forEach(button => {
  button.addEventListener("click", () => {
    selectDifficulty(button.dataset.level);
  });
});

selectDifficulty(selectedDifficulty);

// --------------------------------------------------
// CATALOGUE STATUS
// --------------------------------------------------

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

updateCatalogueStatus();

// --------------------------------------------------
// LEARNING MATERIALS
// --------------------------------------------------

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
    "Files selected. Uploading and extracting document contents " +
    "are not implemented yet."
  );
});

// --------------------------------------------------
// CREATE THE QUESTION INTERFACE
// --------------------------------------------------

function createQuestionInterface() {
  if (!mainContainer) return;

  questionArea = document.getElementById("question-area");
  resultsArea = document.getElementById("question-results");

  if (!questionArea) {
    questionArea = createElement("section", "panel");
    questionArea.id = "question-area";
    questionArea.setAttribute("aria-live", "polite");

    const controlsPanel = findButton?.closest(".panel");

    if (controlsPanel) {
      controlsPanel.insertAdjacentElement("afterend", questionArea);
    } else {
      mainContainer.appendChild(questionArea);
    }
  }

  if (!resultsArea) {
    resultsArea = createElement("section", "panel");
    resultsArea.id = "question-results";
    resultsArea.setAttribute("aria-live", "polite");

    questionArea.insertAdjacentElement("afterend", resultsArea);
  }

  questionArea.hidden = true;
  resultsArea.hidden = true;
}

createQuestionInterface();

// --------------------------------------------------
// RESET A PRACTICE SESSION
// --------------------------------------------------

function resetSession() {
  sessionPoints = 0;
  questionsAnswered = 0;
  correctAnswers = 0;

  currentQuestionIndex = 0;

  answeredQuestions = new Set();
  incorrectQuestions = [];

  answeringQuestion = false;
  sessionFinished = false;

  if (questionArea) {
    questionArea.replaceChildren();
    questionArea.hidden = true;
  }

  if (resultsArea) {
    resultsArea.replaceChildren();
    resultsArea.hidden = true;
  }
}

// --------------------------------------------------
// LOAD QUESTIONS
// --------------------------------------------------

async function loadQuestions() {
  if (loadingQuestions) return;

  loadingQuestions = true;
  setButtonBusy(true);

  resetSession();

  try {
    const subject = subjectSearch?.value.trim() || "";
    const topic = topicSearch?.value.trim() || "";

    const count = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(questionCountSelect?.value || "10", 10) || 10
      )
    );

    const strategy = practiceStrategy?.value || "random";

    if (!["random", "progressive", "challenge"].includes(strategy)) {
      throw new Error("Please select a valid question order.");
    }

    showMessage("Finding questions for your selected difficulty...");

    const filters = {
      subject,
      topic,

      // Selecting one star level selects that level only.
      minDifficulty: selectedDifficulty,
      maxDifficulty: selectedDifficulty,

      count,
      strategy
    };

    let questions;
    let usingLocalOnly = false;

    try {
      questions = await selectPracticeSetAsync(filters);
    } catch (error) {
      console.error("Firebase question loading failed:", error);

      // Keep practice available when Firebase is unavailable.
      questions = selectPracticeSet(filters);
      usingLocalOnly = true;
    }

    currentQuestions = questions;

    if (!currentQuestions.length) {
      if (questionArea) {
        questionArea.replaceChildren();
        questionArea.hidden = true;
      }

      showMessage(
        "No questions matched your subject, topic and star level. " +
        "Try a different search or difficulty."
      );

      return;
    }

    if (questionArea) {
      questionArea.hidden = false;
    }

    if (resultsArea) {
      resultsArea.hidden = true;
      resultsArea.replaceChildren();
    }

    const sourceMessage = usingLocalOnly
      ? " Firebase was unavailable, so only local catalogue questions are being used."
      : "";

    showMessage(
      `${currentQuestions.length} question(s) found at ` +
      `${selectedDifficulty}★ — ${difficultyDescriptions[selectedDifficulty]}.` +
      sourceMessage
    );

    renderCurrentQuestion();

    questionArea?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    console.error("Question engine error:", error);

    showMessage(
      error.message || "Something went wrong while loading questions."
    );
  } finally {
    loadingQuestions = false;
    setButtonBusy(false);
  }
}

findButton?.addEventListener("click", loadQuestions);

// --------------------------------------------------
// DISPLAY A QUESTION
// --------------------------------------------------

function renderCurrentQuestion() {
  if (!questionArea) return;

  if (currentQuestionIndex >= currentQuestions.length) {
    finishSession();
    return;
  }

  answeringQuestion = false;

  const question = currentQuestions[currentQuestionIndex];

  questionArea.replaceChildren();

  const header = createElement("div", "question-header");

  header.appendChild(
    createElement(
      "p",
      "hint",
      `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`
    )
  );

  header.appendChild(
    createElement(
      "p",
      "hint",
      `${question.subject} · ${question.topic} · ${question.difficulty}★`
    )
  );

  header.appendChild(
    createElement(
      "p",
      "hint",
      `Points available: ${rewardPoints[question.difficulty] ?? 2}`
    )
  );

  questionArea.appendChild(header);

  questionArea.appendChild(
    createElement("h2", "question-text", question.question)
  );

  const optionsContainer = createElement("div", "question-options");
  optionsContainer.id = "question-options";

  question.options.forEach((option, index) => {
    const button = createElement(
      "button",
      "answer-option",
      `${String.fromCharCode(65 + index)}. ${option}`
    );

    button.type = "button";
    button.dataset.optionIndex = String(index);

    button.addEventListener("click", () => {
      checkAnswer(index);
    });

    optionsContainer.appendChild(button);
  });

  questionArea.appendChild(optionsContainer);

  const feedback = createElement("div", "answer-feedback");
  feedback.id = "answer-feedback";
  feedback.setAttribute("aria-live", "polite");

  questionArea.appendChild(feedback);

  const nextButton = createElement(
    "button",
    "next-question",
    "Next Question"
  );

  nextButton.type = "button";
  nextButton.id = "next-question";
  nextButton.hidden = true;

  nextButton.addEventListener("click", () => {
    if (!answeringQuestion) return;

    currentQuestionIndex++;
    renderCurrentQuestion();

    questionArea.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  questionArea.appendChild(nextButton);

  const finishButton = createElement(
    "button",
    "finish-practice",
    "Finish Session"
  );

  finishButton.type = "button";
  finishButton.addEventListener("click", () => {
    finishSession();
  });

  questionArea.appendChild(finishButton);
}

// --------------------------------------------------
// CHECK AN ANSWER
// --------------------------------------------------

function checkAnswer(selectedIndex) {
  if (answeringQuestion || sessionFinished) return;

  const question = currentQuestions[currentQuestionIndex];

  if (!question) return;

  answeringQuestion = true;

  const optionButtons = questionArea.querySelectorAll(
    "[data-option-index]"
  );

  optionButtons.forEach(button => {
    button.disabled = true;
  });

  const isCorrect = selectedIndex === question.answerIndex;

  questionsAnswered++;

  const questionKey = String(
    question.id || `${currentQuestionIndex}_${question.question}`
  );

  answeredQuestions.add(questionKey);

  const feedback = document.getElementById("answer-feedback");

  if (isCorrect) {
    correctAnswers++;

    const earnedPoints = rewardPoints[question.difficulty] ?? 2;

    sessionPoints += earnedPoints;

    if (feedback) {
      feedback.appendChild(
        createElement(
          "p",
          "success-msg",
          `Correct! You earned ${earnedPoints} points.`
        )
      );
    }

    optionButtons.forEach(button => {
      if (
        Number(button.dataset.optionIndex) === question.answerIndex
      ) {
        button.classList.add("correct-answer");
      }
    });
  } else {
    // A wrong answer costs two points, but the session total
    // cannot fall below zero.
    sessionPoints = Math.max(0, sessionPoints - 2);

    if (feedback) {
      feedback.appendChild(
        createElement(
          "p",
          "warning-msg",
          "Not quite. Two points have been deducted where available."
        )
      );

      feedback.appendChild(
        createElement(
          "p",
          "",
          `Correct answer: ${question.options[question.answerIndex]}`
        )
      );
    }

    optionButtons.forEach(button => {
      const optionIndex = Number(button.dataset.optionIndex);

      if (optionIndex === question.answerIndex) {
        button.classList.add("correct-answer");
      }

      if (optionIndex === selectedIndex) {
        button.classList.add("incorrect-answer");
      }
    });

    incorrectQuestions.push({
      ...question,
      selectedAnswerIndex: selectedIndex
    });
  }

  if (question.explanation && feedback) {
    feedback.appendChild(
      createElement(
        "p",
        "question-explanation",
        `Explanation: ${question.explanation}`
      )
    );
  }

  if (feedback) {
    feedback.appendChild(
      createElement(
        "p",
        "hint",
        `Current session points: ${sessionPoints}`
      )
    );
  }

  const nextButton = document.getElementById("next-question");

  if (nextButton) {
    nextButton.hidden = false;

    nextButton.textContent =
      currentQuestionIndex === currentQuestions.length - 1
        ? "View Results"
        : "Next Question";
  }

  const finishButton = questionArea.querySelector(".finish-practice");

  if (finishButton) {
    finishButton.hidden = true;
  }
}

// --------------------------------------------------
// SAVE PROGRESS TO FIREBASE
// --------------------------------------------------

async function saveProgressToFirebase() {
  const user = auth.currentUser;

  if (!user) {
    console.warn("No user logged in. Progress was not saved.");
    return false;
  }

  if (questionsAnswered === 0) {
    return false;
  }

  try {
    const progressRef = ref(
      database,
      `users/${user.uid}/progress`
    );

    // A transaction helps avoid overwriting progress if another
    // update happens at the same time.
    const transactionResult = await runTransaction(
      progressRef,
      currentData => {
        const data = currentData || {};

        const previousXp = Number(data.xp) || 0;
        const previousPoints = Number(data.points) || 0;
        const previousAnswered = Number(data.totalAnswered) || 0;
        const previousCorrect = Number(data.totalCorrect) || 0;
        const previousSessions = Number(data.sessionsCompleted) || 0;

        return {
          ...data,

          xp: previousXp + sessionPoints,
          points: Math.max(0, previousPoints + sessionPoints),

          totalAnswered: previousAnswered + questionsAnswered,
          totalCorrect: previousCorrect + correctAnswers,

          sessionsCompleted: previousSessions + 1,

          lastActive: new Date().toISOString()
        };
      },
      {
        applyLocally: false
      }
    );

    if (!transactionResult.committed) {
      throw new Error("Progress could not be committed.");
    }

    // Save the incorrect answers for later review.
    for (const question of incorrectQuestions) {
      const mistakeKey = getQuestionKey(question);

      const mistakeRef = ref(
        database,
        `users/${user.uid}/mistakes/${mistakeKey}`
      );

      await set(mistakeRef, {
        questionId: String(question.id || "unknown"),
        questionText: String(question.question || ""),
        subject: String(question.subject || ""),
        topic: String(question.topic || ""),

        options: Array.isArray(question.options)
          ? question.options
          : [],

        selectedAnswerIndex: Number(question.selectedAnswerIndex),
        correctAnswerIndex: Number(question.answerIndex),

        correctAnswer: String(
          question.options?.[question.answerIndex] || ""
        ),

        explanation: String(question.explanation || ""),
        difficulty: Number(question.difficulty) || 1,

        failedAt: new Date().toISOString()
      });
    }

    console.log("Progress and mistakes saved successfully.");

    return true;
  } catch (error) {
    console.error("Failed to save progress to Firebase:", error);

    return false;
  }
}

// --------------------------------------------------
// FINISH THE SESSION
// --------------------------------------------------

async function finishSession() {
  if (sessionFinished) return;

  sessionFinished = true;

  if (questionArea) {
    questionArea.querySelectorAll("button").forEach(button => {
      button.disabled = true;
    });
  }

  const accuracy = questionsAnswered
    ? Math.round((correctAnswers / questionsAnswered) * 100)
    : 0;

  let saved = false;

  if (questionsAnswered > 0) {
    showMessage("Saving your progress...");

    saved = await saveProgressToFirebase();
  }

  if (!resultsArea) {
    createQuestionInterface();
  }

  if (!resultsArea) {
    showMessage("Session finished, but the results panel is unavailable.");
    return;
  }

  resultsArea.replaceChildren();
  resultsArea.hidden = false;

  resultsArea.appendChild(
    createElement("h2", "", "Practice Session Complete")
  );

  if (questionsAnswered === 0) {
    resultsArea.appendChild(
      createElement(
        "p",
        "",
        "You haven't answered any questions in this session."
      )
    );
  } else {
    resultsArea.appendChild(
      createElement(
        "p",
        "",
        `Questions answered: ${questionsAnswered}`
      )
    );

    resultsArea.appendChild(
      createElement(
        "p",
        "",
        `Correct answers: ${correctAnswers}`
      )
    );

    resultsArea.appendChild(
      createElement(
        "p",
        "",
        `Incorrect answers: ${questionsAnswered - correctAnswers}`
      )
    );

    resultsArea.appendChild(
      createElement(
        "p",
        "",
        `Accuracy: ${accuracy}%`
      )
    );

    resultsArea.appendChild(
      createElement(
        "p",
        "",
        `Session points: ${sessionPoints}`
      )
    );

    resultsArea.appendChild(
      createElement(
        saved ? "p" : "p",
        saved ? "success-msg" : "warning-msg",
        saved
          ? "Your progress and mistakes have been saved."
          : auth.currentUser
            ? "Your results are displayed, but saving failed. Check your connection and Firebase permissions."
            : "Guest session: your results are displayed, but were not saved to an account."
      )
    );
  }

  resultsArea.appendChild(
    createElement(
      "p",
      "",
      accuracy >= 80 && questionsAnswered > 0
        ? "Excellent work. Keep building on what you've learned."
        : accuracy >= 50
          ? "Good effort. Review the explanations and keep practising."
          : questionsAnswered > 0
            ? "Use the explanations to strengthen your understanding before trying again."
            : "Choose your subject and difficulty to begin practising."
    )
  );

  const restartButton = createElement(
    "button",
    "",
    "Practise Again"
  );

  restartButton.type = "button";

  restartButton.addEventListener("click", () => {
    resetSession();
    showMessage("Choose your settings, then find questions.");
    mainContainer?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  resultsArea.appendChild(restartButton);

  resultsArea.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  showMessage("Practice session completed.");
}

// --------------------------------------------------
// INITIAL STATE
// --------------------------------------------------

showMessage("Choose a subject, topic and star level to begin.");

if (starSelector) {
  starSelector.querySelectorAll("[data-level]").forEach(button => {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.level) === selectedDifficulty)
    );
  });
}
