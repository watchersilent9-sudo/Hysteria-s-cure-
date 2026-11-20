/* Final-review queue.
   Approve publishes; reject archives.
   Reservations prevent competing review actions.
*/

import { auth, database } from "./firebase-client.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  ref,
  onValue,
  push,
  update,
  runTransaction
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

let admin = null;
let queue = {};
let stop = null;
let busyIds = new Set();

// ==========================================
// HELPERS
// ==========================================

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));

function isAdmin() {
  return Boolean(admin && admin.uid === ADMIN_UID);
}

function validateQuestion(data) {
  if (!data.subject || !data.topic) {
    return "Subject and topic are required.";
  }

  if (!data.question) {
    return "The question text cannot be empty.";
  }

  if (!Array.isArray(data.options) || data.options.length !== 4) {
    return "Exactly four answer options are required.";
  }

  if (data.options.some(option => !option)) {
    return "All four answer options must be completed.";
  }

  if (
    !Number.isInteger(data.answerIndex) ||
    data.answerIndex < 0 ||
    data.answerIndex > 3
  ) {
    return "Select a valid correct answer.";
  }

  if (!data.explanation) {
    return "An explanation is required.";
  }

  if (
    !Number.isInteger(data.difficulty) ||
    data.difficulty < 1 ||
    data.difficulty > 7
  ) {
    return "Difficulty must be a whole number from 1 to 7.";
  }

  return null;
}

function getEditedData(card) {
  const options = [...card.querySelectorAll(".opt")]
    .sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i))
    .map(input => input.value.trim());

  return {
    subject: String(card.dataset.subject || "").trim(),
    topic: String(card.dataset.topic || "").trim(),
    question: card.querySelector(".q").value.trim(),
    options,
    answerIndex: Number(card.querySelector(".answer").value),
    explanation: card.querySelector(".explanation").value.trim(),
    difficulty: Number(card.querySelector(".difficulty").value)
  };
}

