
import { auth, database } from "./firebase-client.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  ref,
  onValue,
  update,
  runTransaction,
  push
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";


const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const $ = id => document.getElementById(id);

const accessMessage = $("access-message");
const studio = $("studio");
const list = $("question-list");

let admin = null;
let queue = {};
let stopListener = null;
let busy = new Set();


// ------------------------------------------
// HELPERS
// ------------------------------------------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function isAdmin() {
  return Boolean(
    admin &&
    admin.uid === ADMIN_UID
  );
}

function notify(message, type = "") {
  const box = $("queue-message");

  box.hidden = false;
  box.className = `notice ${type}`;
  box.textContent = message;
}

function validate(data) {
  if (!data.subject || !data.topic)
    return "Subject and topic are required.";

  if (!data.question)
    return "Question text is required.";

  if (
    !Array.isArray(data.options) ||
    data.options.length !== 4 ||
    data.options.some(option => !option)
  ) {
    return "All four answer options must be completed.";
  }

  if (
    !Number.isInteger(data.answerIndex) ||
    data.answerIndex < 0 ||
    data.answerIndex > 3
  ) {
    return "Choose a valid correct answer.";
  }

  if (!data.explanation)
    return "An explanation is required.";

  if (
    !Number.isInteger(data.difficulty) ||
    data.difficulty < 1 ||
    data.difficulty > 7
  ) {
    return "Difficulty must be between 1 and 7.";
  }

  return null;
}

function getEditedData(card) {
  const options = [...card.querySelectorAll(".option")]
    .sort((a, b) =>
      Number(a.dataset.index) - Number(b.dataset.index)
    )
    .map(input => input.value.trim());

  return {
    subject: card.dataset.subject.trim(),
    topic: card.dataset.topic.trim(),

    question: card.querySelector(".question").value.trim(),

    options,

    answerIndex: Number(
      card.querySelector(".answer").value
    ),

    explanation:
      card.querySelector(".explanation").value.trim(),

    difficulty: Number(
      card.querySelector(".difficulty").value
    )
  };
}


// ------------------------------------------
// RENDERING
// ------------------------------------------

function render() {
  if (!isAdmin()) return;

  const entries = Object.entries(queue)
    .filter(([, question]) =>
      question &&
      question.reviewStatus === "pending_review"
    )
    .sort((a, b) =>
      Number(b[1].submittedAt || 0) -
      Number(a[1].submittedAt || 0)
    );

  $("pending-count").textContent = entries.length;
  $("visible-count").textContent = entries.length;

  if (!entries.length) {
    list.innerHTML = `
      <div class="empty">
        <h3>Your review queue is empty.</h3>
        <p>
          No questions with pending_review status were found.
        </p>
      </div>
    `;
    return;
  }

  list.innerHTML = entries.map(([id, q], index) => `
    <details class="question-card" data-id="${escapeHTML(id)}">

      <summary>

        <div class="card-heading">
          ${index + 1}. ${escapeHTML(q.subject || "Unknown subject")}
          · ${escapeHTML(q.topic || "Unknown topic")}
        </div>

        <div class="card-meta">
          Difficulty ${escapeHTML(q.difficulty ?? "?")}/7
          · Pending approval
        </div>

        <div class="preview">
          ${escapeHTML(
            String(q.question || "").slice(0, 160)
          )}${String(q.question || "").length > 160 ? "..." : ""}
        </div>

      </summary>

      <div class="card-content">

        <label>Subject</label>
        <input
          class="subject"
          value="${escapeHTML(q.subject || "")}"
        >

        <label>Topic</label>
        <input
          class="topic"
          value="${escapeHTML(q.topic || "")}"
        >

        <label>Question</label>
        <textarea class="question">${escapeHTML(q.question || "")}</textarea>

        <label>Answer options</label>

        <div class="options">

          ${[0, 1, 2, 3].map(i => `
            <div>
              <label>Option ${"ABCD"[i]}</label>

              <textarea
                class="option"
                data-index="${i}"
              >${escapeHTML(q.options?.[i] || "")}</textarea>
            </div>
          `).join("")}

        </div>

        <label>Correct answer</label>

        <select class="answer">
          ${["A", "B", "C", "D"].map((letter, i) => `
            <option
              value="${i}"
              ${Number(q.answerIndex) === i ? "selected" : ""}
            >
              ${letter}
            </option>
          `).join("")}
        </select>

        <label>Explanation</label>
        <textarea class="explanation">${escapeHTML(q.explanation || "")}</textarea>

        <label>Difficulty (1–7)</label>
        <input
          class="difficulty"
          type="number"
          min="1"
          max="7"
          step="1"
          value="${escapeHTML(q.difficulty ?? 1)}"
        >

        <div class="card-meta">
          ${Array.isArray(q.qualityIssues) && q.qualityIssues.length
            ? `<strong>Quality warnings:</strong>
               ${escapeHTML(q.qualityIssues.join(" · "))}`
            : "No automatic quality warnings."}
        </div>

        <div class="actions">

          <button class="save" type="button">
            Save corrections
          </button>

          <button class="approve" type="button">
            Approve & Publish
          </button>

          <button class="reject" type="button">
            Reject
          </button>

        </div>

      </div>

    </details>
  `).join("");
}


