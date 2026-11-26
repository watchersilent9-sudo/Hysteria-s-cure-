
/* HAI Final Approval Queue
   - Separates new and older pending submissions.
   - Allows searching and editing.
   - Preserves approval, publishing and rejection workflows.
   - Allows the administrator to clear the pendingQuestions collection.
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
  remove
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";


const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

let admin = null;
let queue = {};
let stop = null;

const busyIds = new Set();


/* -----------------------------
   Helpers
----------------------------- */

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

const timestampOf = question =>
  Number(
    question?.submittedAt ||
    question?.createdAt ||
    question?.updatedAt ||
    0
  );

const dateLabel = timestamp =>
  timestamp
    ? new Date(timestamp).toLocaleString()
    : "Submission date unavailable";


/* -----------------------------
   Styling
----------------------------- */

const style = document.createElement("style");

style.textContent = `

#hai-final-review {
  margin: 24px 0;
  padding: 18px;
  border: 1px solid var(--qb-line, #394052);
  border-radius: var(--qb-radius, 16px);
  background: var(--qb-panel, #171c28);
  color: #f4f6fb;
}

#hai-final-review h2 {
  margin: 0 0 8px;
  color: #ffffff;
}

#hai-final-review p {
  color: #e7eaf1;
}

#hai-final-review .toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin: 14px 0;
}

#hai-final-review .toolbar input {
  flex: 1;
  min-width: 190px;
}

#hai-final-review input,
#hai-final-review textarea,
#hai-final-review select {
  width: 100%;
  margin: 5px 0 10px;
  padding: 10px;
  background: #101622;
  color: #ffffff;
  border: 1px solid #485268;
  border-radius: 10px;
  font: inherit;
  font-size: 13px;
}

#hai-final-review textarea {
  min-height: 70px;
  resize: vertical;
}

#hai-final-review label {
  display: block;
  color: #ffffff;
  font-weight: 600;
  font-size: 13px;
}

#hai-final-review .opts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

#hai-final-review .actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

#hai-final-review button {
  cursor: pointer;
}

#hai-final-review button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

#hai-final-review .meta {
  font-size: 12px;
  color: #c4ccda;
  line-height: 1.7;
}

#hai-final-review .queue-group {
  margin-top: 22px;
}

#hai-final-review .group-heading {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  border-bottom: 1px solid #485268;
  padding-bottom: 8px;
}

#hai-final-review .group-heading h3 {
  margin: 0;
  color: #ffffff;
  font-size: 15px;
}

#hai-final-review .item {
  padding: 15px;
  margin: 12px 0;
  border: 1px solid #485268;
  border-left: 4px solid #64748b;
  border-radius: 13px;
  background: #202938;
  color: #ffffff;
}

#hai-final-review .item.is-new {
  border-left-color: #22c55e;
  background: #172c28;
}

#hai-final-review .item .meta {
  color: #d2d9e5;
}

#hai-final-review .new-tag {
  display: inline-block;
  padding: 4px 9px;
  border-radius: 999px;
  background: #14532d;
  color: #dcfce7;
  font-size: 11px;
  font-weight: 700;
}

#hai-final-review .old-tag {
  display: inline-block;
  padding: 4px 9px;
  border-radius: 999px;
  background: #334155;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
}

#hai-final-review .danger-button {
  background: #991b1b;
  color: #ffffff;
  border: 1px solid #dc2626;
  border-radius: 9px;
  padding: 10px 12px;
}

#hai-final-review .empty-list {
  padding: 14px;
  color: #e7eaf1;
}

@media(max-width:560px) {
  #hai-final-review {
    padding: 13px;
  }

  #hai-final-review .opts {
    grid-template-columns: 1fr;
  }
}

`;

document.head.append(style);


/* -----------------------------
   Queue interface
----------------------------- */

const panel = document.createElement("section");

panel.id = "hai-final-review";
panel.hidden = true;

