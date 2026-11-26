
/* Hysteria's Cure — HAI Generated Draft Review */

import { auth, database } from "./firebase-client.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  ref,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const API =
  "https://hai-api-l7js.onrender.com/questions/pending/batch";

let admin = null;
let drafts = {};
let busy = false;
let stopDraftListener = null;

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const style = document.createElement("style");

style.textContent = `
#hai-draft-review{
  margin:28px 0;
  border:1px solid var(--qb-line);
  border-radius:var(--qb-radius);
  background:var(--qb-panel);
  padding:clamp(16px,3vw,24px)
}

#hai-draft-review .draft-toolbar{
  display:flex;
  gap:9px;
  flex-wrap:wrap;
  margin:14px 0
}

#hai-draft-review .draft-card{
  border:1px solid var(--qb-line);
  border-radius:14px;
  padding:15px;
  margin:12px 0;
  background:rgba(255,255,255,.025)
}

#hai-draft-review textarea,
#hai-draft-review input,
#hai-draft-review select{
  width:100%;
  margin:5px 0 12px;
  background:rgba(5,8,15,.42);
  color:var(--qb-text);
  border:1px solid var(--qb-line);
  border-radius:10px;
  padding:10px;
  font:inherit;
  font-size:12px
}

#hai-draft-review textarea{
  min-height:78px;
  resize:vertical
}

#hai-draft-review label{
  display:block;
  font-size:11px;
  font-weight:700;
  margin-top:8px
}

#hai-draft-review .draft-options{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px
}

#hai-draft-review .draft-actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap
}

#hai-draft-review .draft-approved{
  border-color:rgba(121,217,173,.45)
}

#hai-draft-review .draft-meta{
  color:var(--qb-muted);
  font-size:11px;
  line-height:1.6;
  overflow-wrap:anywhere
}

#hai-draft-review .draft-message{
  font-size:12px;
  line-height:1.6;
  min-height:18px
}

#hai-draft-review .clear-drafts{
  border-color:rgba(220,80,80,.5)
}

@media(max-width:560px){
  #hai-draft-review .draft-options{
    grid-template-columns:1fr
  }
}
`;

document.head.append(style);

const panel = document.createElement("section");

panel.id = "hai-draft-review";

panel.innerHTML = `
  <div class="panel-head">
    <div>
      <h2>HAI Generated Questions</h2>
      <p>
        Private generated drafts. Review and edit before
        sending them to the pending review queue.
      </p>
    </div>
  </div>

  <p id="hai-draft-count" class="draft-meta">
    Waiting for drafts…
  </p>

  <div class="draft-toolbar">

    <button class="btn" id="hai-approve-all" type="button">
      Approve all drafts
    </button>

    <button class="btn" id="hai-unapprove-all" type="button">
      Unapprove all
    </button>

    <button
      class="btn btn-primary"
      id="hai-submit-approved"
      type="button"
      disabled
    >
      Submit approved questions
    </button>

    <button
      class="btn btn-danger clear-drafts"
      id="hai-clear-drafts"
      type="button"
    >
      Clear Pending Drafts
    </button>

  </div>

  <p
    id="hai-draft-message"
    class="draft-message"
    role="status"
    aria-live="polite"
  ></p>

  <div id="hai-draft-list"></div>
`;

const library = document.querySelector(".library-card");

if (library) {
  library.insertAdjacentElement("afterend", panel);
} else {
  document.querySelector(".page")?.prepend(panel);
}

const list = panel.querySelector("#hai-draft-list");
const count = panel.querySelector("#hai-draft-count");

const message = panel.querySelector("#hai-draft-message");

const submit = panel.querySelector("#hai-submit-approved");

const clearButton =
  panel.querySelector("#hai-clear-drafts");

const setMessage = (txt, err = false) => {
  message.textContent = txt;

  message.className =
    `draft-message ${err ? "error" : "success"}`;
};

const isAdmin = () =>
  !!admin &&
  auth.currentUser?.uid === ADMIN_UID &&
  admin.uid === ADMIN_UID;

/*
 * Only drafts that have not been submitted or deleted
 * are eligible for approval and submission.
 */

function pendingDraftEntries() {
  return Object.entries(drafts).filter(
    ([, d]) =>
      d &&
      d.status !== "submitted" &&
      d.status !== "deleted"
  );
}

function approvedDrafts() {
  return pendingDraftEntries().filter(
    ([, d]) => d.approved === true
  );
}

