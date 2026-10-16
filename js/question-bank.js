
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

function showStatus(message, type = "") {
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

function resetForm() {
  form.reset();
  editingId = null;
  formHeading.textContent = "Add a question";
  saveButton.textContent = "Save question";
  cancelButton.hidden = true;
}

function beginEditing(id) {
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

function renderQuestions() {
  const query = searchInput.value.trim().toLowerCase();

  const entries = Object.entries(questions).filter(([, q]) => {
    const text = [
      q.subject,
      q.topic,
      q.question,
      q.sourceType
    ].join(" ").toLowerCase();

    return text.includes(query);
  });

  questionCount.textContent =
    `${entries.length} question${entries.length === 1 ? "" : "s"} shown`;

  if (entries.length === 0) {
    questionList.innerHTML =
      '<p class="muted">No questions found. Add one using the form above.</p>';
    return;
  }

  questionList.innerHTML = entries.map(([id, q]) => {
    const options = Array.isArray(q.options) ? q.options : [];
    const letters = ["A", "B", "C", "D"];

    const optionHTML = options.map((option, index) => `
      <li>
        ${letters[index] || index + 1}.
        ${escapeHTML(option)}
        ${Number(q.answerIndex) === index ? " — Correct answer" : ""}
      </li>
    `).join("");

    return `
      <article class="question-card">
        <span class="tag">${escapeHTML(q.subject || "No subject")}</span>
        <span class="tag">${escapeHTML(q.topic || "No topic")}</span>
        <span class="tag">Difficulty ${escapeHTML(q.difficulty ?? "?")}/7</span>
        <span class="tag">${q.verified === true ? "Verified" : "Unverified"}</span>

        <h3>${escapeHTML(q.question || "Untitled question")}</h3>

        <ol class="option-list" type="A">
          ${optionHTML}
        </ol>

        <p><strong>Explanation:</strong>
          ${escapeHTML(q.explanation || "No explanation supplied.")}
        </p>

        <p class="hint">
          Source: ${escapeHTML(q.sourceType || "unspecified")}
          ${q.sourceDetails ? " — " + escapeHTML(q.sourceDetails) : ""}
        </p>

        ${q.syllabusObjective ? `
          <p class="hint">
            Syllabus objective: ${escapeHTML(q.syllabusObjective)}
          </p>` : ""}

        <div class="actions">
          <button type="button" class="edit-button" data-id="${escapeHTML(id)}">
            Edit
          </button>
          <button type="button" class="danger delete-button"
                  data-id="${escapeHTML(id)}">
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
      const id = button.dataset.id;
      const question = questions[id];

      if (!question) return;

      if (!confirm("Delete this question permanently?")) return;

      button.disabled = true;

      try {
        await remove(ref(database, `questionBank/${id}`));

        if (editingId === id) resetForm();

        showStatus("Question deleted.", "success");
      } catch (error) {
        console.error(error);
        showStatus(
          "Could not delete the question. Check your connection and Firebase permissions.",
          "error"
        );
        button.disabled = false;
      }
    });
  });
}

onAuthStateChanged(auth, user => {
  if (stopListening) {
    stopListening();
    stopListening = null;
  }

  currentUser = user;

  if (!user) {
    appContent.style.display = "none";
    showStatus("Please sign in with the authorised administrator account.");
    window.location.replace("login.html");
    return;
  }

  if (user.uid !== ADMIN_UID) {
    appContent.style.display = "none";
    showStatus("Access denied. This account is not authorised to manage questions.", "error");
    return;
  }

  appContent.style.display = "block";
  field("admin-email").textContent = user.email || "Administrator";
  showStatus("Administrator access confirmed.", "success");

  stopListening = onValue(
    ref(database, "questionBank"),
    snapshot => {
      questions = snapshot.val() || {};
      renderQuestions();
    },
    error => {
      console.error(error);
      showStatus(
        "Could not load questions. Check Firebase Realtime Database rules and your connection.",
        "error"
      );
    }
  );
});

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    showStatus("You are not authorised to save questions.", "error");
    return;
  }

  const options = [0, 1, 2, 3].map(i =>
    field(`option${i}`).value.trim()
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

  const now = Date.now();

  const data = {
    subject: field("subject").value.trim(),
    topic: field("topic").value.trim(),
    question: field("question").value.trim(),
    difficulty,
    sourceType: field("sourceType").value,
    sourceDetails: field("sourceDetails").value.trim(),
    syllabusObjective: field("syllabusObjective").value.trim(),
    options,
    answerIndex,
    explanation: field("explanation").value.trim(),
    verified: field("verified").checked,
    updatedAt: now,
    updatedBy: currentUser.uid
  };

  if (!data.subject || !data.topic || !data.question || !data.explanation) {
    showStatus("Complete all required fields.", "error");
    return;
  }

  saveButton.disabled = true;

  try {
    if (editingId) {
      await update(ref(database, `questionBank/${editingId}`), data);
      showStatus("Question updated successfully.", "success");
    } else {
      const newQuestionRef = push(ref(database, "questionBank"));

      await set(newQuestionRef, {
        ...data,
        createdAt: now,
        createdBy: currentUser.uid
      });

      showStatus("Question saved successfully.", "success");
    }

    resetForm();
  } catch (error) {
    console.error(error);
    showStatus(
      "Saving failed. Check your internet connection, signed-in account and Firebase rules.",
      "error"
    );
  } finally {
    saveButton.disabled = false;
  }
});

cancelButton.addEventListener("click", resetForm);

searchInput.addEventListener("input", renderQuestions);

field("logout-button").addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error(error);
    showStatus("Could not sign out. Please try again.", "error");
  }
});
