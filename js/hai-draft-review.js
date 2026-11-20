/* HAI-generated draft review module for Question Bank */

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


/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));


const style = document.createElement("style");

style.textContent = `
#hai-draft-review {
  margin: 28px 0;
  border: 1px solid var(--qb-line);
  border-radius: var(--qb-radius);
  background: var(--qb-panel);
  padding: clamp(16px, 3vw, 24px);
}

#hai-draft-review .draft-toolbar {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  margin: 14px 0;
}

#hai-draft-review .draft-card {
  border: 1px solid var(--qb-line);
  border-radius: 14px;
  padding: 15px;
  margin: 12px 0;
  background: rgba(255,255,255,.025);
}

#hai-draft-review .draft-card.submitted {
  opacity: .72;
}

#hai-draft-review textarea,
#hai-draft-review input,
#hai-draft-review select {
  width: 100%;
  margin: 5px 0 12px;
  background: rgba(5,8,15,.42);
  color: var(--qb-text);
  border: 1px solid var(--qb-line);
  border-radius: 10px;
  padding: 10px;
  font: inherit;
  font-size: 12px;
}

#hai-draft-review textarea {
  min-height: 78px;
  resize: vertical;
}

#hai-draft-review label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  margin-top: 8px;
}

#hai-draft-review .draft-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

#hai-draft-review .draft-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

#hai-draft-review .draft-approved {
  border-color: rgba(121,217,173,.45);
}

#hai-draft-review .draft-meta {
  color: var(--qb-muted);
  font-size: 11px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

#hai-draft-review .draft-message {
  font-size: 12px;
  line-height: 1.6;
  min-height: 18px;
}

@media(max-width:560px) {
  #hai-draft-review .draft-options {
    grid-template-columns: 1fr;
  }
}
`;

document.head.append(style);


/* --------------------------------------------------
   CREATE REVIEW PANEL
-------------------------------------------------- */

const panel = document.createElement("section");

panel.id = "hai-draft-review";

panel.innerHTML = `
  <div class="panel-head">
    <div>
      <h2>HAI Generated Questions</h2>
      <p>
        Private generated drafts. Review and edit before
        sending them to the pending queue.
      </p>
    </div>
  </div>

  <p id="hai-draft-count" class="draft-meta">
    Waiting for drafts…
  </p>

  <div class="draft-toolbar">
    <button
      class="btn"
      id="hai-approve-all"
      type="button"
    >
      Approve all drafts
    </button>

    <button
      class="btn"
      id="hai-unapprove-all"
      type="button"
    >
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
  </div>

  <p
    id="hai-draft-message"
    class="draft-message"
    role="status"
    aria-live="polite"
  ></p>

  <div id="hai-draft-list"></div>
`;


/* Place the review panel after the textbook library */

const library = document.querySelector(".library-card");

if (library) {
  library.insertAdjacentElement(
    "afterend",
    panel
  );
} else {
  document.querySelector(".page")?.prepend(panel);
}


const list =
  panel.querySelector("#hai-draft-list");

const count =
  panel.querySelector("#hai-draft-count");

const message =
  panel.querySelector("#hai-draft-message");

const submit =
  panel.querySelector("#hai-submit-approved");


/* --------------------------------------------------
   STATUS
-------------------------------------------------- */

function setMessage(text, error = false) {
  message.textContent = text;

  message.className =
    `draft-message ${error ? "error" : "success"}`;
}


function isAdmin() {
  return Boolean(
    admin &&
    auth.currentUser?.uid === ADMIN_UID &&
    admin.uid === ADMIN_UID
  );
}


function approvedDrafts() {
  return Object.entries(drafts).filter(
    ([, draft]) =>
      draft &&
      draft.status !== "submitted" &&
      draft.status !== "deleted" &&
      draft.approved === true
  );
}


function refreshCount() {
  const all = Object.values(drafts).filter(Boolean);

  const pending = all.filter(
    draft =>
      draft.status !== "submitted" &&
      draft.status !== "deleted"
  );

  const approved = pending.filter(
    draft => draft.approved === true
  );

  const submitted = all.filter(
    draft => draft.status === "submitted"
  );

  count.textContent =
    `${pending.length} draft(s) awaiting review · ` +
    `${approved.length} approved · ` +
    `${submitted.length} submitted`;

  submit.disabled =
    !approved.length ||
    busy ||
    !isAdmin();

  submit.textContent =
    `Submit ${approved.length} approved question` +
    `${approved.length === 1 ? "" : "s"}`;
}


/* --------------------------------------------------
   VALIDATION
-------------------------------------------------- */

