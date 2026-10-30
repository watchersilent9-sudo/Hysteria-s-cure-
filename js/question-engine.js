/*
 * Hysteria's Cure — Practice Question Engine
 * Local-first question loading, seven-star selection,
 * scoring, explanations, mistake tracking and progress saving.
 */

import { selectPracticeSetAsync } from "./question-selector.js";
import { validateQuestionCatalogue } from "./question-catalogue.js";
import { auth, database } from "./firebase-client.js";
import {
  ref,
  get,
  set,
  runTransaction
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const $ = id => document.getElementById(id);

const subjectSearch = $("subject-search");
const topicSearch = $("topic-search");
const starSelector = $("star-selector");
const starDescription = $("star-description");
const materialsInput = $("materials");
const fileList = $("file-list");
const questionCountSelect = $("question-count");
const practiceStrategy = $("practice-strategy");
const findButton = $("find-questions");
const engineMessage = $("engine-message");
const catalogueStatus = $("catalogue-status");
const mainContainer = document.querySelector("main.engine");

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

const validFactions = [
  "readers",
  "gamers",
  "movie-lovers",
  "independent"
];

const factionExperience = {
  readers: {
    name: "Readers",
    introduction:
      "Look beyond the answer. Examine the reasoning and discover what the concept reveals.",
    correct:
      "Correct! Think about the principle behind your answer.",
    incorrect:
      "Not quite. Re-examine the explanation and identify the concept you missed."
  },

  gamers: {
    name: "Gamers",
    introduction:
      "Choose normal practice or challenge a simulated bot in a timed duel.",
    correct:
      "Correct! Points added to your score.",
    incorrect:
      "Incorrect. Review the answer and learn from the mistake."
  },

  "movie-lovers": {
    name: "Movie Lovers",
    introduction:
      "Examine the clues, connect the details, and work out why the answer makes sense.",
    correct:
      "Correct! You found the right answer.",
    incorrect:
      "That wasn't the right answer. Re-examine the clues and explanation."
  },

  independent: {
    name: "Independent",
    introduction:
      "Your practice, your approach. Build your understanding one question at a time.",
    correct:
      "Correct! Keep building your understanding.",
    incorrect:
      "Not quite. Review the explanation and try applying the concept again."
  }
};

let selectedDifficulty = 1;
let currentFaction = "independent";
let currentQuestions = [];
let currentQuestionIndex = 0;

let sessionPointsEarned = 0;
let sessionPointPenalties = 0;
let sessionXP = 0;

let questionsAnswered = 0;
let correctAnswers = 0;
let incorrectQuestions = [];

let loadingQuestions = false;
let answeringQuestion = false;
let sessionFinished = false;
let savingSession = false;

let questionArea = null;
let resultsArea = null;

function getSessionPointsChange() {
  return sessionPointsEarned - sessionPointPenalties;
}

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

function withTimeout(promise, ms, message) {
  let timeoutId;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(message)),
        ms
      );
    })
  ]).finally(() => clearTimeout(timeoutId));
}

function updateCatalogueStatus() {
  if (!catalogueStatus) return;

  try {
    const result = validateQuestionCatalogue();

    catalogueStatus.textContent = result.valid
      ? `Local catalogue ready: ${result.totalQuestions} questions, ${result.uniqueIds} unique IDs.`
      : `Local catalogue has ${result.errors.length} issue(s): ${result.errors.slice(0, 3).join(" ")}`;
  } catch (error) {
    console.error("Catalogue validation failed:", error);

    catalogueStatus.textContent =
      "Local catalogue status could not be checked.";
  }
}

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
    const selected = Number(button.dataset.level) === difficulty;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  if (starDescription) {
    starDescription.textContent =
      `${difficulty} star${difficulty === 1 ? "" : "s"} — ${difficultyDescriptions[difficulty]}`;
  }
}

starSelector?.addEventListener("click", event => {
  const button = event.target.closest("[data-level]");

  if (button && starSelector.contains(button)) {
    selectDifficulty(button.dataset.level);
  }
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

  for (const file of files) {
    fileList.appendChild(
      createElement(
        "p",
        "",
        `${file.name} — ${(file.size / 1024).toFixed(1)} KB`
      )
    );
  }

  showMessage(
    "Files are listed only. Uploading and extracting document contents are not implemented yet."
  );
});

function createQuestionInterface() {
  if (!mainContainer) return;

  questionArea = $("question-area");
  resultsArea = $("question-results");

  if (!questionArea) {
    questionArea = createElement("section", "panel");
    questionArea.id = "question-area";
    questionArea.setAttribute("aria-live", "polite");

    const controlsPanel = findButton?.closest(".panel");

    if (controlsPanel) {
      controlsPanel.insertAdjacentElement(
        "afterend",
        questionArea
      );
    } else {
      mainContainer.appendChild(questionArea);
    }
  }

  if (!resultsArea) {
    resultsArea = createElement("section", "panel");
    resultsArea.id = "question-results";
    resultsArea.setAttribute("aria-live", "polite");

    questionArea.insertAdjacentElement(
      "afterend",
      resultsArea
    );
  }

  questionArea.hidden = true;
  resultsArea.hidden = true;
}

