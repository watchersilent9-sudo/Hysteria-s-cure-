
// HAI Generated Draft Review — Hysteria's Cure
// Complete replacement: js/hai-draft-review.js

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

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const style = document.createElement("style");

style.textContent = `
#hai-draft-review {
  margin: 28px 0;
  border: 1px solid var(--qb-line);
  border-radius: var(--qb-radius);
  background: var(--qb-panel);
  padding: clamp(16px, 3vw, 24px);
}

#hai-draft-review .draft-toolbar,
#hai-draft-review .draft-actions {
  display:flex;
  gap:9px;
  flex-wrap:wrap;
  margin:14px 0;
}

#hai-draft-review .draft-card {
  border:1px solid var(--qb-line);
  border-radius:14px;
  padding:15px;
  margin:12px 0;
  background:rgba(255,255,255,.025);
}

#hai-draft-review .draft-card.submitted {
  opacity:.72;
}

#hai-draft-review textarea,
#hai-draft-review input:not([type=checkbox]),
#hai-draft-review select {
  width:100%;
  margin:5px 0 12px;
  background:rgba(5,8,15,.42);
  color:var(--qb-text);
  border:1px solid var(--qb-line);
  border-radius:10px;
  padding:10px;
  font:inherit;
  font-size:12px;
}

#hai-draft-review textarea {
  min-height:78px;
  resize:vertical;
}

#hai-draft-review label {
  display:block;
  font-size:11px;
  font-weight:700;
  margin-top:8px;
}

#hai-draft-review .draft-options {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
}

#hai-draft-review .draft-meta {
  color:var(--qb-muted);
  font-size:11px;
  line-height:1.6;
  overflow-wrap:anywhere;
}

#hai-draft-review .draft-message {
  font-size:12px;
  line-height:1.6;
  min-height:18px;
}

@media(max-width:560px) {
  #hai-draft-review .draft-options {
    grid-template-columns:1fr;
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
        Private drafts. Review and edit before sending
        them to the pending queue.
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

    <button class="btn btn-primary"
      id="hai-submit-approved"
      type="button"
      disabled>
      Submit approved questions
    </button>
  </div>

  <p id="hai-draft-message"
    class="draft-message"
    role="status"
    aria-live="polite"></p>

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

function setMessage(text, error = false) {
  message.textContent = text;
  message.className =
    `draft-message ${error ? "error" : "success"}`;
}

function isAdmin() {
  return Boolean(
    admin &&
    admin.uid === ADMIN_UID &&
    auth.currentUser?.uid === ADMIN_UID
  );
}

function isReviewable(draft) {
  return draft &&
    draft.status !== "submitted" &&
    draft.status !== "deleted" &&
    draft.status !== "submitting";
}

function approvedDrafts() {
  return Object.entries(drafts).filter(
    ([, draft]) =>
      isReviewable(draft) &&
      draft.approved === true
  );
}

function refreshCount() {
  const all = Object.values(drafts).filter(Boolean);

  const pending = all.filter(isReviewable);

  const approved = pending.filter(
    draft => draft.approved === true
  );

  const submitted = all.filter(
    draft => draft.status === "submitted"
  );

  const submitting = all.filter(
    draft => draft.status === "submitting"
  );

  count.textContent =
    `${pending.length} draft(s) awaiting review · ` +
    `${approved.length} approved · ` +
    `${submitted.length} submitted · ` +
    `${submitting.length} submitting`;

  submit.disabled =
    !approved.length ||
    busy ||
    !isAdmin();

  submit.textContent =
    `Submit ${approved.length} approved question` +
    `${approved.length === 1 ? "" : "s"}`;
}

function validDraft(draft) {
  return (
    typeof draft.question === "string" &&
    draft.question.trim().length > 0 &&

    Array.isArray(draft.options) &&
    draft.options.length === 4 &&
    draft.options.every(
      option =>
        typeof option === "string" &&
        option.trim().length > 0
    ) &&

    Number.isInteger(Number(draft.answerIndex)) &&
    Number(draft.answerIndex) >= 0 &&
    Number(draft.answerIndex) <= 3 &&

    typeof draft.explanation === "string" &&
    draft.explanation.trim().length > 0 &&

    Number.isInteger(Number(draft.difficulty)) &&
    Number(draft.difficulty) >= 1 &&
    Number(draft.difficulty) <= 7
  );
}

function render() {
  if (!isAdmin()) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;

  const entries = Object.entries(drafts)
    .filter(([, draft]) =>
      draft &&
      typeof draft === "object" &&
      draft.status !== "deleted"
    )
    .sort((a, b) =>
      Number(b[1].createdAt || 0) -
      Number(a[1].createdAt || 0)
    );

  if (!entries.length) {
    list.innerHTML = `
      <div class="empty-list">
        No HAI-generated drafts yet.
        Generate candidates in HAI Studio.
      </div>
    `;

    refreshCount();
    return;
  }

  const letters = ["A", "B", "C", "D"];

  list.innerHTML = entries.map(([id, draft]) => {
    const submitted =
      draft.status === "submitted" ||
      draft.status === "submitting";

    const approved = draft.approved === true;

    const options = Array.isArray(draft.options)
      ? draft.options.slice(0, 4)
      : [];

    return `
      <article
        class="draft-card
          ${approved ? "draft-approved" : ""}
          ${draft.status === "submitted" ? "submitted" : ""}"
        data-id="${esc(id)}">

        <div class="draft-meta">
          <strong>${esc(draft.subject || "Unspecified subject")}</strong>
          · ${esc(draft.topic || "Unspecified topic")}
          · Difficulty ${esc(draft.difficulty ?? "?")}/7
          · ${esc(draft.status || "Draft")}

          <br>

          Source:
          ${esc(draft.document || draft.sourceDetails || "HAI generation")}

          ${draft.chapter
            ? `· Chapter: ${esc(draft.chapter)}`
            : ""}
        </div>

        <label>
          <input class="draft-approval"
            type="checkbox"
            ${approved ? "checked" : ""}
            ${submitted ? "disabled" : ""}
            style="width:auto;margin-right:7px">

          Approve for submission
        </label>

        <label>Question</label>

        <textarea class="draft-question"
          ${submitted ? "disabled" : ""}>${esc(draft.question || "")}</textarea>

        <label>Options</label>

        <div class="draft-options">
          ${letters.map((letter, index) => `
            <div>
              <label>Option ${letter}</label>
              <textarea class="draft-option"
                data-index="${index}"
                ${submitted ? "disabled" : ""}>${esc(options[index] || "")}</textarea>
            </div>
          `).join("")}
        </div>

        <label>Correct answer</label>

        <select class="draft-answer"
          ${submitted ? "disabled" : ""}>
          ${letters.map((letter, index) => `
            <option value="${index}"
              ${Number(draft.answerIndex) === index ? "selected" : ""}>
              ${letter}
            </option>
          `).join("")}
        </select>

        <label>Explanation</label>

        <textarea class="draft-explanation"
          ${submitted ? "disabled" : ""}>${esc(draft.explanation || "")}</textarea>

        <label>Difficulty (1–7)</label>

        <input class="draft-difficulty"
          type="number"
          min="1"
          max="7"
          step="1"
          value="${esc(draft.difficulty ?? 1)}"
          ${submitted ? "disabled" : ""}>

        <label>Source details</label>

        <input class="draft-source"
          value="${esc(draft.sourceDetails || "")}"
          ${submitted ? "disabled" : ""}>

        <label>Syllabus objective</label>

        <input class="draft-objective"
          value="${esc(draft.syllabusObjective || "")}"
          ${submitted ? "disabled" : ""}>

        <div class="draft-actions">
          ${submitted ? "" : `
            <button type="button" class="btn btn-primary draft-save">
              Save edits
            </button>

            <button type="button" class="btn draft-delete">
              Delete draft
            </button>
          `}
        </div>
      </article>
    `;
  }).join("");

  /* Approval */

  list.querySelectorAll(".draft-approval")
    .forEach(input => {
      input.addEventListener("change", async () => {
        if (!isAdmin() || busy) {
          input.checked = !input.checked;
          return;
        }

        const card = input.closest(".draft-card");
        const id = card.dataset.id;
        const draft = drafts[id];

        if (!isReviewable(draft)) {
          input.checked = false;
          return;
        }

        input.disabled = true;

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
              ? "Draft approved."
              : "Approval removed."
          );

        } catch (error) {
          input.checked = !input.checked;

          setMessage(
            `Approval update failed: ${error.message}`,
            true
          );

        } finally {
          input.disabled = false;
        }
      });
    });

  /* Save edits */

  list.querySelectorAll(".draft-save")
    .forEach(button => {
      button.addEventListener("click", async () => {
        if (!isAdmin() || busy) return;

        const card = button.closest(".draft-card");
        const id = card.dataset.id;
        const original = drafts[id];

        if (!isReviewable(original)) {
          setMessage("This draft is no longer editable.", true);
          return;
        }

        const options = [
          ...card.querySelectorAll(".draft-option")
        ]
          .sort((a, b) =>
            Number(a.dataset.index) -
            Number(b.dataset.index)
          )
          .map(input => input.value.trim());

        const data = {
          question:
            card.querySelector(".draft-question").value.trim(),

          options,

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
            "Please complete the question, all four options, answer, explanation, and valid difficulty.",
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

        } catch (error) {
          setMessage(
            `Save failed: ${error.message}`,
            true
          );

        } finally {
          button.disabled = false;
          button.textContent = "Save edits";
        }
      });
    });

  /* Delete */

  list.querySelectorAll(".draft-delete")
    .forEach(button => {
      button.addEventListener("click", async () => {
        if (!isAdmin() || busy) return;

        const id =
          button.closest(".draft-card").dataset.id;

        if (!isReviewable(drafts[id])) return;

        if (!confirm("Mark this draft as deleted?")) {
          return;
        }

        button.disabled = true;

        try {
          await update(
            ref(database, `haiQuestionDrafts/${id}`),
            {
              status: "deleted",
              deletedAt: Date.now(),
              approved: false,
              updatedAt: Date.now()
            }
          );

          setMessage("Draft deleted.");

        } catch (error) {
          setMessage(
            `Delete failed: ${error.message}`,
            true
          );

        } finally {
          button.disabled = false;
        }
      });
    });

  refreshCount();
}

/* Approve all */

panel.querySelector("#hai-approve-all")
  .addEventListener("click", async () => {
    if (!isAdmin() || busy) return;

    const patch = {};

    Object.entries(drafts).forEach(([id, draft]) => {
      if (isReviewable(draft)) {
        patch[`haiQuestionDrafts/${id}/approved`] = true;
        patch[`haiQuestionDrafts/${id}/updatedAt`] = Date.now();
      }
    });

    if (!Object.keys(patch).length) {
      setMessage("No drafts available to approve.");
      return;
    }

    try {
      await update(ref(database), patch);
      setMessage("All reviewable drafts approved.");

    } catch (error) {
      setMessage(
        `Bulk approval failed: ${error.message}`,
        true
      );
    }
  });

/* Unapprove all */

panel.querySelector("#hai-unapprove-all")
  .addEventListener("click", async () => {
    if (!isAdmin() || busy) return;

    const patch = {};

    Object.entries(drafts).forEach(([id, draft]) => {
      if (isReviewable(draft)) {
        patch[`haiQuestionDrafts/${id}/approved`] = false;
        patch[`haiQuestionDrafts/${id}/updatedAt`] = Date.now();
      }
    });

    try {
      if (Object.keys(patch).length) {
        await update(ref(database), patch);
      }

      setMessage("All approvals cleared.");

    } catch (error) {
      setMessage(
        `Could not clear approvals: ${error.message}`,
        true
      );
    }
  });

/* Submit approved questions */

submit.addEventListener("click", async () => {
  if (!isAdmin() || busy) return;

  const chosen = approvedDrafts();

  if (!chosen.length) return;

  for (const [, draft] of chosen) {
    if (!validDraft(draft)) {
      setMessage(
        `Incomplete draft: ${draft.question?.slice(0, 60) || "Untitled"}. Save corrections first.`,
        true
      );
      return;
    }
  }

  const confirmed = confirm(
    `Submit ${chosen.length} approved question(s) to the pending review queue?\n\nThey will NOT be published automatically.`
  );

  if (!confirmed) return;

  busy = true;
  refreshCount();

  let apiConfirmed = false;
  let reservedIds = chosen.map(([id]) => id);

  try {
    /*
     * Reserve the selected drafts in Firebase first.
     * This prevents another review session from submitting
     * the same drafts simultaneously.
     */
    const reservePatch = {};

    reservedIds.forEach(id => {
      reservePatch[`haiQuestionDrafts/${id}/status`] = "submitting";
      reservePatch[`haiQuestionDrafts/${id}/submissionStartedAt`] = Date.now();
      reservePatch[`haiQuestionDrafts/${id}/approved`] = true;
    });

    await update(ref(database), reservePatch);

    if (!isAdmin()) {
      throw new Error("Administrator session changed.");
    }

    const token = await auth.currentUser.getIdToken(true);

    const payload = chosen.map(([, draft]) => ({
      subject: String(draft.subject || "Unspecified").slice(0, 100),
      topic: String(draft.topic || "Unspecified").slice(0, 200),
      question: draft.question.trim(),
      difficulty: Number(draft.difficulty),
      options: draft.options.map(option => String(option).trim()),
      answerIndex: Number(draft.answerIndex),
      explanation: draft.explanation.trim(),
      sourceDetails: String(
        draft.sourceDetails ||
        `Generated from ${draft.document || "textbook"}`
      ),
      syllabusObjective: String(draft.syllabusObjective || "")
    }));

    const response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ questions: payload })
    });

    let result = {};

    try {
      result = await response.json();
    } catch {
      // Response validation below will report the failure.
    }

    if (!response.ok) {
      throw new Error(
        result.detail ||
        result.message ||
        `Server returned HTTP ${response.status}`
      );
    }

    if (result.submitted_count !== payload.length) {
      throw new Error(
        "The API did not confirm that every selected question was submitted."
      );
    }

    apiConfirmed = true;

    const now = Date.now();
    const finalPatch = {};

    reservedIds.forEach(id => {
      finalPatch[`haiQuestionDrafts/${id}/status`] = "submitted";
      finalPatch[`haiQuestionDrafts/${id}/approved`] = false;
      finalPatch[`haiQuestionDrafts/${id}/submittedAt`] = now;
      finalPatch[`haiQuestionDrafts/${id}/updatedAt`] = now;
    });

    await update(ref(database), finalPatch);

    setMessage(
      `${result.submitted_count} question(s) submitted to the pending queue. Not published.`
    );

  } catch (error) {
    console.error("HAI draft submission:", error);

    /*
     * If the API did not confirm success, release the
     * reservation so the administrator can retry.
     *
     * If the API confirmed success but the Firebase
     * finalization failed, DO NOT automatically reset
     * the drafts. That could cause duplicate submissions.
     */
    if (!apiConfirmed && isAdmin()) {
      const rollback = {};

      reservedIds.forEach(id => {
        rollback[`haiQuestionDrafts/${id}/status`] = "draft";
        rollback[`haiQuestionDrafts/${id}/approved`] = true;
        rollback[`haiQuestionDrafts/${id}/updatedAt`] = Date.now();
      });

      try {
        await update(ref(database), rollback);
      } catch (rollbackError) {
        console.error("Could not release draft reservation:", rollbackError);
      }
    }

    if (apiConfirmed) {
      setMessage(
        "The API confirmed submission, but Firebase could not finalize the drafts. Do NOT submit them again until their pending-queue status is checked.",
        true
      );
    } else {
      setMessage(
        `Submission failed: ${error.message}`,
        true
      );
    }

  } finally {
    busy = false;
    refreshCount();
  }
});

/* Authentication and database listener */

onAuthStateChanged(auth, user => {
  admin = user?.uid === ADMIN_UID ? user : null;

  if (!isAdmin()) {
    panel.hidden = true;

    if (stopDraftListener) {
      stopDraftListener();
      stopDraftListener = null;
    }

    drafts = {};
    refreshCount();
    return;
  }

  panel.hidden = false;

  if (stopDraftListener) {
    stopDraftListener();
    stopDraftListener = null;
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

render();
