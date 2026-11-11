
/*
 * Hysteria's Cure
 * Admin Dashboard Controller
 *
 * Handles:
 * - Administrator authentication
 * - Firebase dashboard data
 * - Platform statistics
 * - Faction overview
 * - Recent questions
 * - GPT-6 Luna question generation
 */

import { auth, database } from "./firebase-client.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  ref,
  onValue,
  get
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";


/* =========================================
   CONFIGURATION
========================================= */

const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const AI_BACKEND_URL =
  "https://silver-raindrop-743021.netlify.app/.netlify/functions/generate-question";


/* =========================================
   ELEMENTS AND STATE
========================================= */

const $ = id => document.getElementById(id);

const accessMessage = $("access-message");
const dashboard = $("dashboard");
const logoutButton = $("logout-button");
const refreshButton = $("refresh-button");

let currentAdmin = null;
let listeners = [];

let loaded = {
  users: false,
  questions: false,
  achievements: false
};

let latestData = {
  users: null,
  questions: null,
  achievements: null
};


/* =========================================
   GENERAL UTILITIES
========================================= */

function setHealth(id, state, label) {
  const element = $(id);
  if (!element) return;

  element.textContent = label;
  element.className = `health-state ${state}`;
}

function setConnection(connected, label) {
  $("connection-label").textContent = label;

  $("connection-dot").className =
    `status-dot ${connected ? "ok" : "bad"}`;
}

function setStat(id, value) {
  $(id).textContent =
    Number(value || 0).toLocaleString();
}

function recordCount(data) {
  if (!data || typeof data !== "object") return 0;
  return Object.keys(data).length;
}

function validNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : 0;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showWarning(message, type = "warn") {
  const box = $("dashboard-warning");

  box.hidden = false;
  box.className = `notice ${type}`;
  box.textContent = message;
}

function clearWarning() {
  $("dashboard-warning").hidden = true;
  $("dashboard-warning").textContent = "";
}

function refreshTimestamp() {
  $("last-refreshed").textContent =
    new Date().toLocaleString();
}

function stopListeners() {
  listeners.forEach(stop => {
    if (typeof stop === "function") stop();
  });

  listeners = [];
}

function getProgress(user) {
  return user &&
    typeof user.progress === "object" &&
    user.progress !== null
      ? user.progress
      : {};
}


/* =========================================
   PLATFORM OVERVIEW
========================================= */

function updateOverview() {

  if (latestData.users !== null) {

    const users = latestData.users;
    const userCount = recordCount(users);

    setStat("stat-users", userCount);

    $("note-users").textContent =
      "Profiles stored in the users path";

    const factionKeys = [
      "readers",
      "gamers",
      "movie-lovers",
      "independent"
    ];

    const factionCounts = Object.fromEntries(
      factionKeys.map(key => [key, 0])
    );

    let answered = 0;
    let correct = 0;
    let xp = 0;
    let points = 0;
    let sessions = 0;

    Object.values(users || {}).forEach(user => {

      if (!user || typeof user !== "object") return;

      const faction =
        String(user.faction || "").toLowerCase();

      if (
        Object.prototype.hasOwnProperty.call(
          factionCounts,
          faction
        )
      ) {
        factionCounts[faction]++;
      }

      const progress = getProgress(user);

      answered += validNumber(progress.totalAnswered);
      correct += validNumber(progress.totalCorrect);
      xp += validNumber(progress.xp);
      points += validNumber(progress.points);
      sessions += validNumber(progress.sessionsCompleted);
    });

    setStat("stat-answered", answered);
    setStat("stat-correct", correct);
    setStat("stat-xp", xp);
    setStat("stat-points", points);
    setStat("stat-sessions", sessions);

    renderFactions(factionCounts, userCount);

    setHealth("health-profiles", "ok", "Readable");
  }


  if (latestData.questions !== null) {

    const questions = latestData.questions;

    setStat("stat-questions", recordCount(questions));

    $("note-questions").textContent =
      "Records stored in questionBank";

    renderRecentQuestions(questions);

    setHealth("health-questions", "ok", "Readable");
  }


  if (latestData.achievements !== null) {

    const achievements = latestData.achievements;

    const items = Object.values(achievements || {});

    const active = items.filter(item =>
      item && item.active === true
    ).length;

    setStat("stat-achievements", items.length);

    $("note-achievements").textContent =
      `${active.toLocaleString()} active · ${items.length.toLocaleString()} total`;

    setHealth("health-achievements", "ok", "Readable");
  }


  const allLoaded =
    loaded.users &&
    loaded.questions &&
    loaded.achievements;

  setHealth(
    "health-database",
    allLoaded ? "ok" : "warn",
    allLoaded ? "Reads successful" : "Partially checked"
  );

  if (allLoaded) {
    setConnection(true, "Database connected");
    clearWarning();
  }

  refreshTimestamp();
}


