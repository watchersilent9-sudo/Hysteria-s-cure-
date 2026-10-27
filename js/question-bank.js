/*
 * Hysteria's Cure — Question Bank Manager
 * Features:
 * - Administrator-only question management
 * - Add, edit, delete and search questions
 * - Seven-star difficulty system
 * - Source and syllabus metadata
 * - Question-engine-compatible Firebase records
 * - Verification status and error handling
 */

import { auth, database } from "./firebase-client.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  ref,
  push,
  set,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

// Keep this UID consistent with the authorised administrator account.
const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const statusBox = document.getElementById("status");
const appContent = document.getElementById("app-content");
const form = document.getElementById("question-form");
const formHeading = document.getElementById("form-heading");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-edit");
const questionList = document.getElementById("question-list");
const questionCount = document.getElementById("question-count");
const searchInput = document.getElementById("search");

let currentUser = null;
let questions = {};
let editingId = null;
let stopListening = null;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function showStatus(message, type = "") {
  if (!statusBox) return;

  statusBox.textContent = message;
  statusBox.className = "status" + (type ? ` ${type}` : "");
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

function field(id) {
  return document.getElementById(id);
}

function isAuthorisedAdmin() {
  return Boolean(currentUser && currentUser.uid === ADMIN_UID);
}

function makeQuestionId() {
  // Firebase push keys are suitable for stable question IDs.
  return push(ref(database, "questionBank")).key;
}

function resetForm() {
  form?.reset();
  editingId = null;

  if (formHeading) formHeading.textContent = "Add a question";
  if (saveButton) saveButton.textContent = "Save question";
  if (cancelButton) cancelButton.hidden = true;
}

function beginEditing(id) {
  if (!isAuthorisedAdmin()) {
    showStatus("You are not authorised to edit questions.", "error");
    return;
  }

  const question = questions[id];
  if (!question) return;

  editingId = id;

  field("subject").value = question.subject || "";
  field("topic").value = question.topic || "";
  field("question").value = question.question || "";
  field("difficulty").value = String(question.difficulty ?? 1);
  field("sourceType").value = question.sourceType || "sample";
  field("sourceDetails").value = question.sourceDetails || "";
  field("syllabusObjective").value = question.syllabusObjective || "";

  const options = Array.isArray(question.options) ? question.options : [];

  for (let i = 0; i < 4; i++) {
    field(`option${i}`).value = options[i] || "";
  }

  field("answerIndex").value = String(question.answerIndex ?? 0);
  field("explanation").value = question.explanation || "";
  field("verified").checked = question.verified === true;

  formHeading.textContent = "Edit question";
  saveButton.textContent = "Update question";
  cancelButton.hidden = false;

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --------------------------------------------------
// QUESTION LIST
// --------------------------------------------------

function renderQuestions() {
  if (!questionList || !questionCount || !searchInput) return;

  const query = searchInput.value.trim().toLowerCase();

  const entries = Object.entries(questions).filter(([, question]) => {
    const text = [
      question.subject,
      question.topic,
      question.question,
      question.sourceType,
      question.sourceDetails
    ].join(" ").toLowerCase();

    return text.includes(query);
  });

  questionCount.textContent =
    `${entries.length} question${entries.length === 1 ? "" : "s"} shown`;

  if (!entries.length) {
    questionList.replaceChildren();

    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "No questions found. Add one using the form above.";

    questionList.appendChild(message);
    return;
  }

  questionList.innerHTML = entries.map(([id, question]) => {
    const options = Array.isArray(question.options) ? question.options : [];
    const letters = ["A", "B", "C", "D"];

    const optionHTML = options.map((option, index) => `
      <li>
        ${letters[index] || index + 1}.
        ${escapeHTML(option)}
        ${Number(question.answerIndex) === index ? " — Correct answer" : ""}
      </li>
    `).join("");

    return `
      <article class="question-card">
        <span class="tag">${escapeHTML(question.subject || "No subject")}</span>
        <span class="tag">${escapeHTML(question.topic || "No topic")}</span>
        <span class="tag">Difficulty ${escapeHTML(question.difficulty ?? "?")}/7</span>
        <span class="tag">${question.verified === true ? "Verified" : "Unverified"}</span>

        <h3>${escapeHTML(question.question || "Untitled question")}</h3>

        <ol class="option-list" type="A">
          ${optionHTML}
        </ol>

        <p><strong>Explanation:</strong>
          ${escapeHTML(question.explanation || "No explanation supplied.")}
        </p>

        <p class="hint">
          Source: ${escapeHTML(question.sourceType || "unspecified")}
          ${question.sourceDetails ? " — " + escapeHTML(question.sourceDetails) : ""}
        </p>

        ${question.syllabusObjective ? `
          <p class="hint">
            Syllabus objective: ${escapeHTML(question.syllabusObjective)}
          </p>` : ""}

        <div class="actions">
          <button type="button" class="edit-button" data-id="${escapeHTML(id)}">
            Edit
          </button>
          <button type="button" class="danger delete-button" data-id="${escapeHTML(id)}">
            Delete
          </button>
        </div>
      </article>
    `;
  }).join("");

  questionList.querySelectorAll(".edit-button").forEach(button => {
    button.addEventListener("click", () => beginEditing(button.dataset.id));
  });

  questionList.querySelectorAll(".delete-button").forEach(button => {
    button.addEventListener("click", async () => {
      if (!isAuthorisedAdmin()) {
        showStatus("You are not authorised to delete questions.", "error");
        return;
      }

      const id = button.dataset.id;

      if (!questions[id]) return;
      if (!confirm("Delete this question permanently?")) return;

      button.disabled = true;

      try {
        await remove(ref(database, `questionBank/${id}`));

        if (editingId === id) resetForm();

        showStatus("Question deleted.", "success");
      } catch (error) {
        console.error("Question deletion failed:", error);

        showStatus(
          "Could not delete the question. Check your connection and Firebase permissions.",
          "error"
        );

        button.disabled = false;
      }
    });
  });
}

// --------------------------------------------------
// ADMIN AUTHENTICATION
// --------------------------------------------------

onAuthStateChanged(auth, user => {
  if (stopListening) {
    stopListening();
    stopListening = null;
  }

  currentUser = user;

  if (!user) {
    if (appContent) appContent.style.display = "none";

    showStatus("Please sign in with the authorised administrator account.");
    window.location.replace("login.html");
    return;
  }

  if (user.uid !== ADMIN_UID) {
    if (appContent) appContent.style.display = "none";

    showStatus(
      "Access denied. This account is not authorised to manage questions.",
      "error"
    );

    return;
  }

  if (appContent) appContent.style.display = "block";

  const emailField = field("admin-email");
  if (emailField) emailField.textContent = user.email || "Administrator";

  showStatus("Administrator access confirmed.", "success");

  stopListening = onValue(
    ref(database, "questionBank"),
    snapshot => {
      questions = snapshot.val() || {};
      renderQuestions();
    },
    error => {
      console.error("Question loading failed:", error);

      showStatus(
        "Could not load questions. Check Firebase rules and your connection.",
        "error"
      );
    }
  );
});

// --------------------------------------------------
// VALIDATE AND SAVE QUESTIONS
// --------------------------------------------------

form?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAuthorisedAdmin()) {
    showStatus("You are not authorised to save questions.", "error");
    return;
  }

  const options = [0, 1, 2, 3].map(index =>
    field(`option${index}`).value.trim()
  );

  if (options.some(option => !option)) {
    showStatus("Please fill in all four answer options.", "error");
    return;
  }

  const difficulty = Number(field("difficulty").value);
  const answerIndex = Number(field("answerIndex").value);

  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 7) {
    showStatus("Choose a difficulty from 1 to 7.", "error");
    return;
  }

  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
    showStatus("Choose a valid correct answer.", "error");
    return;
  }

  const data = {
    subject: field("subject").value.trim(),
    topic: field("topic").value.trim(),
    question: field("question").value.trim(),
    difficulty,

    type: "multiple-choice",

    sourceType: field("sourceType").value,
    sourceDetails: field("sourceDetails").value.trim(),
    syllabusObjective: field("syllabusObjective").value.trim(),

    options,
    answerIndex,
    explanation: field("explanation").value.trim(),

    verified: field("verified").checked,

    updatedAt: Date.now(),
    updatedBy: currentUser.uid
  };

  if (!data.subject || !data.topic || !data.question || !data.explanation) {
    showStatus("Complete all required fields.", "error");
    return;
  }

  if (!data.sourceType) {
    showStatus("Select a question source type.", "error");
    return;
  }

  saveButton.disabled = true;

  try {
    if (editingId) {
      const existingQuestion = questions[editingId];

      if (!existingQuestion) {
        throw new Error("This question no longer exists. Refresh and try again.");
      }

      await update(ref(database, `questionBank/${editingId}`), data);

      showStatus("Question updated successfully.", "success");
    } else {
      const newId = makeQuestionId();

      if (!newId) {
        throw new Error("Could not generate a question ID.");
      }

      await set(ref(database, `questionBank/${newId}`), {
        ...data,
        id: newId,
        createdAt: Date.now(),
        createdBy: currentUser.uid
      });

      showStatus("Question saved successfully.", "success");
    }

    resetForm();
  } catch (error) {
    console.error("Question saving failed:", error);

    showStatus(
      error.message ||
        "Saving failed. Check your internet connection, account and Firebase rules.",
      "error"
    );
  } finally {
    saveButton.disabled = false;
  }
});

// --------------------------------------------------
// FORM CONTROLS AND LOGOUT
// --------------------------------------------------

cancelButton?.addEventListener("click", resetForm);

searchInput?.addEventListener("input", renderQuestions);

field("logout-button")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("Sign-out failed:", error);
    showStatus("Could not sign out. Please try again.", "error");
  }
});