// ------------------------------------------
// RESERVATION
// ------------------------------------------

async function reserveQuestion(id, action) {
  const questionRef = ref(
    database,
    `pendingQuestions/${id}`
  );

  const result = await runTransaction(
    questionRef,
    current => {
      if (
        !current ||
        current.reviewStatus !== "pending_review"
      ) {
        return;
      }

      return {
        ...current,
        reviewStatus: action,
        reservedBy: admin.uid,
        reservedAt: Date.now()
      };
    },
    { applyLocally: false }
  );

  if (!result.committed) {
    throw new Error(
      "This question is no longer available for review."
    );
  }

  return result.snapshot.val();
}

async function releaseReservation(id, action) {
  const questionRef = ref(
    database,
    `pendingQuestions/${id}`
  );

  await runTransaction(
    questionRef,
    current => {
      if (
        !current ||
        current.reviewStatus !== action ||
        current.reservedBy !== admin.uid
      ) {
        return;
      }

      const restored = { ...current };

      restored.reviewStatus = "pending_review";
      delete restored.reservedBy;
      delete restored.reservedAt;

      return restored;
    },
    { applyLocally: false }
  );
}


// ------------------------------------------
// SAVE CORRECTIONS
// ------------------------------------------

async function saveCorrections(card, id, button) {
  const data = getEditedData(card);
  const error = validate(data);

  if (error) {
    notify(error, "error");
    return;
  }

  try {
    busy.add(id);
    button.disabled = true;

    const result = await runTransaction(
      ref(database, `pendingQuestions/${id}`),

      current => {
        if (
          !current ||
          current.reviewStatus !== "pending_review"
        ) {
          return;
        }

        return {
          ...current,
          ...data,
          verified: false,
          reviewStatus: "pending_review",
          updatedAt: Date.now(),
          updatedBy: admin.uid
        };
      },

      { applyLocally: false }
    );

    if (!result.committed) {
      throw new Error(
        "Question is no longer pending. Refresh the queue."
      );
    }

    notify(
      "Corrections saved. The question is still awaiting approval.",
      "success"
    );

  } catch (error) {
    notify("Save failed: " + error.message, "error");

  } finally {
    busy.delete(id);
    button.disabled = false;
  }
}


// ------------------------------------------
// APPROVE AND PUBLISH
// ------------------------------------------

async function approveQuestion(card, id, button) {
  if (!confirm(
    "Publish this question to the student question bank?"
  )) return;

  const edited = getEditedData(card);
  const error = validate(edited);

  if (error) {
    notify(error, "error");
    return;
  }

  let reserved = false;

  try {
    busy.add(id);
    button.disabled = true;

    const original = await reserveQuestion(
      id,
      "publishing"
    );

    reserved = true;

    const publishedId = push(
      ref(database, "questionBank")
    ).key;

    const now = Date.now();

    const published = {
      ...original,
      ...edited,

      id: publishedId,
      type: "multiple-choice",
      verified: true,

      reviewStatus: "published",
      approvedAt: now,
      approvedBy: admin.uid,
      updatedAt: now,
      updatedBy: admin.uid
    };

    const patch = {
      [`questionBank/${publishedId}`]: published,

      [`pendingQuestions/${id}`]: null,

      [`publishedReviewLog/${id}`]: {
        queueId: id,
        publishedQuestionId: publishedId,
        publishedAt: now,
        publishedBy: admin.uid,
        sourceDraftId: original.sourceDraftId || null,
        question: published.question
      }
    };

    await update(ref(database), patch);

    reserved = false;

    notify(
      "Question approved and published successfully.",
      "success"
    );

  } catch (error) {
    console.error("Publication error:", error);

    if (reserved) {
      try {
        await releaseReservation(id, "publishing");
      } catch (rollbackError) {
        console.error(rollbackError);

        notify(
          "Publishing failed and the reservation could not be released. Check the question status before retrying.",
          "error"
        );

        return;
      }
    }

    notify(
      "Publication failed: " + error.message,
      "error"
    );

  } finally {
    busy.delete(id);
    button.disabled = false;
  }
}