/* =========================================
   FACTION OVERVIEW
========================================= */

function renderFactions(counts, total) {

  const names = {
    readers: "Readers",
    gamers: "Gamers",
    "movie-lovers": "Movie Lovers",
    independent: "Independent"
  };

  $("faction-list").innerHTML =
    Object.entries(names).map(([key, name]) => {

      const count = counts[key] || 0;

      const percent = total
        ? (count / total) * 100
        : 0;

      return `
        <div class="faction-row">

          <div class="faction-name">
            ${name}
          </div>

          <div
            class="bar"
            role="progressbar"
            aria-label="${name} faction share"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${percent.toFixed(1)}"
          >
            <div
              class="bar-fill"
              style="width:${percent}%"
            ></div>
          </div>

          <div class="faction-count">
            ${count}
          </div>

        </div>
      `;

    }).join("");


  const recognised = Object.values(counts)
    .reduce((sum, value) => sum + value, 0);

  const missing = Math.max(0, total - recognised);

  $("faction-note").textContent = missing
    ? `${missing} profile(s) have no recognised faction.`
    : "Counts are based on saved faction records.";
}


/* =========================================
   RECENT QUESTIONS
========================================= */

function renderRecentQuestions(data) {

  const tbody = $("recent-questions");

  const questions = Object.entries(data || {})
    .map(([key, value]) => ({
      ...(value && typeof value === "object" ? value : {}),
      id: value?.id || key
    }))
    .sort((a, b) => {

      const dateA = Date.parse(a.createdAt || "") || 0;
      const dateB = Date.parse(b.createdAt || "") || 0;

      return dateB - dateA;

    })
    .slice(0, 8);


  if (!questions.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          No questions found.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML = questions.map(question => {

    const verified = question.verified === true;

    return `
      <tr>

        <td>
          <code>${escapeHTML(question.id)}</code>
        </td>

        <td>
          ${escapeHTML(question.subject || "Not set")}
        </td>

        <td>
          ${escapeHTML(question.topic || "Not set")}
        </td>

        <td>
          ${escapeHTML(question.difficulty ?? "—")}
        </td>

        <td>
          <span class="tag ${verified ? "ok" : "warn"}">
            ${verified ? "Verified" : "Unverified"}
          </span>
        </td>

      </tr>
    `;

  }).join("");
}


/* =========================================
   GPT-6 LUNA — AI QUESTION GENERATION
========================================= */

function setAIStatus(message, type = "warn") {

  const status = $("ai-generation-status");

  status.hidden = false;
  status.className = `notice ${type}`;
  status.textContent = message;
}


function hideAIResult() {

  $("ai-generation-result").hidden = true;

  $("ai-result-content").replaceChildren();
}


function appendResultText(parent, text) {

  const paragraph = document.createElement("p");

  paragraph.textContent = String(text ?? "");

  parent.appendChild(paragraph);
}


function appendResultSection(parent, heading, content) {

  if (
    content === undefined ||
    content === null ||
    content === ""
  ) {
    return;
  }

  const section = document.createElement("div");

  section.className = "ai-result-section";

  const title = document.createElement("strong");

  title.textContent = heading;

  section.appendChild(title);


  if (Array.isArray(content)) {

    const list = document.createElement("ul");

    content.forEach(item => {

      const li = document.createElement("li");

      li.textContent = typeof item === "object"
        ? JSON.stringify(item)
        : String(item);

      list.appendChild(li);

    });

    section.appendChild(list);

  } else {

    const paragraph = document.createElement("p");

    paragraph.textContent = typeof content === "object"
      ? JSON.stringify(content, null, 2)
      : String(content);

    section.appendChild(paragraph);
  }

  parent.appendChild(section);
}


function displayAICandidate(candidate, observationId) {

  const container = $("ai-result-content");

  container.replaceChildren();

  const question =
    candidate.question ||
    candidate.prompt ||
    "";

  appendResultText(
    container,
    question || "Question text was not returned."
  );


  if (Array.isArray(candidate.options)) {
    appendResultSection(
      container,
      "Options",
      candidate.options
    );
  }


  appendResultSection(
    container,
    "Correct answer",
    candidate.correctAnswer ?? candidate.answer
  );

  appendResultSection(
    container,
    "Expected answer",
    candidate.expectedAnswer
  );

  appendResultSection(
    container,
    "Explanation",
    candidate.explanation
  );

  appendResultSection(
    container,
    "Marking scheme",
    candidate.markingScheme
  );

  appendResultSection(
    container,
    "Difficulty",
    candidate.difficulty
  );


  const status = document.createElement("div");

  status.className = "ai-result-section";


  const statusText = document.createElement("p");

  statusText.textContent =
    "Status: Pending review. This question has not been published.";

  status.appendChild(statusText);


  const candidateId = document.createElement("p");

  candidateId.className = "ai-meta";

  candidateId.textContent =
    `Candidate ID: ${candidate.id || "Not returned"}`;

  status.appendChild(candidateId);


  const observation = document.createElement("p");

  observation.className = "ai-meta";

  observation.textContent =
    `Teacher observation ID: ${observationId || "Not returned"}`;

  status.appendChild(observation);


  container.appendChild(status);

  $("ai-generation-result").hidden = false;
}


function setupAIGeneration() {

  const form = $("ai-generation-form");

  if (!form) return;


  form.addEventListener("submit", async event => {

    event.preventDefault();

    const button = $("ai-generate-button");


    if (
      !currentAdmin ||
      auth.currentUser?.uid !== ADMIN_UID
    ) {

      setAIStatus(
        "Administrator authentication is unavailable. Please sign in again.",
        "error"
      );

      return;
    }


    const subject = $("ai-subject").value.trim();

    const topic = $("ai-topic").value.trim();

    const difficulty = Number(
      $("ai-difficulty").value
    );

    const type = $("ai-type").value;

    const instructions =
      $("ai-instructions").value.trim();


    if (!subject || !topic) {

      setAIStatus(
        "Please enter both a subject and a topic.",
        "error"
      );

      return;
    }


    if (
      !Number.isInteger(difficulty) ||
      difficulty < 1 ||
      difficulty > 7
    ) {

      setAIStatus(
        "Difficulty must be between 1 and 7.",
        "error"
      );

      return;
    }


    if (
      !["multiple-choice", "written-response"].includes(type)
    ) {

      setAIStatus(
        "Select a valid question format.",
        "error"
      );

      return;
    }


    button.disabled = true;
    button.textContent = "Generating...";

    hideAIResult();

    setAIStatus(
      "Contacting GPT-6 Luna. Please wait...",
      "warn"
    );


    try {

      const token = await currentAdmin.getIdToken();

      const response = await fetch(AI_BACKEND_URL, {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },

        body: JSON.stringify({
          subject,
          topic,
          difficulty,
          type,
          instructions
        })

      });


      let data;

      try {

        data = await response.json();

      } catch {

        throw new Error(
          `The backend returned an unreadable response (HTTP ${response.status}).`
        );

      }


      if (!response.ok) {

        throw new Error(
          data?.error ||
          data?.message ||
          `Question generation failed (HTTP ${response.status}).`
        );

      }


      if (
        !data?.candidate ||
        typeof data.candidate !== "object"
      ) {

        throw new Error(
          "The backend responded, but no valid question candidate was returned."
        );

      }


      displayAICandidate(
        data.candidate,
        data.observationId
      );


      setAIStatus(
        "Question generated and saved for review. It has not been published or used to train HAI.",
        "success"
      );


    } catch (error) {

      console.error(
        "AI question generation failed:",
        error
      );

      let message =
        error?.message || "An unexpected error occurred.";

      if (error instanceof TypeError) {

        message =
          "Could not reach the AI backend. Check your internet connection, Netlify deployment, and allowed website origin.";

      }

      setAIStatus(message, "error");


    } finally {

      button.disabled = false;

      button.textContent = "Generate Question";

    }

  });

}


