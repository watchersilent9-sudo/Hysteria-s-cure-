/*
 * Hysteria's Cure — Gamer Modes
 * Quick Duel: student versus simulated bot.
 * Survival and Ranked Challenge will be implemented separately.
 */

const modeSelect = document.getElementById("game-mode");
const modeDescription = document.getElementById("game-mode-description");
const modePanel = document.getElementById("gamer-modes");

const duelArea = document.getElementById("duel-area");
const duelTitle = document.getElementById("duel-title");
const duelPlayerScore = document.getElementById("duel-player-score");
const duelBotScore = document.getElementById("duel-bot-score");
const duelProgress = document.getElementById("duel-progress");
const duelTimer = document.getElementById("duel-timer");
const duelQuestion = document.getElementById("duel-question");
const duelOptions = document.getElementById("duel-options");
const duelFeedback = document.getElementById("duel-feedback");
const duelNext = document.getElementById("duel-next");
const duelExit = document.getElementById("duel-exit");

const MODE_DESCRIPTIONS = {
  practice: "Practise at your own pace.",
  "quick-duel": "Race against a simulated bot. You have five seconds per question.",
  survival: "Answer each question before time runs out. One mistake ends the challenge.",
  ranked: "Challenge an adaptive bot. Your speed and accuracy determine your performance."
};

const POINTS = {
  1: 2,
  2: 5,
  3: 10,
  4: 15,
  5: 20,
  6: 20,
  7: 20
};

let duelQuestions = [];
let duelIndex = 0;
let playerScore = 0;
let botScore = 0;

let roundTimer = null;
let botTimer = null;
let transitionTimer = null;

let playerAnswered = false;
let botAnswered = false;
let playerRoundCorrect = false;
let botRoundCorrect = false;

let duelRunning = false;
let roundEnded = false;
let roundDeadline = 0;
let currentFaction = "independent";

function clearDuelTimers() {
  clearInterval(roundTimer);
  clearTimeout(botTimer);
  clearTimeout(transitionTimer);

  roundTimer = null;
  botTimer = null;
  transitionTimer = null;
}

function updateModeDescription() {
  if (!modeSelect || !modeDescription) return;

  modeDescription.textContent =
    MODE_DESCRIPTIONS[modeSelect.value] ||
    MODE_DESCRIPTIONS.practice;
}

modeSelect?.addEventListener("change", updateModeDescription);
updateModeDescription();

function hideNormalQuestionInterface() {
  const normalQuestionArea = document.getElementById("question-area");
  const normalResults = document.getElementById("question-results");

  if (normalQuestionArea) normalQuestionArea.hidden = true;
  if (normalResults) normalResults.hidden = true;
}