// ------------------------------------------
// REJECT AND ARCHIVE
// ------------------------------------------

async function rejectQuestion(card, id, button) {
  if (!confirm(
    "Reject and archive this question? It will not be published."
  )) return;

  let reserved = false;

  try {
    busy.add(id);
    button.disabled = true;

    const original = await reserveQuestion(
      id,
      "rejecting"
    );

    reserved = true;

    const now = Date.now();

    const patch = {
      [`rejectedQuestions/${id}`]: {
        ...original,
        status: "rejected",
        rejectedAt: now,
        rejectedBy: admin.uid
      },

      [`pendingQuestions/${id}`]: null
    };

    await update(ref(database), patch);

    reserved = false;

    notify(
      "Question rejected and archived.",
      "success"
    );

  } catch (error) {
    console.error("Rejection error:", error);

    if (reserved) {
      try {
        await releaseReservation(id, "rejecting");
      } catch (rollbackError) {
        console.error(rollbackError);
      }
    }

    notify(
      "Rejection failed: " + error.message,
      "error"
    );

  } finally {
    busy.delete(id);
    button.disabled = false;
  }
}


// ------------------------------------------
// EVENT HANDLING
// ------------------------------------------

list.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;

  const card = button.closest(".question-card");
  if (!card) return;

  const id = card.dataset.id;

  if (!isAdmin() || busy.has(id)) return;

  if (button.classList.contains("save")) {
    await saveCorrections(card, id, button);
  }

  if (button.classList.contains("approve")) {
    await approveQuestion(card, id, button);
  }

  if (button.classList.contains("reject")) {
    await rejectQuestion(card, id, button);
  }
});


// ------------------------------------------
// SHOW ALL / COLLAPSE ALL
// ------------------------------------------

$("show-all").addEventListener("click", () => {
  list.querySelectorAll(".question-card").forEach(card => {
    card.open = true;
  });
});

$("collapse-all").addEventListener("click", () => {
  list.querySelectorAll(".question-card").forEach(card => {
    card.open = false;
  });
});


// ------------------------------------------
// REFRESH
// ------------------------------------------

$("refresh").addEventListener("click", async () => {
  if (!isAdmin()) return;

  notify("Refreshing the review queue...");
  
  // Re-read the database without creating another listener.
  try {
    const { get } = await import(
      "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js"
    );

    const snapshot = await get(
      ref(database, "pendingQuestions")
    );

    queue = snapshot.val() || {};
    render();

    notify("Review queue refreshed.", "success");

  } catch (error) {
    notify(
      "Refresh failed: " + error.message,
      "error"
    );
  }
});


// ------------------------------------------
// AUTHENTICATION + LIVE QUEUE
// ------------------------------------------

onAuthStateChanged(auth, user => {
  admin = user && user.uid === ADMIN_UID
    ? user
    : null;

  if (!isAdmin()) {
    if (stopListener) {
      stopListener();
      stopListener = null;
    }

    studio.hidden = true;
    accessMessage.hidden = false;

    accessMessage.className = "notice error";

    accessMessage.textContent = user
      ? "Access denied. This account is not an authorised administrator."
      : "Please sign in with your administrator account.";

    queue = {};
    list.replaceChildren();

    return;
  }

  accessMessage.hidden = true;
  studio.hidden = false;

  if (stopListener) {
    stopListener();
    stopListener = null;
  }

  stopListener = onValue(
    ref(database, "pendingQuestions"),

    snapshot => {
      queue = snapshot.val() || {};
      render();
    },

    error => {
      notify(
        "Firebase queue error: " + error.message,
        "error"
      );
    }
  );
});