/* =========================================
   FIREBASE LIVE DATA
========================================= */

function startListeners() {

  stopListeners();

  loaded = {
    users: false,
    questions: false,
    achievements: false
  };

  latestData = {
    users: null,
    questions: null,
    achievements: null
  };


  setConnection(false, "Loading data");

  setHealth("health-database", "warn", "Checking");
  setHealth("health-profiles", "warn", "Checking");
  setHealth("health-questions", "warn", "Checking");
  setHealth("health-achievements", "warn", "Checking");


  const paths = [

    {
      key: "users",
      path: "users",
      health: "health-profiles",
      label: "student profiles"
    },

    {
      key: "questions",
      path: "questionBank",
      health: "health-questions",
      label: "question bank"
    },

    {
      key: "achievements",
      path: "rewardSystem/achievements",
      health: "health-achievements",
      label: "achievements"
    }

  ];


  paths.forEach(item => {

    const unsubscribe = onValue(

      ref(database, item.path),

      snapshot => {

        loaded[item.key] = true;

        latestData[item.key] = snapshot.val() || {};

        setHealth(item.health, "ok", "Readable");

        updateOverview();

      },

      error => {

        console.error(
          `Dashboard read failed (${item.path}):`,
          error
        );

        loaded[item.key] = false;

        latestData[item.key] = null;

        setHealth(item.health, "bad", "Read failed");

        setConnection(false, "Some reads failed");

        setHealth(
          "health-database",
          "bad",
          "Read error"
        );

        showWarning(
          `Could not read ${item.label}. Check your internet connection and Firebase Realtime Database Rules.`,
          "error"
        );

      }

    );

    listeners.push(unsubscribe);

  });

}