function validDraft(draft) {
  return (
    typeof draft.question === "string" &&
    draft.question.trim().length > 0 &&

    Array.isArray(draft.options) &&
    draft.options.length === 4 &&
    draft.options.every(
      option => String(option).trim().length > 0
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


/* --------------------------------------------------
   RENDER DRAFTS
-------------------------------------------------- */

function render() {
  const entries = Object.entries(drafts)
    .filter(
      ([, draft]) =>
        draft &&
        typeof draft === "object" &&
        draft.status !== "deleted"
    )
    .sort(
      (a, b) =>
        (b[1].createdAt || 0) -
        (a[1].createdAt || 0)
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

  list.innerHTML = entries.map(([id, draft]) => {
    const submitted =
      draft.status === "submitted";

    const approved =
      draft.approved === true;

    const options =
      Array.isArray(draft.options)
        ? draft.options.slice(0, 4)
        : [];

    const letters = ["A", "B", "C", "D"];

    return `
      <article
        class="draft-card
          ${approved ? "draft-approved" : ""}
          ${submitted ? "submitted" : ""}"
        data-id="${esc(id)}"
      >

        <div class="draft-meta">
          <strong>${esc(draft.subject || "Unspecified subject")}</strong>
          · ${esc(draft.topic || "Unspecified topic")}
          · Difficulty ${esc(draft.difficulty ?? "?")}/7
          · ${submitted ? "Submitted" : "Draft"}

          <br>

          Source:
          ${esc(draft.document || draft.sourceDetails || "HAI generation")}

          ${
            draft.chapter
              ? `· Chapter: ${esc(draft.chapter)}`
              : ""
          }
        </div>

        <label>
          <input
            class="draft-approval"
            type="checkbox"
            ${approved ? "checked" : ""}
            ${submitted ? "disabled" : ""}
            style="width:auto;margin-right:7px"
          >

          Approve for submission
        </label>

        <label>Question</label>

        <textarea
          class="draft-question"
          ${submitted ? "disabled" : ""}
        >${esc(draft.question || "")}</textarea>

        <label>Options</label>

        <div class="draft-options">
          ${letters.map((letter, index) => `
            <div>
              <label>Option ${letter}</label>

              <textarea
                class="draft-option"
                data-index="${index}"
                ${submitted ? "disabled" : ""}
              >${esc(options[index] || "")}</textarea>
            </div>
          `).join("")}
        </div>

        <label>Correct answer</label>

        <select
          class="draft-answer"
          ${submitted ? "disabled" : ""}
        >
          ${letters.map((letter, index) => `
            <option
              value="${index}"
              ${
                Number(draft.answerIndex) === index
                  ? "selected"
                  : ""
              }
            >
              ${letter}
            </option>
          `).join("")}
        </select>

        <label>Explanation</label>

        <textarea
          class="draft-explanation"
          ${submitted ? "disabled" : ""}
        >${esc(draft.explanation || "")}</textarea>

        <label>Difficulty (1–7)</label>

        <input
          class="draft-difficulty"
          type="number"
          min="1"
          max="7"
          step="1"
          value="${esc(draft.difficulty ?? 1)}"
          ${submitted ? "disabled" : ""}
        >

        <label>Source details</label>

        <input
          class="draft-source"
          value="${esc(draft.sourceDetails || "")}"
          ${submitted ? "disabled" : ""}
        >

        <label>Syllabus objective</label>

        <input
          class="draft-objective"
          value="${esc(draft.syllabusObjective || "")}"
          ${submitted ? "disabled" : ""}
        >

        <div class="draft-actions">
          ${
            submitted
              ? ""
              : `
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
              `
          }
        </div>

      </article>
    `;
  }).join("");


  /* --------------------------------------------------
     APPROVAL CHECKBOXES
  -------------------------------------------------- */

  list.querySelectorAll(".draft-approval")
    .forEach(input => {
      input.addEventListener("change", async () => {
        const id =
          input.closest(".draft-card").dataset.id;

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

        } catch (error) {
          input.checked = !input.checked;

          setMessage(
            `Could not update approval: ${error.message}`,
            true
          );
        }
      });
    });


  /* --------------------------------------------------
     SAVE EDITS
  -------------------------------------------------- */

  list.querySelectorAll(".draft-save")
    .forEach(button => {
      button.addEventListener("click", async () => {
        const card =
          button.closest(".draft-card");

        const id = card.dataset.id;

        const options = [
          ...card.querySelectorAll(".draft-option")
        ]
          .sort(
            (a, b) =>
              Number(a.dataset.index) -
              Number(b.dataset.index)
          )
          .map(input => input.value.trim());

        const data = {
          question:
            card.querySelector(".draft-question")
              .value.trim(),

          options,

          answerIndex:
            Number(
              card.querySelector(".draft-answer")
                .value
            ),

          explanation:
            card.querySelector(".draft-explanation")
              .value.trim(),

          difficulty:
            Number(
              card.querySelector(".draft-difficulty")
                .value
            ),

          sourceDetails:
            card.querySelector(".draft-source")
              .value.trim(),

          syllabusObjective:
            card.querySelector(".draft-objective")
              .value.trim(),

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


  /* --------------------------------------------------
     DELETE DRAFT
  -------------------------------------------------- */

  list.querySelectorAll(".draft-delete")
    .forEach(button => {
      button.addEventListener("click", async () => {
        const id =
          button.closest(".draft-card").dataset.id;

        if (!confirm("Delete this HAI draft permanently?")) {
          return;
        }

        try {
          await update(
            ref(database, `haiQuestionDrafts/${id}`),
            {
              status: "deleted",
              deletedAt: Date.now(),
              approved: false
            }
          );

          setMessage("Draft marked deleted.");

        } catch (error) {
          setMessage(
            `Could not delete draft: ${error.message}`,
            true
          );
        }
      });
    });

  refreshCount();
}


/* --------------------------------------------------
   APPROVE ALL
-------------------------------------------------- */

panel.querySelector("#hai-approve-all")
  .addEventListener("click", async () => {
    if (!isAdmin()) return;

    const patch = {};

    Object.entries(drafts).forEach(([id, draft]) => {
      if (
        draft &&
        draft.status !== "submitted" &&
        draft.status !== "deleted"
      ) {
        patch[
          `haiQuestionDrafts/${id}/approved`
        ] = true;
      }
    });

    if (!Object.keys(patch).length) {
      setMessage("No drafts available to approve.");
      return;
    }

    try {
      await update(ref(database), patch);

      setMessage(
        "All current drafts approved for submission."
      );

    } catch (error) {
      setMessage(
        `Bulk approval failed: ${error.message}`,
        true
      );
    }
  });


/* --------------------------------------------------
   UNAPPROVE ALL
-------------------------------------------------- */

panel.querySelector("#hai-unapprove-all")
  .addEventListener("click", async () => {
    if (!isAdmin()) return;

    const patch = {};

    Object.entries(drafts).forEach(([id, draft]) => {
      if (
        draft &&
        draft.status !== "submitted" &&
        draft.status !== "deleted"
      ) {
        patch[
          `haiQuestionDrafts/${id}/approved`
        ] = false;
      }
    });

    try {
      if (Object.keys(patch).length) {
        await update(ref(database), patch);
      }

      setMessage("All draft approvals cleared.");

    } catch (error) {
      setMessage(
        `Could not clear approvals: ${error.message}`,
        true
      );
    }
  });


/* --------------------------------------------------
   SUBMIT APPROVED QUESTIONS
-------------------------------------------------- */

submit.addEventListener("click", async () => {
  if (busy || !isAdmin()) return;

  const chosen = approvedDrafts();

  if (!chosen.length) return;

  for (const [, draft] of chosen) {
    if (!validDraft(draft)) {
      setMessage(
        `Draft "${draft.question?.slice(0, 60) || "Untitled"}" is incomplete. Save and correct it first.`,
        true
      );

      return;
    }
  }

  busy = true;
  refreshCount();
  submit.textContent = "Submitting…";

  try {
    const token = await auth.currentUser.getIdToken(true);

    const payload = chosen.map(([, draft]) => ({
      subject: String(
        draft.subject || "Unspecified"
      ).slice(0, 100),

      topic: String(
        draft.topic || "Unspecified"
      ).slice(0, 200),

      question: draft.question.trim(),

      difficulty: Number(draft.difficulty),

      options: draft.options.map(
        option => String(option).trim()
      ),

      answerIndex: Number(draft.answerIndex),

      explanation: draft.explanation.trim(),

      sourceDetails: String(
        draft.sourceDetails ||
        `Generated from ${draft.document || "textbook"}`
      ),

      syllabusObjective: String(
        draft.syllabusObjective || ""
      )
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
      // Handled by the response validation below.
    }

    if (!response.ok) {
      throw new Error(
        result.detail ||
        result.message ||
        `Server returned ${response.status}`
      );
    }

    if (
      result.submitted_count !== payload.length
    ) {
      throw new Error(
        "API did not confirm that all selected questions were submitted."
      );
    }

    const now = Date.now();
    const patch = {};

    chosen.forEach(([id]) => {
      patch[`haiQuestionDrafts/${id}/status`] =
        "submitted";

      patch[`haiQuestionDrafts/${id}/approved`] =
        false;

      patch[`haiQuestionDrafts/${id}/submittedAt`] =
        now;

      patch[`haiQuestionDrafts/${id}/updatedAt`] =
        now;
    });

    await update(ref(database), patch);

    setMessage(
      `${result.submitted_count} question(s) submitted to the pending queue. They are not published.`
    );

  } catch (error) {
    setMessage(
      `Submission failed: ${error.message}`,
      true
    );

  } finally {
    busy = false;
    refreshCount();
  }
});


/* --------------------------------------------------
   AUTHENTICATION AND DATABASE LISTENER
-------------------------------------------------- */

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

    drafts = {};
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