panel.innerHTML = `

  <h2>Final Approval Queue</h2>

  <p>
    Questions here are not visible to students
    until they have been approved and published.
  </p>

  <p id="final-count" class="meta" aria-live="polite"></p>

  <div class="toolbar">

    <input
      id="final-search"
      type="search"
      placeholder="Search questions, subjects or topics..."
      aria-label="Search pending questions"
    >

    <button
      id="clear-pending"
      class="danger-button"
      type="button"
    >
      Delete All Pending Questions
    </button>

  </div>

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
const search = panel.querySelector("#final-search");
const clearButton = panel.querySelector("#clear-pending");


/* -----------------------------
   Question card
----------------------------- */

function makeCard(id, question, isNew) {

  return `

    <article
      class="item ${isNew ? "is-new" : ""}"
      data-id="${esc(id)}"
    >

      <p class="meta">

        ${
          isNew
            ? '<span class="new-tag">NEW · LAST 24 HOURS</span>'
            : '<span class="old-tag">OLDER SUBMISSION</span>'
        }

        <br>

        ${esc(question.subject || "Subject")}
        ·
        ${esc(question.topic || "Topic")}
        ·
        Difficulty ${esc(question.difficulty || "?")}/7

        <br>

        Submitted by ${esc(question.createdBy || "unknown")}

        <br>

        ${esc(dateLabel(timestampOf(question)))}

        <br>

        ${
          (question.qualityIssues || []).length
            ? `<strong>Quality warnings:</strong> ${esc(question.qualityIssues.join(" · "))}`
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
            aria-label="Option ${"ABCD"[index]}"
          >${esc(question.options?.[index] || "")}</textarea>

        `).join("")}

      </div>

      <label>Correct Answer</label>

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
        value="${esc(question.difficulty || 1)}"
      >

      <div class="actions">

        <button class="btn save" type="button">
          Save Corrections
        </button>

        <button class="btn btn-primary approve" type="button">
          Approve &amp; Publish
        </button>

        <button class="btn btn-danger reject" type="button">
          Reject
        </button>

      </div>

    </article>

  `;
}


/* -----------------------------
   Render queue
----------------------------- */

function render() {

  const entries = Object.entries(queue)

    .filter(([id, question]) =>
      question &&
      question.reviewStatus === "pending_review"
    )

    .sort((a, b) =>
      timestampOf(b[1]) - timestampOf(a[1])
    );

  const term = search.value.trim().toLowerCase();

  const filtered = entries.filter(([id, question]) => {

    if (!term) return true;

    const searchable = [
      question.question,
      question.subject,
      question.topic,
      question.explanation,
      ...(question.options || [])
    ];

    return searchable.some(value =>
      String(value || "").toLowerCase().includes(term)
    );

  });

  const now = Date.now();

  const fresh = filtered.filter(([id, question]) => {

    const timestamp = timestampOf(question);

    return timestamp > 0 &&
      now - timestamp <= NEW_WINDOW_MS;

  });

  const older = filtered.filter(([id, question]) => {

    const timestamp = timestampOf(question);

    return !(
      timestamp > 0 &&
      now - timestamp <= NEW_WINDOW_MS
    );

  });

  count.textContent =
    `${entries.length} pending question(s) · ` +
    `${fresh.length} new in the last 24 hours · ` +
    `${entries.length - fresh.length} older` +
    (term ? ` · ${filtered.length} search result(s)` : "");

  if (!filtered.length) {

    list.innerHTML = `

      <div class="empty-list">

        ${
          entries.length
            ? "No pending questions match your search."
            : "The final review queue is empty."
        }

      </div>

    `;

    return;
  }

  function renderGroup(title, items, isNew) {

    if (!items.length) return "";

    return `

      <section class="queue-group">

        <div class="group-heading">

          <h3>${title}</h3>

          <span class="meta">${items.length} question(s)</span>

        </div>

        ${items.map(([id, question]) =>
          makeCard(id, question, isNew)
        ).join("")}

      </section>

    `;
  }

  list.innerHTML =

    renderGroup("New Submissions", fresh, true) +

    renderGroup("Previously Pending", older, false);

  attachCardActions();

}


/* -----------------------------
   Card actions
----------------------------- */