function showDuel() {
  hideNormalQuestionInterface();

  if (duelArea) {
    duelArea.hidden = false;
    duelArea.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function hideDuel() {
  if (duelArea) duelArea.hidden = true;
}

function startQuickDuel(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    alert("No questions are available for this duel.");
    return;
  }

  clearDuelTimers();

  duelQuestions = questions;
  duelIndex = 0;
  playerScore = 0;
  botScore = 0;
  duelRunning = true;

  if (duelTitle) duelTitle.textContent = "Quick Duel";

  if (duelPlayerScore) duelPlayerScore.textContent = "0";
  if (duelBotScore) duelBotScore.textContent = "0";

  if (duelNext) duelNext.hidden = true;

  showDuel();
  startRound();
}

function startRound() {
  clearDuelTimers();

  if (!duelRunning) return;

  if (duelIndex >= duelQuestions.length) {
    finishDuel();
    return;
  }

  const question = duelQuestions[duelIndex];

  playerAnswered = false;
  botAnswered = false;
  playerRoundCorrect = false;
  botRoundCorrect = false;
  roundEnded = false;

  if (duelProgress) {
    duelProgress.textContent =
      `Question ${duelIndex + 1} of ${duelQuestions.length}`;
  }

  if (duelPlayerScore) {
    duelPlayerScore.textContent = String(playerScore);
  }

  if (duelBotScore) {
    duelBotScore.textContent = String(botScore);
  }

  if (duelQuestion) {
    duelQuestion.textContent = question.question;
  }

  if (duelFeedback) duelFeedback.textContent = "";

  if (duelNext) duelNext.hidden = true;

  if (duelOptions) {
    duelOptions.replaceChildren();

    question.options.forEach((option, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "duel-option";
      button.textContent =
        `${String.fromCharCode(65 + index)}. ${option}`;

      button.addEventListener("click", () => {
        submitPlayerAnswer(index);
      });

      duelOptions.appendChild(button);
    });
  }

  roundDeadline = Date.now() + 5000;

  updateTimer();

  roundTimer = setInterval(() => {
    updateTimer();

    if (Date.now() >= roundDeadline) {
      handleTimeout();
    }
  }, 100);

  // The bot responds after a simulated thinking delay.
  const botDelay = 1000 + Math.random() * 3000;

  botTimer = setTimeout(() => {
    submitBotAnswer(question);
  }, botDelay);
}

function updateTimer() {
  if (!duelTimer || roundEnded) return;

  const remaining = Math.max(
    0,
    (roundDeadline - Date.now()) / 1000
  );

  duelTimer.textContent = remaining.toFixed(1);
}

function getPoints(question) {
  return POINTS[Number(question.difficulty)] || 2;
}

function submitPlayerAnswer(selectedIndex) {
  if (!duelRunning || roundEnded || playerAnswered) return;

  if (Date.now() >= roundDeadline) {
    handleTimeout();
    return;
  }

  playerAnswered = true;

  const question = duelQuestions[duelIndex];

  playerRoundCorrect = selectedIndex === question.answerIndex;

  if (playerRoundCorrect) {
    playerScore += getPoints(question);
  } else {
    playerScore = Math.max(0, playerScore - 2);
  }

  const buttons = duelOptions?.querySelectorAll("button") || [];

  buttons.forEach((button, index) => {
    button.disabled = true;

    if (index === question.answerIndex) {
      button.classList.add("correct-answer");
    }

    if (index === selectedIndex && !playerRoundCorrect) {
      button.classList.add("incorrect-answer");
    }
  });

  if (duelFeedback) {
    duelFeedback.textContent = playerRoundCorrect
      ? `Correct! +${getPoints(question)} points.`
      : `Incorrect. −2 points where available. Correct answer: ${
          question.options[question.answerIndex]
        }`;
  }

  if (duelPlayerScore) {
    duelPlayerScore.textContent = String(playerScore);
  }

  resolveRoundIfReady();
}

function submitBotAnswer(question) {
  if (!duelRunning || roundEnded || botAnswered) return;

  botAnswered = true;

  // The bot's chance of answering correctly varies with difficulty.
  const difficulty = Number(question.difficulty) || 1;

  const accuracy = Math.max(
    0.35,
    Math.min(0.85, 0.85 - (difficulty - 1) * 0.07)
  );

  botRoundCorrect = Math.random() < accuracy;

  if (botRoundCorrect) {
    botScore += getPoints(question);
  }

  if (duelBotScore) {
    duelBotScore.textContent = String(botScore);
  }

  resolveRoundIfReady();
}

function handleTimeout() {
  if (!duelRunning || roundEnded) return;

  clearInterval(roundTimer);
  roundTimer = null;

  if (!playerAnswered) {
    playerAnswered = true;
    playerRoundCorrect = false;

    const buttons = duelOptions?.querySelectorAll("button") || [];

    buttons.forEach(button => {
      button.disabled = true;
    });

    if (duelFeedback) {
      duelFeedback.textContent =
        "Time's up! You didn't answer in time.";
    }
  }

  if (!botAnswered) {
    clearTimeout(botTimer);
    botTimer = null;

    submitBotAnswer(duelQuestions[duelIndex]);
  }

  resolveRoundIfReady();
}

function resolveRoundIfReady() {
  if (!duelRunning || roundEnded) return;

  if (!playerAnswered || !botAnswered) return;

  roundEnded = true;
  clearDuelTimers();

  if (duelTimer) duelTimer.textContent = "Done";

  if (duelFeedback) {
    const outcome = playerRoundCorrect && botRoundCorrect
      ? "Both answered correctly."
      : playerRoundCorrect
        ? "You won this round!"
        : botRoundCorrect
          ? "The bot won this round."
          : "Neither scored on this question.";

    duelFeedback.textContent += ` ${outcome}`;
  }

  if (duelNext) {
    duelNext.hidden = false;

    duelNext.textContent =
      duelIndex === duelQuestions.length - 1
        ? "View Results"
        : "Next Question";
  }
}

function finishDuel() {
  clearDuelTimers();
  duelRunning = false;

  if (duelQuestion) duelQuestion.textContent = "Duel complete";

  if (duelOptions) duelOptions.replaceChildren();

  if (duelProgress) {
    duelProgress.textContent =
      `${duelQuestions.length} questions completed`;
  }

  if (duelTimer) duelTimer.textContent = "—";

  let result;

  if (playerScore > botScore) {
    result = "You won the duel!";
  } else if (playerScore < botScore) {
    result = "The bot won this duel. Try again!";
  } else {
    result = "It's a draw!";
  }

  if (duelFeedback) {
    duelFeedback.textContent =
      `${result} Final score — You: ${playerScore}, Bot: ${botScore}.`;
  }

  if (duelNext) duelNext.hidden = true;

  if (duelExit) duelExit.textContent = "Return to Practice";
}

function exitDuel() {
  clearDuelTimers();

  duelRunning = false;
  duelQuestions = [];

  hideDuel();

  if (duelExit) duelExit.textContent = "Exit Challenge";

  const normalQuestionArea = document.getElementById("question-area");

  if (normalQuestionArea) {
    normalQuestionArea.hidden = true;
  }

  const normalResults = document.getElementById("question-results");

  if (normalResults) {
    normalResults.hidden = true;
  }

  if (modeSelect) modeSelect.value = "practice";

  updateModeDescription();
}

duelNext?.addEventListener("click", () => {
  if (!duelRunning || !roundEnded) return;

  duelIndex++;
  startRound();
});

duelExit?.addEventListener("click", () => {
  exitDuel();
});

// Receive the selected questions from the existing question engine.
window.addEventListener("hc:questions-loaded", event => {
  const { questions, faction, mode } = event.detail || {};

  currentFaction = faction || "independent";

  if (currentFaction !== "gamers" || mode !== "quick-duel") {
    return;
  }

  startQuickDuel(questions);
});

// Reveal game-mode controls only for Gamers.
window.addEventListener("hc:faction-loaded", event => {
  currentFaction = event.detail?.faction || "independent";

  if (modePanel) {
    modePanel.hidden = currentFaction !== "gamers";
  }
});