function resetSession() {
  currentQuestions = [];
  currentQuestionIndex = 0;

  sessionPointsEarned = 0;
  sessionPointPenalties = 0;
  sessionXP = 0;

  questionsAnswered = 0;
  correctAnswers = 0;
  incorrectQuestions = [];

  answeringQuestion = false;
  sessionFinished = false;
  savingSession = false;

  if (questionArea) {
    questionArea.replaceChildren();
    questionArea.hidden = true;
  }

  if (resultsArea) {
    resultsArea.replaceChildren();
    resultsArea.hidden = true;
  }
}

async function loadUserFaction() {
  const user = auth.currentUser;

  if (!user) {
    currentFaction = "independent";
    return currentFaction;
  }

  try {
    const snapshot = await withTimeout(
      get(ref(database, `users/${user.uid}/faction`)),
      2500,
      "Faction lookup timed out."
    );

    const faction = snapshot.val();

    currentFaction = validFactions.includes(faction)
      ? faction
      : "independent";
  } catch (error) {
    console.warn(
      "Using Independent experience because faction lookup failed:",
      error
    );

    currentFaction = "independent";
  }

  return currentFaction;
}

async function loadQuestions() {
  if (loadingQuestions) return;

  loadingQuestions = true;
  setButtonBusy(true);

  try {
    createQuestionInterface();
    resetSession();

    const subject = subjectSearch?.value.trim() || "";
    const topic = topicSearch?.value.trim() || "";

    const count = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(
          questionCountSelect?.value || "10",
          10
        ) || 10
      )
    );

    const strategy = practiceStrategy?.value || "random";

    if (
      !["random", "progressive", "challenge"].includes(strategy)
    ) {
      throw new Error("Please select a valid question order.");
    }

    const factionPromise = loadUserFaction();

    const filters = {
      subject,
      topic,
      minDifficulty: selectedDifficulty,
      maxDifficulty: selectedDifficulty,
      count,
      strategy
    };

    showMessage(
      "Finding questions in the local catalogue and shared question bank..."
    );

    const questions = await withTimeout(
      selectPracticeSetAsync(filters),
      9000,
      "Question loading took too long. Please try again."
    );

    currentQuestions = Array.isArray(questions)
      ? questions.filter(isUsableQuestion)
      : [];

    await Promise.race([
      factionPromise,
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);

    window.dispatchEvent(
      new CustomEvent("hc:faction-loaded", {
        detail: { faction: currentFaction }
      })
    );

    if (!currentQuestions.length) {
      showMessage(
        "No usable questions matched your subject, topic and star level. Try another search or difficulty."
      );

      return;
    }

    const gameMode = $("game-mode")?.value || "practice";

    if (
      currentFaction === "gamers" &&
      gameMode !== "practice"
    ) {
      if (gameMode !== "quick-duel") {
        showMessage(
          `${gameMode === "survival" ? "Survival" : "Ranked Challenge"} is not implemented yet. Choose Quick Duel or Normal Practice.`
        );

        return;
      }

      window.dispatchEvent(
        new CustomEvent("hc:questions-loaded", {
          detail: {
            questions: currentQuestions,
            faction: currentFaction,
            mode: gameMode
          }
        })
      );

      showMessage("Quick Duel started!");
      return;
    }

    if (questionArea) {
      questionArea.hidden = false;
    }

    if (resultsArea) {
      resultsArea.hidden = true;
      resultsArea.replaceChildren();
    }

    const experience =
      factionExperience[currentFaction] ||
      factionExperience.independent;

    showMessage(
      `${experience.name}: ${currentQuestions.length} question(s) found at ${selectedDifficulty}★ — ${difficultyDescriptions[selectedDifficulty]}.`
    );

    renderCurrentQuestion();

    questionArea?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    console.error("Question engine error:", error);

    showMessage(
      error.message ||
      "Something went wrong while loading questions."
    );
  } finally {
    loadingQuestions = false;
    setButtonBusy(false);
  }
}