function attachCardActions() {


  /* Save corrections */

  list.querySelectorAll(".save").forEach(button => {

    button.addEventListener("click", async () => {

      if (!admin) return;

      const card = button.closest("[data-id]");
      const id = card.dataset.id;

      const options = [...card.querySelectorAll(".opt")]

        .sort((a, b) =>
          Number(a.dataset.i) - Number(b.dataset.i)
        )

        .map(input => input.value.trim());

      const data = {

        question: card.querySelector(".q").value.trim(),

        options,

        answerIndex: Number(
          card.querySelector(".answer").value
        ),

        explanation: card.querySelector(".explanation").value.trim(),

        difficulty: Number(
          card.querySelector(".difficulty").value
        ),

        updatedAt: Date.now(),

        reviewStatus: "pending_review",

        verified: false

      };

      if (
        !data.question ||
        options.length !== 4 ||
        options.some(option => !option) ||
        !data.explanation ||
        data.difficulty < 1 ||
        data.difficulty > 7
      ) {

        alert("Complete all fields and options before saving.");

        return;

      }

      button.disabled = true;

      try {

        await update(
          ref(database, `pendingQuestions/${id}`),
          data
        );

        alert("Corrections saved. The question still awaits final approval.");

      } catch (error) {

        alert("Save failed: " + error.message);

      } finally {

        button.disabled = false;

      }

    });

  });


  /* Approve and publish */

  list.querySelectorAll(".approve").forEach(button => {

    button.addEventListener("click", async () => {

      if (!admin) return;

      const card = button.closest("[data-id]");
      const id = card.dataset.id;

      if (busyIds.has(id)) return;

      const question = queue[id];

      if (!question) return;

      busyIds.add(id);
      button.disabled = true;

      try {

        const options = [...card.querySelectorAll(".opt")]

          .sort((a, b) =>
            Number(a.dataset.i) - Number(b.dataset.i)
          )

          .map(input => input.value.trim());

        const publishedId =
          push(ref(database, "questionBank")).key;

        const now = Date.now();

        const data = {

          ...question,

          question: card.querySelector(".q").value.trim(),

          options,

          answerIndex: Number(
            card.querySelector(".answer").value
          ),

          explanation: card.querySelector(".explanation").value.trim(),

          difficulty: Number(
            card.querySelector(".difficulty").value
          ),

          id: publishedId,

          verified: true,

          reviewStatus: "published",

          approvedAt: now,

          approvedBy: admin.uid,

          updatedAt: now

        };

        if (
          !data.question ||
          options.length !== 4 ||
          options.some(option => !option) ||
          !data.explanation ||
          data.difficulty < 1 ||
          data.difficulty > 7
        ) {

          throw new Error(
            "Please correct incomplete fields first."
          );

        }

        const patch = {

          [`questionBank/${publishedId}`]: data,

          [`pendingQuestions/${id}`]: null,

          [`publishedReviewLog/${id}`]: {

            queueId: id,

            publishedQuestionId: publishedId,

            publishedAt: now,

            publishedBy: admin.uid,

            sourceDraftId: question.sourceDraftId || null,

            question: data.question

          }

        };

        await update(ref(database), patch);

        alert(
          "Approved and published. It is now available in the student question bank."
        );

      } catch (error) {

        alert("Publish failed: " + error.message);

      } finally {

        busyIds.delete(id);

        button.disabled = false;

      }

    });

  });


  /* Reject and archive */

  list.querySelectorAll(".reject").forEach(button => {

    button.addEventListener("click", async () => {

      if (!admin) return;

      const id = button.closest("[data-id]").dataset.id;

      if (!confirm("Reject this question and archive it?")) {
        return;
      }

      try {

        const now = Date.now();

        await update(ref(database), {

          [`rejectedQuestions/${id}`]: {

            ...queue[id],

            status: "rejected",

            rejectedAt: now,

            rejectedBy: admin.uid

          },

          [`pendingQuestions/${id}`]: null

        });

        alert("Question rejected and archived.");

      } catch (error) {

        alert("Reject failed: " + error.message);

      }

    });

  });

}


/* -----------------------------
   Search
----------------------------- */

search.addEventListener("input", render);


/* -----------------------------
   Delete all pending questions
----------------------------- */

clearButton.addEventListener("click", async () => {

  if (!admin) return;

  const total = Object.keys(queue || {}).length;

  if (!total) {

    alert("The pending queue is already empty.");

    return;

  }

  const confirmation = prompt(

    `This permanently deletes all ${total} entries under pendingQuestions.\n\n` +

    "It does NOT delete published questions, HAI drafts, " +

    "or rejected-question archives.\n\n" +

    "Type DELETE to continue:"

  );

  if (confirmation !== "DELETE") {

    alert("Deletion cancelled.");

    return;

  }

  clearButton.disabled = true;

  try {

    await remove(ref(database, "pendingQuestions"));

    alert(
      `Deleted all ${total} entries from the pending queue.`
    );

  } catch (error) {

    alert(
      "Could not clear the pending queue: " + error.message
    );

  } finally {

    clearButton.disabled = false;

  }

});


/* -----------------------------
   Administrator authentication
----------------------------- */

onAuthStateChanged(auth, user => {

  admin =
    user && user.uid === ADMIN_UID
      ? user
      : null;

  if (!admin) {

    panel.hidden = true;

    if (stop) {

      stop();
      stop = null;

    }

    queue = {};

    return;

  }

  panel.hidden = false;

  if (stop) stop();

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
 