function refreshCount() {
  const all = Object.values(drafts).filter(Boolean);

  const pending = all.filter(
    d =>
      d.status !== "submitted" &&
      d.status !== "deleted"
  );

  const approved = pending.filter(
    d => d.approved === true
  );

  const submitted = all.filter(
    d => d.status === "submitted"
  );

  count.textContent =
    `${pending.length} pending draft(s) · ` +
    `${approved.length} approved · ` +
    `${submitted.length} submitted`;

  submit.disabled =
    !approved.length || busy || !isAdmin();

  clearButton.disabled =
    !pending.length || busy || !isAdmin();

  submit.textContent =
    `Submit ${approved.length} approved question` +
    `${approved.length === 1 ? "" : "s"}`;

  clearButton.textContent =
    `Clear Pending Drafts (${pending.length})`;
}

function validDraft(d) {
  return (
    typeof d.question === "string" &&
    d.question.trim() &&

    Array.isArray(d.options) &&
    d.options.length === 4 &&
    d.options.every(o => String(o).trim()) &&

    Number.isInteger(Number(d.answerIndex)) &&
    Number(d.answerIndex) >= 0 &&
    Number(d.answerIndex) <= 3 &&

    typeof d.explanation === "string" &&
    d.explanation.trim() &&

    Number.isInteger(Number(d.difficulty)) &&
    Number(d.difficulty) >= 1 &&
    Number(d.difficulty) <= 7
  );
}

/*
 * Render only active, unsubmitted drafts.
 *
 * Submitted questions are deliberately hidden here.
 * They remain stored for reference, but their submitted
 * copies are handled by the separate Final Approval Queue.
 */

function render() {
  const entries = pendingDraftEntries()
    .sort((a, b) =>
      (b[1].createdAt || 0) -
      (a[1].createdAt || 0)
    );

  if (!entries.length) {
    list.innerHTML = `
      <div class="empty-list">
        No pending HAI drafts.
        Generate candidates in HAI Studio.
      </div>
    `;

    refreshCount();
    return;
  }

  list.innerHTML = entries.map(([id, d]) => {
    const approved = d.approved === true;

    const options = Array.isArray(d.options)
      ? d.options.slice(0, 4)
      : [];

    const letters = ["A", "B", "C", "D"];

    return `
      <article
        class="draft-card ${approved ? "draft-approved" : ""}"
        data-id="${esc(id)}"
      >

        <div class="draft-meta">

          <strong>
            ${esc(d.subject || "Unspecified subject")}
          </strong>

          · ${esc(d.topic || "Unspecified topic")}

          · Difficulty ${esc(d.difficulty ?? "?")}/7

          <br>

          Source:
          ${esc(d.document || d.sourceDetails || "HAI generation")}

          ${d.chapter
            ? `· Chapter: ${esc(d.chapter)}`
            : ""
          }

        </div>

        <label>
          <input
            class="draft-approval"
            type="checkbox"
            ${approved ? "checked" : ""}
            style="width:auto;margin-right:7px"
          >
          Approve for submission
        </label>

        <label>Question</label>

        <textarea class="draft-question">${esc(d.question || "")}</textarea>

        <label>Options</label>

        <div class="draft-options">

          ${letters.map((letter, i) => `
            <div>
              <label>Option ${letter}</label>

              <textarea
                class="draft-option"
                data-index="${i}"
              >${esc(options[i] || "")}</textarea>
            </div>
          `).join("")}

        </div>

        <label>Correct answer</label>

        <select class="draft-answer">

          ${letters.map((letter, i) => `
            <option
              value="${i}"
              ${Number(d.answerIndex) === i ? "selected" : ""}
            >
              ${letter}
            </option>
          `).join("")}

        </select>

        <label>Explanation</label>

        <textarea class="draft-explanation">${esc(d.explanation || "")}</textarea>

        <label>Difficulty (1–7)</label>

        <input
          class="draft-difficulty"
          type="number"
          min="1"
          max="7"
          step="1"
          value="${esc(d.difficulty ?? 1)}"
        >

        <label>Source details</label>

        <input
          class="draft-source"
          value="${esc(d.sourceDetails || "")}"
        >

        <label>Syllabus objective</label>

        <input
          class="draft-objective"
          value="${esc(d.syllabusObjective || "")}"
        >

        <div class="draft-actions">

          <button
            type="button"
            class="btn btn-primary draft-save"
          >
            Save edits
          </button>

          <button
            type="button"
            class="btn draft-delete"
          >
            Delete draft
          </button>

        </div>

      </article>
    `;
  }).join("");

  /*
   * Individual approval.
   */

  list.querySelectorAll(".draft-approval")
    .forEach(input => {
      input.addEventListener("change", async () => {
        if (!isAdmin()) return;

        const id = input.closest(".draft-card").dataset.id;

        try {
          await update(
            ref(database, `haiQuestionDrafts/${id}`),
            {
              approved: input.checked,
              updatedAt: Date.now()
            }
          );

          setMessage(
            input.checked
              ? "Draft approved for submission."
              : "Approval removed."
          );

        } catch (e) {
          input.checked = !input.checked;

          setMessage(
            `Could not update approval: ${e.message}`,
            true
          );
        }
      });
    });

  /*
   * Save draft edits.
   */

  list.querySelectorAll(".draft-save")
    .forEach(button => {
      button.addEventListener("click", async () => {
        if (!isAdmin()) return;

        const card = button.closest(".draft-card");
        const id = card.dataset.id;

        const opts = [
          ...card.querySelectorAll(".draft-option")
        ]
          .sort((a, b) =>
            Number(a.dataset.index) -
            Number(b.dataset.index)
          )
          .map(x => x.value.trim());

        const data = {
          question:
            card.querySelector(".draft-question").value.trim(),

          options: opts,

          answerIndex:
            Number(card.querySelector(".draft-answer").value),

          explanation:
            card.querySelector(".draft-explanation").value.trim(),

          difficulty:
            Number(card.querySelector(".draft-difficulty").value),

          sourceDetails:
            card.querySelector(".draft-source").value.trim(),

          syllabusObjective:
            card.querySelector(".draft-objective").value.trim(),

          updatedAt: Date.now()
        };

        if (!validDraft(data)) {
          setMessage(
            "Check the question, all four options, correct answer, explanation and difficulty.",
            true
          );

          return;
        }

        button.disabled = true;
        button.textContent = "Saving…";

        try {
          await update(
            ref(database, `haiQuestionDrafts/${id}`),
            data
          );

          setMessage("Draft edits saved.");

        } catch (e) {
          setMessage(
            `Save failed: ${e.message}`,
            true
          );

        } finally {
          button.disabled = false;
          button.textContent = "Save edits";
        }
      });
    });

  /*
   * Individual soft deletion.
   */

  list.querySelectorAll(".draft-delete")
    .forEach(button => {
      button.addEventListener("click", async () => {
        if (!isAdmin()) return;

        const id = button.closest(".draft-card").dataset.id;

        if (!confirm("Delete this HAI draft?")) return;

        try {
          await update(
            ref(database, `haiQuestionDrafts/${id}`),
            {
              status: "deleted",
              deletedAt: Date.now(),
              approved: false
            }
          );

          setMessage("Draft deleted.");

        } catch (e) {
          setMessage(
            `Could not delete draft: ${e.message}`,
            true
          );
        }
      });
    });

  refreshCount();
}