function isUsableQuestion(question) {
  if (!question || typeof question !== "object") {
    return false;
  }

  if (
    typeof question.question !== "string" ||
    !question.question.trim()
  ) {
    return false;
  }

  if (
    !Array.isArray(question.options) ||
    question.options.length < 2
  ) {
    return false;
  }

  if (
    !Number.isInteger(question.answerIndex) ||
    question.answerIndex < 0 ||
    question.answerIndex >= question.options.length
  ) {
    return false;
  }

  const difficulty = Number(question.difficulty);

  return (
    Number.isInteger(difficulty) &&
    difficulty >= 1 &&
    difficulty <= 7 &&
    question.options.every(option => typeof option === "string")
  );
}

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
      `${question.subject || "General"} · ${question.topic || "General"} · ${question.difficulty}★`
    )
  );

  header.appendChild(
    createElement(
      "p",
      "hint",
      `Points available: ${rewardPoints[question.difficulty]}`
    )
  );

  questionArea.appendChild(header);

  questionArea.appendChild(
    createElement("h2", "question-text", question.question)
  );

  const optionsContainer = createElement(
    "div",
    "question-options"
  );

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
    if (!answeringQuestion || sessionFinished) return;

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
  finishButton.addEventListener("click", finishSession);

  questionArea.appendChild(finishButton);
}

function checkAnswer(selectedIndex) {
  if (answeringQuestion || sessionFinished) return;

  const question = currentQuestions[currentQuestionIndex];

  if (!question) return;

  answeringQuestion = true;

  const optionButtons =
    questionArea.querySelectorAll("[data-option-index]");

  optionButtons.forEach(button => {
    button.disabled = true;
  });

  const isCorrect = selectedIndex === question.answerIndex;

  questionsAnswered++;

  const experience =
    factionExperience[currentFaction] ||
    factionExperience.independent;

  const feedback = $("answer-feedback");

  if (isCorrect) {
    correctAnswers++;

    const earnedPoints =
      rewardPoints[question.difficulty] ?? 2;

    sessionPointsEarned += earnedPoints;
    sessionXP += earnedPoints;

    feedback?.appendChild(
      createElement(
        "p",
        "success-msg",
        `${experience.correct} You earned ${earnedPoints} points and ${earnedPoints} XP.`
      )
    );

    optionButtons.forEach(button => {
      if (
        Number(button.dataset.optionIndex) ===
        question.answerIndex
      ) {
        button.classList.add("correct-answer");
      }
    });
  } else {
    sessionPointPenalties += 2;

    feedback?.appendChild(
      createElement(
        "p",
        "warning-msg",
        `${experience.incorrect} A 2-point penalty has been recorded.`
      )
    );

    feedback?.appendChild(
      createElement(
        "p",
        "",
        `Correct answer: ${question.options[question.answerIndex]}`
      )
    );

    optionButtons.forEach(button => {
      const index = Number(button.dataset.optionIndex);

      if (index === question.answerIndex) {
        button.classList.add("correct-answer");
      }

      if (index === selectedIndex) {
        button.classList.add("incorrect-answer");
      }
    });

    incorrectQuestions.push({
      ...question,
      selectedAnswerIndex: selectedIndex
    });
  }

  if (question.explanation) {
    feedback?.appendChild(
      createElement(
        "p",
        "question-explanation",
        `Explanation: ${question.explanation}`
      )
    );
  }

  feedback?.appendChild(
    createElement(
      "p",
      "hint",
      `Session points change: ${getSessionPointsChange()}`
    )
  );

  feedback?.appendChild(
    createElement(
      "p",
      "hint",
      `Session XP earned: ${sessionXP}`
    )
  );

  const nextButton = $("next-question");

  if (nextButton) {
    nextButton.hidden = false;

    nextButton.textContent =
      currentQuestionIndex === currentQuestions.length - 1
        ? "View Results"
        : "Next Question";
  }

  const finishButton =
    questionArea.querySelector(".finish-practice");

  if (finishButton) {
    finishButton.hidden = true;
  }
}

function safeKey(question) {
  const source = String(
    question.id || question.question || "question"
  );

  return (
    source.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) ||
    "question"
  );
}

