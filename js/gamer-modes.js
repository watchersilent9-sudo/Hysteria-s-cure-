/*
 * Hysteria's Cure — Gamer Modes
 * Quick Duel: student versus simulated bot.
 * Survival and Ranked Challenge remain separate future modes.
 */

import { auth, database } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const $ = id => document.getElementById(id);

const modeSelect = $("game-mode");
const modeDescription = $("game-mode-description");
const modePanel = $("gamer-modes");

const duelArea = $("duel-area");
const duelTitle = $("duel-title");
const duelPlayerScore = $("duel-player-score");
const duelBotScore = $("duel-bot-score");
const duelProgress = $("duel-progress");
const duelTimer = $("duel-timer");
const duelQuestion = $("duel-question");
const duelOptions = $("duel-options");
const duelFeedback = $("duel-feedback");
const duelNext = $("duel-next");
const duelExit = $("duel-exit");

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
let factionCheckVersion = 0;

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
    MODE_DESCRIPTIONS[modeSelect.value] || MODE_DESCRIPTIONS.practice;
}

function setFaction(faction) {
  const validFactions = ["readers", "gamers", "movie-lovers", "independent"];

  currentFaction = validFactions.includes(faction) ? faction : "independent";

  if (modePanel) {
    modePanel.hidden = currentFaction !== "gamers";
  }

  // If a non-Gamer account is detected, don't leave a Gamer challenge running.
  if (currentFaction !== "gamers" && duelRunning) {
    exitDuel();
  }
}

async function detectFaction(user) {
  const version = ++factionCheckVersion;

  if (!user) {
    setFaction("independent");
    return;
  }

  try {
    const snapshot = await get(ref(database, `users/${user.uid}/faction`));

    // Ignore an old request if the account changed while it was loading.
    if (version !== factionCheckVersion) return;

    setFaction(snapshot.val());
  } catch (error) {
    console.error("Gamer mode: faction lookup failed.", error);

    if (version !== factionCheckVersion) return;

    // Keep a faction already received from the question engine.
    if (currentFaction !== "gamers") {
      setFaction("independent");
    }
  }
}

modeSelect?.addEventListener("change", () => {
  updateModeDescription();

  if (modeSelect.value !== "practice" && currentFaction !== "gamers") {
    modeSelect.value = "practice";
    updateModeDescription();

    const message = $("engine-message");
    if (message) {
      message.textContent = "Gamer modes are available only to Gamer accounts.";
    }
  }

  if (modeSelect.value === "practice") {
    hideDuel();
  }
});

updateModeDescription();

// Listen for Firebase authentication, then check the account's faction.
onAuthStateChanged(auth, user => {
  detectFaction(user);
});

// Receive faction updates from the question engine.
window.addEventListener("hc:faction-loaded", event => {
  const faction = event.detail?.faction;

  if (faction) {
    setFaction(faction);
  }
});

// Hide the regular question interface when a duel starts.
function hideNormalQuestionInterface() {
  const normalQuestionArea = $("question-area");
  const normalResults = $("question-results");

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
  if (currentFaction !== "gamers") {
    alert("Quick Duel is available only to Gamer accounts.");
    return;
  }

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

  if (duelPlayerScore) duelPlayerScore.textContent = String(playerScore);
  if (duelBotScore) duelBotScore.textContent = String(botScore);
  if (duelQuestion) duelQuestion.textContent = question.question;
  if (duelFeedback) duelFeedback.textContent = "";
  if (duelNext) duelNext.hidden = true;

  if (duelOptions) {
    duelOptions.replaceChildren();

    question.options.forEach((option, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "duel-option";
      button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;

      button.addEventListener("click", () => submitPlayerAnswer(index));

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

  const botDelay = 1000 + Math.random() * 3000;

  botTimer = setTimeout(() => {
    submitBotAnswer(question);
  }, botDelay);
}

function updateTimer() {
  if (!duelTimer || roundEnded) return;

  const remaining = Math.max(0, (roundDeadline - Date.now()) / 1000);
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
      : `Incorrect. −2 points where available. Correct answer: ${question.options[question.answerIndex]}`;
  }

  if (duelPlayerScore) duelPlayerScore.textContent = String(playerScore);

  resolveRoundIfReady();
}

function submitBotAnswer(question) {
  if (!duelRunning || roundEnded || botAnswered) return;

  botAnswered = true;

  const difficulty = Number(question.difficulty) || 1;

  const accuracy = Math.max(
    0.35,
    Math.min(0.85, 0.85 - (difficulty - 1) * 0.07)
  );

  botRoundCorrect = Math.random() < accuracy;

  if (botRoundCorrect) {
    botScore += getPoints(question);
  }

  if (duelBotScore) duelBotScore.textContent = String(botScore);

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
      duelFeedback.textContent = "Time's up! You didn't answer in time.";
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
    const outcome =
      playerRoundCorrect && botRoundCorrect
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
      duelIndex === duelQuestions.length - 1 ? "View Results" : "Next Question";
  }
}

function finishDuel() {
  clearDuelTimers();
  duelRunning = false;

  if (duelQuestion) duelQuestion.textContent = "Duel complete";
  if (duelOptions) duelOptions.replaceChildren();

  if (duelProgress) {
    duelProgress.textContent = `${duelQuestions.length} questions completed`;
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
  if (modeSelect) modeSelect.value = "practice";

  updateModeDescription();
}

duelNext?.addEventListener("click", () => {
  if (!duelRunning || !roundEnded) return;

  duelIndex++;
  startRound();
});

duelExit?.addEventListener("click", exitDuel);

// Start a duel when the engine supplies the selected questions.
window.addEventListener("hc:questions-loaded", event => {
  const { questions, faction, mode } = event.detail || {};

  if (faction) setFaction(faction);

  if (currentFaction !== "gamers" || mode !== "quick-duel") return;

  startQuickDuel(questions);
});