/*
 * Approve all active pending drafts.
 */

panel.querySelector("#hai-approve-all")
  .addEventListener("click", async () => {
    if (!isAdmin() || busy) return;

    const patch = {};

    pendingDraftEntries().forEach(([id]) => {
      patch[`haiQuestionDrafts/${id}/approved`] = true;
    });

    if (!Object.keys(patch).length) {
      setMessage("No drafts available to approve.");
      return;
    }

    try {
      await update(ref(database), patch);

      setMessage(
        "All current pending drafts approved for submission."
      );

    } catch (e) {
      setMessage(
        `Bulk approval failed: ${e.message}`,
        true
      );
    }
  });

/*
 * Unapprove all active pending drafts.
 */

panel.querySelector("#hai-unapprove-all")
  .addEventListener("click", async () => {
    if (!isAdmin() || busy) return;

    const patch = {};

    pendingDraftEntries().forEach(([id]) => {
      patch[`haiQuestionDrafts/${id}/approved`] = false;
    });

    if (!Object.keys(patch).length) {
      setMessage("No pending drafts to update.");
      return;
    }

    try {
      await update(ref(database), patch);

      setMessage("All pending draft approvals cleared.");

    } catch (e) {
      setMessage(
        `Could not clear approvals: ${e.message}`,
        true
      );
    }
  });

/*
 * CLEAR PENDING DRAFTS — BULK CLEANUP
 *
 * This operation only changes records under:
 * haiQuestionDrafts
 *
 * It does not touch:
 * pendingQuestions
 *
 * Submitted questions are preserved.
 */