async function saveProgressToFirebase() {
  const user = auth.currentUser;

  if (!user || questionsAnswered === 0) {
    return {
      progressSaved: false,
      mistakesSaved: false
    };
  }

  try {
    const progressRef = ref(
      database,
      `users/${user.uid}/progress`
    );

    const transactionResult = await runTransaction(
      progressRef,
      currentData => {
        const data = currentData || {};

        const currentPoints = Math.max(
          0,
          Number(data.points) || 0
        );

        return {
          ...data,

          xp: Math.max(
            0,
            (Number(data.xp) || 0) + sessionXP
          ),

          points: Math.max(
            0,
            currentPoints + getSessionPointsChange()
          ),

          totalAnswered:
            (Number(data.totalAnswered) || 0) +
            questionsAnswered,

          totalCorrect:
            (Number(data.totalCorrect) || 0) +
            correctAnswers,

          sessionsCompleted:
            (Number(data.sessionsCompleted) || 0) + 1,

          lastActive: new Date().toISOString()
        };
      },
      { applyLocally: false }
    );

    if (!transactionResult.committed) {
      throw new Error("Progress could not be committed.");
    }

    let mistakesSaved = true;

    for (const question of incorrectQuestions) {
      try {
        await set(
          ref(
            database,
            `users/${user.uid}/mistakes/${safeKey(question)}`
          ),
          {
            questionId: String(question.id || "unknown"),
            questionText: String(question.question || ""),
            subject: String(question.subject || ""),
            topic: String(question.topic || ""),
            options: Array.isArray(question.options)
              ? question.options
              : [],
            selectedAnswerIndex: Number(
              question.selectedAnswerIndex
            ),
            correctAnswerIndex: Number(
              question.answerIndex
            ),
            correctAnswer: String(
              question.options?.[question.answerIndex] || ""
            ),
            explanation: String(question.explanation || ""),
            difficulty: Number(question.difficulty) || 1,
            failedAt: new Date().toISOString()
          }
        );
      } catch (error) {
        mistakesSaved = false;

        console.error(
          "Progress was saved, but a mistake record failed:",
          error
        );
      }
    }

    return {
      progressSaved: true,
      mistakesSaved
    };
  } catch (error) {
    console.error("Failed to save progress:", error);

    return {
      progressSaved: false,
      mistakesSaved: false,
      error
    };
  }
}

async function finishSession() {
  if (sessionFinished || savingSession) return;

  sessionFinished = true;
  savingSession = true;

  const accuracy = questionsAnswered
    ? Math.round((correctAnswers / questionsAnswered) * 100)
    : 0;

  if (questionArea) {
    questionArea.querySelectorAll("button").forEach(button => {
      button.disabled = true;
    });
  }

  let saveResult = {
    progressSaved: false,
    mistakesSaved: false
  };

  if (questionsAnswered > 0 && auth.currentUser) {
    showMessage("Saving your progress...");
    saveResult = await saveProgressToFirebase();
  }

  if (!resultsArea) {
    createQuestionInterface();
  }

  if (!resultsArea) {
    showMessage(
      "Session finished, but the results panel is unavailable."
    );

    savingSession = false;
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
    const resultRows = [
      ["Questions answered", questionsAnswered],
      ["Correct answers", correctAnswers],
      ["Incorrect answers", questionsAnswered - correctAnswers],
      ["Accuracy", `${accuracy}%`],
      ["Session XP earned", sessionXP],
      ["Points earned", sessionPointsEarned],
      ["Points penalties", sessionPointPenalties],
      ["Net session points change", getSessionPointsChange()]
    ];

    for (const [label, value] of resultRows) {
      resultsArea.appendChild(
        createElement("p", "", `${label}: ${value}`)
      );
    }

    let saveMessage;
    let saveClass;

    if (!auth.currentUser) {
      saveMessage =
        "Guest session: your results are displayed, but were not saved to an account.";

      saveClass = "warning-msg";
    } else if (!saveResult.progressSaved) {
      saveMessage =
        "Your results are displayed, but progress could not be confirmed as saved. Check your connection and Firebase permissions.";

      saveClass = "warning-msg";
    } else if (!saveResult.mistakesSaved) {
      saveMessage =
        "Your progress was saved, but one or more mistake records could not be saved.";

      saveClass = "warning-msg";
    } else {
      saveMessage =
        "Your progress and mistakes have been saved.";

      saveClass = "success-msg";
    }

    resultsArea.appendChild(
      createElement("p", saveClass, saveMessage)
    );
  }

  const encouragement = accuracy >= 80 && questionsAnswered > 0
    ? "Excellent work. Keep building on what you've learned."
    : accuracy >= 50
      ? "Good effort. Review the explanations and keep practising."
      : questionsAnswered > 0
        ? "Use the explanations to strengthen your understanding before trying again."
        : "Choose your subject and difficulty to begin practising.";

  resultsArea.appendChild(
    createElement("p", "", encouragement)
  );

  const restartButton = createElement(
    "button",
    "",
    "Practise Again"
  );

  restartButton.type = "button";

  restartButton.addEventListener("click", () => {
    if (savingSession) return;

    resetSession();

    showMessage(
      "Choose your settings, then find questions."
    );

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
  savingSession = false;
}

createQuestionInterface();
updateCatalogueStatus();

showMessage(
  "Choose a subject, topic and star level to begin."
);

findButton?.addEventListener("click", loadQuestions);

loadUserFaction()
  .then(faction => {
    window.dispatchEvent(
      new CustomEvent("hc:faction-loaded", {
        detail: { faction }
      })
    );
  })
  .catch(error => {
    console.warn(
      "Faction initialization failed:",
      error
    );
  });