/* =========================================
   AUTHENTICATION
========================================= */

onAuthStateChanged(auth, user => {

  stopListeners();

  currentAdmin = null;


  if (!user) {

    window.location.replace("login.html");

    return;
  }


  if (user.uid !== ADMIN_UID) {

    dashboard.hidden = true;

    accessMessage.hidden = false;

    accessMessage.className = "notice error";

    accessMessage.textContent =
      "Access denied. This account is not authorised to use the admin dashboard.";

    setHealth("health-auth", "bad", "Denied");

    setConnection(false, "Access denied");

    return;
  }


  currentAdmin = user;

  accessMessage.hidden = true;

  dashboard.hidden = false;

  setHealth("health-auth", "ok", "Verified");

  startListeners();

});


/* =========================================
   REFRESH BUTTON
========================================= */

refreshButton.addEventListener("click", async () => {

  if (
    !currentAdmin ||
    auth.currentUser?.uid !== ADMIN_UID
  ) {
    return;
  }


  refreshButton.disabled = true;

  refreshButton.textContent = "Refreshing...";


  try {

    await Promise.all([

      get(ref(database, "users")),

      get(ref(database, "questionBank")),

      get(ref(database, "rewardSystem/achievements"))

    ]);

    refreshTimestamp();


  } catch (error) {

    console.error(
      "Dashboard refresh failed:",
      error
    );

    showWarning(
      "Refresh failed. Check your connection and Firebase Database Rules.",
      "error"
    );


  } finally {

    refreshButton.disabled = false;

    refreshButton.textContent = "Refresh";

  }

});


/* =========================================
   LOGOUT
========================================= */

logoutButton.addEventListener("click", async () => {

  logoutButton.disabled = true;


  try {

    stopListeners();

    await signOut(auth);

    window.location.replace("login.html");


  } catch (error) {

    console.error("Logout failed:", error);

    showWarning(
      "Logout failed. Check your connection and try again.",
      "error"
    );

    logoutButton.disabled = false;

  }

});


/* =========================================
   NETWORK STATUS
========================================= */

window.addEventListener("online", () => {

  if (currentAdmin) {
    startListeners();
  }

});


window.addEventListener("offline", () => {

  setConnection(false, "Browser offline");

  showWarning(
    "Your device appears to be offline. Live dashboard information may be outdated.",
    "warn"
  );

});


/* =========================================
   INITIALISE
========================================= */

setupAIGeneration();