clearButton.addEventListener("click", async () => {
  if (!isAdmin() || busy) return;

  const pending = pendingDraftEntries();

  if (!pending.length) {
    setMessage("There are no pending drafts to clear.");
    return;
  }

  const confirmed = confirm(
    `Clear all ${pending.length} pending HAI draft(s)?\n\n` +
    "This includes approved drafts that have not been submitted.\n\n" +
    "Submitted questions in the Final Approval Queue will NOT be affected."
  );

  if (!confirmed) return;

  busy = true;
  refreshCount();

  clearButton.disabled = true;
  clearButton.textContent = "Clearing drafts…";

  try {
    const now = Date.now();
    const patch = {};

    pending.forEach(([id]) => {
      patch[`haiQuestionDrafts/${id}/status`] = "deleted";
      patch[`haiQuestionDrafts/${id}/approved`] = false;
      patch[`haiQuestionDrafts/${id}/deletedAt`] = now;
      patch[`haiQuestionDrafts/${id}/updatedAt`] = now;
    });

    await update(ref(database), patch);

    setMessage(
      `${pending.length} pending draft(s) cleared. ` +
      "Submitted questions and the Final Approval Queue were left untouched."
    );

  } catch (e) {
    setMessage(
      `Could not clear pending drafts: ${e.message}`,
      true
    );

  } finally {
    busy = false;
    render();
  }
});

/*
 * Submit approved questions to the separate
 * Final Approval Queue.
 */

submit.addEventListener("click", async () => {
  if (busy || !isAdmin()) return;

  const chosen = approvedDrafts();

  if (!chosen.length) return;

  for (const [, d] of chosen) {
    if (!validDraft(d)) {
      setMessage(
        `Draft "${d.question?.slice(0, 60) || "Untitled"}" is incomplete. Save and correct it first.`,
        true
      );

      return;
    }
  }

  busy = true;
  refreshCount();
  submit.textContent = "Submitting…";

  try {
    const token =
      await auth.currentUser.getIdToken(true);

    const payload = chosen.map(([, d]) => ({
      subject:
        String(d.subject || "Unspecified").slice(0, 100),

      topic:
        String(d.topic || "Unspecified").slice(0, 200),

      question: d.question.trim(),

      difficulty: Number(d.difficulty),

      options:
        d.options.map(o => String(o).trim()),

      answerIndex: Number(d.answerIndex),

      explanation: d.explanation.trim(),

      sourceDetails:
        String(
          d.sourceDetails ||
          `Generated from ${d.document || "textbook"}`
        ),

      syllabusObjective:
        String(d.syllabusObjective || "")
    }));

    const response = await fetch(API, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },

      body: JSON.stringify({
        questions: payload
      })
    });

    let result = {};

    try {
      result = await response.json();
    } catch {
      // Leave result empty if the response is not JSON.
    }

    if (!response.ok) {
      throw new Error(
        result.detail ||
        result.message ||
        `Server returned ${response.status}`
      );
    }

    if (result.submitted_count !== payload.length) {
      throw new Error(
        "API did not confirm that all selected questions were submitted."
      );
    }

    /*
     * Mark submitted drafts only after the API confirms
     * successful submission.
     */

    const now = Date.now();
    const patch = {};

    chosen.forEach(([id]) => {
      patch[`haiQuestionDrafts/${id}/status`] = "submitted";
      patch[`haiQuestionDrafts/${id}/approved`] = false;
      patch[`haiQuestionDrafts/${id}/submittedAt`] = now;
      patch[`haiQuestionDrafts/${id}/updatedAt`] = now;
    });

    await update(ref(database), patch);

    setMessage(
      `${result.submitted_count} question(s) submitted to the Final Approval Queue. They are not published.`
    );

  } catch (e) {
    setMessage(
      `Submission failed: ${e.message}`,
      true
    );

  } finally {
    busy = false;
    render();
  }
});

/*
 * Administrator authentication and draft listener.
 */

onAuthStateChanged(auth, user => {
  admin =
    user && user.uid === ADMIN_UID
      ? user
      : null;

  if (!admin) {
    panel.hidden = true;

    if (stopDraftListener) {
      stopDraftListener();
      stopDraftListener = null;
    }

    return;
  }

  panel.hidden = false;

  if (stopDraftListener) {
    stopDraftListener();
  }

  stopDraftListener = onValue(
    ref(database, "haiQuestionDrafts"),

    snapshot => {
      drafts = snapshot.val() || {};
      render();
    },

    error => {
      setMessage(
        `Draft loading failed: ${error.message}`,
        true
      );
    }
  );
});