async function reserveQuestion(id, action) {
  if (!isAdmin()) {
    throw new Error("Administrator authentication required.");
  }

  const questionRef = ref(database, `pendingQuestions/${id}`);

  const result = await runTransaction(
    questionRef,
    current => {
      if (!current || current.reviewStatus !== "pending_review") {
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
      "This question is no longer available for review. Refresh the queue."
    );
  }

  return result.snapshot.val();
}

async function releaseReservation(id, action) {
  if (!isAdmin()) return;

  const questionRef = ref(database, `pendingQuestions/${id}`);

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

// ==========================================
// PANEL STYLES
// ==========================================

const style = document.createElement("style");

style.textContent = `
#hai-final-review {
  margin:24px 0;
  padding:18px;
  border:1px solid var(--qb-line);
  border-radius:var(--qb-radius);
  background:var(--qb-panel);
}

#hai-final-review .item {
  padding:14px;
  margin:12px 0;
  border:1px solid var(--qb-line);
  border-radius:13px;
}

#hai-final-review textarea,
#hai-final-review input,
#hai-final-review select {
  width:100%;
  margin:5px 0 10px;
  padding:10px;
  background:rgba(5,8,15,.42);
  color:var(--qb-text);
  border:1px solid var(--qb-line);
  border-radius:10px;
  font:inherit;
  font-size:12px;
}

#hai-final-review textarea {
  min-height:70px;
  resize:vertical;
}

#hai-final-review .opts {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
}

#hai-final-review .actions {
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

#hai-final-review .meta {
  font-size:11px;
  color:var(--qb-muted);
  line-height:1.6;
}

#hai-final-review button:disabled {
  opacity:.5;
  cursor:not-allowed;
}

@media(max-width:560px) {
  #hai-final-review .opts {
    grid-template-columns:1fr;
  }
}
`;

document.head.append(style);

// ==========================================
// PANEL CREATION
// ==========================================

const panel = document.createElement("section");

panel.id = "hai-final-review";
panel.hidden = true;

panel.innerHTML = `
  <h2>Final Approval Queue</h2>

  <p>
    Questions here are not visible to students.
    Approve only after checking accuracy, options and explanation.
  </p>

  <p id="final-count" class="meta"></p>

  <div id="final-list"></div>
`;

const workspace = document.querySelector(".workspace");

if (workspace) {
  workspace.insertAdjacentElement("beforebegin", panel);
} else {
  document.querySelector(".page")?.append(panel);
}

const list = panel.querySelector("#final-list");
const count = panel.querySelector("#final-count");

// ==========================================
// RENDER QUEUE
// ==========================================

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

  count.textContent =
    `${entries.length} question(s) waiting for final approval.`;

  if (!entries.length) {
    list.innerHTML = `
      <div class="empty-list">
        The final review queue is empty.
      </div>
    `;
    return;
  }

  list.innerHTML = entries.map(([id, question]) => `
    <article
      class="item"
      data-id="${esc(id)}"
      data-subject="${esc(question.subject || "")}"
      data-topic="${esc(question.topic || "")}"
    >
      <p class="meta">
        ${esc(question.subject || "Subject")} ·
        ${esc(question.topic || "Topic")} ·
        Difficulty ${esc(question.difficulty ?? "?")}/7 ·
        Submitted by ${esc(question.createdBy || "unknown")}
        <br>

        ${
          Array.isArray(question.qualityIssues) &&
          question.qualityIssues.length
            ? `<strong>Quality warnings:</strong>
               ${esc(question.qualityIssues.join(" · "))}`
            : "No automatic quality warnings."
        }
      </p>

      <label>Question</label>
      <textarea class="q">${esc(question.question || "")}</textarea>

      <label>Options</label>

      <div class="opts">
        ${[0, 1, 2, 3].map(index => `
          <textarea
            class="opt"
            data-i="${index}"
          >${esc(question.options?.[index] || "")}</textarea>
        `).join("")}
      </div>

      <label>Correct answer</label>

      <select class="answer">
        ${["A", "B", "C", "D"].map((letter, index) => `
          <option
            value="${index}"
            ${Number(question.answerIndex) === index ? "selected" : ""}
          >
            ${letter}
          </option>
        `).join("")}
      </select>

      <label>Explanation</label>
      <textarea class="explanation">${esc(question.explanation || "")}</textarea>

      <label>Difficulty</label>
      <input
        class="difficulty"
        type="number"
        min="1"
        max="7"
        step="1"
        value="${esc(question.difficulty ?? 1)}"
      >

      <div class="actions">
        <button class="btn save" type="button">
          Save corrections
        </button>

        <button class="btn btn-primary approve" type="button">
          Approve & publish
        </button>

        <button class="btn btn-danger reject" type="button">
          Reject
        </button>
      </div>
    </article>
  `).join("");

  attachActions();
}

// ==========================================
// BUTTON ACTIONS
// ==========================================

function attachActions() {

  // ----------------------------------------
  // SAVE CORRECTIONS
  // ----------------------------------------

  list.querySelectorAll(".save").forEach(button => {
    button.addEventListener("click", async () => {
      if (!isAdmin()) return;

      const card = button.closest("[data-id]");
      const id = card.dataset.id;

      if (busyIds.has(id)) return;

      const data = getEditedData(card);
      const validationError = validateQuestion(data);

      if (validationError) {
        alert(validationError);
        return;
      }

      busyIds.add(id);
      button.disabled = true;

      try {
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
            "This question is no longer pending review. Refresh the queue."
          );
        }

        alert(
          "Corrections saved successfully. The question still awaits final approval."
        );

      } catch (error) {
        alert("Save failed: " + error.message);

      } finally {
        busyIds.delete(id);
        button.disabled = false;
      }
    });
  });

  // ----------------------------------------
  // APPROVE AND PUBLISH
  // ----------------------------------------

  list.querySelectorAll(".approve").forEach(button => {
    button.addEventListener("click", async () => {
      if (!isAdmin()) return;

      const card = button.closest("[data-id]");
      const id = card.dataset.id;

      if (busyIds.has(id)) return;

      if (!confirm(
        "Approve this question and publish it to the student question bank?"
      )) {
        return;
      }

      const edited = getEditedData(card);
      const validationError = validateQuestion(edited);

      if (validationError) {
        alert(validationError);
        return;
      }

      busyIds.add(id);
      button.disabled = true;

      let reserved = false;

      try {
        // First reserve this question.
        const reservedQuestion = await reserveQuestion(
          id,
          "publishing"
        );

        reserved = true;

        const publishedId = push(
          ref(database, "questionBank")
        ).key;

        const now = Date.now();

        const data = {
          ...reservedQuestion,
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

        // Atomic publication, queue removal and review log.
        const patch = {
          [`questionBank/${publishedId}`]: data,

          [`pendingQuestions/${id}`]: null,

          [`publishedReviewLog/${id}`]: {
            queueId: id,
            publishedQuestionId: publishedId,
            publishedAt: now,
            publishedBy: admin.uid,
            sourceDraftId: reservedQuestion.sourceDraftId || null,
            question: data.question
          }
        };

        await update(ref(database), patch);

        reserved = false;

        alert(
          "Approved and published successfully. The question is now available in the question bank."
        );

      } catch (error) {
        console.error("Question publication error:", error);

        if (reserved) {
          try {
            await releaseReservation(id, "publishing");
          } catch (rollbackError) {
            console.error(
              "Reservation rollback error:",
              rollbackError
            );

            alert(
              "Publishing failed, and the review reservation could not be released. Refresh the queue and check the question's status before retrying."
            );

            return;
          }
        }

        alert(
          "Publication failed: " +
          error.message +
          "\n\nThe question should remain in the review queue. Refresh the page to confirm its status."
        );

      } finally {
        busyIds.delete(id);
        button.disabled = false;
      }
    });
  });

  // ----------------------------------------
  // REJECT AND ARCHIVE
  // ----------------------------------------

  list.querySelectorAll(".reject").forEach(button => {
    button.addEventListener("click", async () => {
      if (!isAdmin()) return;

      const card = button.closest("[data-id]");
      const id = card.dataset.id;

      if (busyIds.has(id)) return;

      if (!confirm(
        "Reject this question and archive it? It will not be published."
      )) {
        return;
      }

      busyIds.add(id);
      button.disabled = true;

      let reserved = false;

      try {
        const rejectedQuestion = await reserveQuestion(
          id,
          "rejecting"
        );

        reserved = true;

        const now = Date.now();

        const patch = {
          [`rejectedQuestions/${id}`]: {
            ...rejectedQuestion,
            status: "rejected",
            rejectedAt: now,
            rejectedBy: admin.uid
          },

          [`pendingQuestions/${id}`]: null
        };

        await update(ref(database), patch);

        reserved = false;

        alert("Question rejected and archived.");

      } catch (error) {
        console.error("Question rejection error:", error);

        if (reserved) {
          try {
            await releaseReservation(id, "rejecting");
          } catch (rollbackError) {
            console.error(
              "Rejection rollback error:",
              rollbackError
            );

            alert(
              "Rejection failed, and the reservation could not be released. Refresh the queue and check its status."
            );

            return;
          }
        }

        alert("Reject failed: " + error.message);

      } finally {
        busyIds.delete(id);
        button.disabled = false;
      }
    });
  });
}

// ==========================================
// AUTHENTICATION AND QUEUE LISTENER
// ==========================================

onAuthStateChanged(auth, user => {
  admin = user && user.uid === ADMIN_UID
    ? user
    : null;

  if (!isAdmin()) {
    panel.hidden = true;

    if (stop) {
      stop();
      stop = null;
    }

    queue = {};
    busyIds.clear();

    return;
  }

  panel.hidden = false;

  if (stop) {
    stop();
    stop = null;
  }

  stop = onValue(
    ref(database, "pendingQuestions"),
    snapshot => {
      queue = snapshot.val() || {};
      render();
    },
    error => {
      count.textContent =
        "Queue loading error: " + error.message;
    }
  );
});