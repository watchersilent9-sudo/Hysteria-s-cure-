/* Hysteria's Cure — Question Bank manager (replacement) */

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

import {
  createCollapseVariant,
  formatVariantForCopy
} from "./algorithm-collapse.js";

const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const HAI_PENDING_URL =
  "https://hai-api-l7js.onrender.com/questions/pending";

const MATERIALS_API_URL =
  "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/manage-learning-materials";

const EXTRACT_MATERIAL_URL =
  "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/extract-materials-text";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_wMSMx1WpGWn7Tk0zBUDAhg_Jlj8RWDO";

const $ = id => document.getElementById(id);

const nodes = [
  "app-content",
  "admin-email",
  "logout-button",
  "question-form",
  "form-heading",
  "subject",
  "topic",
  "question",
  "difficulty",
  "sourceType",
  "sourceDetails",
  "syllabusObjective",
  "option0",
  "option1",
  "option2",
  "option3",
  "answerIndex",
  "verified",
  "explanation",
  "save-button",
  "cancel-edit",
  "status",
  "search",
  "question-count",
  "question-list"
];

const missing = nodes.filter(id => !$(id));

if (missing.length) {
  throw new Error(
    "Question Bank missing elements: " + missing.join(", ")
  );
}

let admin = null;
let bank = {};
let editId = null;
let busy = false;
let stop = null;

const materialUploadForm =
  document.getElementById("material-upload-form");

const materialFileInput =
  document.getElementById("material-file");

const uploadButton =
  document.getElementById("upload-button");

const uploadStatus =
  document.getElementById("upload-status");

const materialsList =
  document.getElementById("materials-list");

const refreshMaterialsButton =
  document.getElementById("refresh-materials");

const pendingButton = document.createElement("button");

pendingButton.type = "button";
pendingButton.textContent = "Send to pending review";
pendingButton.className = $("save-button").className;
pendingButton.style.marginLeft = "8px";

$("save-button").insertAdjacentElement(
  "afterend",
  pendingButton
);

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));

function message(text, error = false) {
  $("status").textContent = text;

  $("status").style.color = error
    ? "var(--qb-danger)"
    : "var(--qb-success)";
}

function resetForm() {
  $("question-form").reset();

  $("difficulty").value = "3";
  $("answerIndex").value = "0";

  editId = null;

  $("form-heading").textContent = "Add a question";
  $("save-button").textContent = "Save question";
  $("cancel-edit").style.display = "none";
}

function validate(data) {
  return (
    data.subject &&
    data.topic &&
    data.question &&
    data.options.length === 4 &&
    data.options.every(option => option.trim()) &&
    data.explanation &&
    Number.isInteger(data.difficulty) &&
    data.difficulty >= 1 &&
    data.difficulty <= 7 &&
    Number.isInteger(data.answerIndex) &&
    data.answerIndex >= 0 &&
    data.answerIndex <= 3
  );
}

function collect() {
  return {
    subject: $("subject").value.trim(),
    topic: $("topic").value.trim(),
    question: $("question").value.trim(),

    difficulty: Number($("difficulty").value),

    sourceType: $("sourceType").value,
    sourceDetails: $("sourceDetails").value.trim(),

    syllabusObjective:
      $("syllabusObjective").value.trim(),

    verified: $("verified").checked,

    options: [0, 1, 2, 3].map(
      index => $(`option${index}`).value.trim()
    ),

    answerIndex: Number($("answerIndex").value),

    explanation: $("explanation").value.trim()
  };
}

/*
 * Variant counters are temporary and exist only for the current page session.
 * Persistent variant history is not implemented in this version.
 */

const variantCounters = new Map();

function render() {
  const search = $("search").value.trim().toLowerCase();

  const entries = Object.entries(bank)
    .filter(([id, question]) =>
      question &&
      typeof question === "object" &&
      [
        id,
        question.subject,
        question.topic,
        question.question,
        ...(question.options || [])
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    )
    .sort((a, b) =>
      String(b[1].createdAt || "")
        .localeCompare(String(a[1].createdAt || ""))
    );

  $("question-count").textContent =
    `${entries.length} shown · ${Object.keys(bank).length} total`;

  if (!entries.length) {
    $("question-list").innerHTML =
      '<div class="empty-list">No questions match your search.</div>';

    return;
  }

  $("question-list").innerHTML = entries.map(([id, question]) => {
    const validOptions = Array.isArray(question.options)
      ? question.options
      : [];

    const status = question.verified === true
      ? "Published"
      : "Unverified · excluded from practice";

    return `
      <article class="qb-question" data-id="${esc(id)}">

        <div class="question-card-head">

          <div class="question-tags">

            <span class="section-tag">
              ${esc(question.subject || "No subject")}
            </span>

            <span class="section-tag">
              ${esc(question.topic || "No topic")}
            </span>

            <span class="section-tag">
              Level ${esc(question.difficulty || "?")}
            </span>

            <span class="section-tag">
              ${status}
            </span>

          </div>

          <button
            class="btn collapse-toggle"
            type="button"
            aria-expanded="false"
          >
            Show details
          </button>

        </div>

        <p class="question-preview">
          ${esc(question.question || "Question text unavailable")}
        </p>

        <div class="question-details" hidden>

          <ol type="A" class="question-options">

            ${validOptions.map((option, index) => `
              <li>
                ${
                  index === Number(question.answerIndex)
                    ? '<strong class="correct-answer">'
                    : ''
                }

                ${esc(option)}

                ${
                  index === Number(question.answerIndex)
                    ? '</strong>'
                    : ''
                }
              </li>
            `).join("")}

          </ol>

          <p class="question-explanation">
            <strong>Explanation:</strong>
            ${esc(question.explanation || "Not provided")}
          </p>

          <div class="form-actions">

            <button class="btn edit-q" type="button">
              Edit
            </button>

            <button class="btn collapse-create" type="button">
              Create variant
            </button>

            <button
              class="btn btn-danger delete-q"
              type="button"
            >
              Delete
            </button>

          </div>

          <div
            class="collapse-preview"
            hidden
            aria-live="polite"
          ></div>

        </div>

      </article>
    `;
  }).join("");

  /*
   * Expand and collapse question cards.
   */

  $("question-list")
    .querySelectorAll(".collapse-toggle")
    .forEach(button => {
      button.addEventListener("click", () => {
        const details = button
          .closest(".qb-question")
          .querySelector(".question-details");

        const opening = details.hidden;

        details.hidden = !opening;

        button.textContent = opening
          ? "Hide details"
          : "Show details";

        button.setAttribute(
          "aria-expanded",
          String(opening)
        );
      });
    });

  /*
   * Algorithm Collapse v0.2 preview.
   */

  $("question-list")
    .querySelectorAll(".collapse-create")
    .forEach(button => {
      button.addEventListener("click", () => {
        const card = button.closest("[data-id]");

        const id = card.dataset.id;
        const question = bank[id];

        const preview = card.querySelector(
          ".collapse-preview"
        );

        const next =
          (variantCounters.get(id) || 0) + 1;

        try {
          const variant = createCollapseVariant(
            id,
            question,
            next
          );

          variantCounters.set(id, next);

          preview.hidden = false;

          preview.innerHTML = `
            <div class="variant-heading">

              <strong>
                Algorithm Collapse · Preview ${next}
              </strong>

              <span class="section-tag">
                Not saved to the bank
              </span>

            </div>

            <p class="variant-question">
              ${esc(variant.question)}
            </p>

            <ol type="A" class="question-options">

              ${variant.options.map((option, index) => `
                <li>
                  ${
                    index === variant.answerIndex
                      ? '<strong class="correct-answer">'
                      : ''
                  }

                  ${esc(option)}

                  ${
                    index === variant.answerIndex
                      ? '</strong>'
                      : ''
                  }
                </li>
              `).join("")}

            </ol>

            <p class="variant-note">

              ${
                variant.validation.valid
                  ? "Integrity checks passed"
                  : "Integrity checks failed"
              }

              · Original question snapshot retained
              · Correct-answer content preserved.

              This version rotates options and adds a framing
              phrase; it does not yet perform genuine structural
              rewriting or independently verify academic accuracy.

            </p>

            <div class="form-actions">

              <button
                class="btn btn-primary copy-variant"
                type="button"
              >
                Copy variant
              </button>

              <button
                class="btn close-variant"
                type="button"
              >
                Close preview
              </button>

            </div>

            <small class="variant-id">
              Variant: ${esc(variant.id)}
              · Original: ${esc(id)}
            </small>
          `;

          preview
            .querySelector(".copy-variant")
            .addEventListener("click", async () => {
              try {
                await navigator.clipboard.writeText(
                  formatVariantForCopy(variant)
                );

                message(
                  "Variant copied. The original question remains unchanged."
                );

              } catch {
                message(
                  "Clipboard access was blocked. Select and copy the preview manually.",
                  true
                );
              }
            });

          preview
            .querySelector(".close-variant")
            .addEventListener("click", () => {
              preview.hidden = true;
              preview.innerHTML = "";
            });

        } catch (error) {
          message(
            "Could not create variant: " + error.message,
            true
          );
        }
      });
    });

  /*
   * Edit existing questions.
   */

  $("question-list")
    .querySelectorAll(".edit-q")
    .forEach(button => {
      button.addEventListener("click", () => {
        const id = button.closest("[data-id]").dataset.id;
        const question = bank[id];

        editId = id;

        $("subject").value = question.subject || "";
        $("topic").value = question.topic || "";
        $("question").value = question.question || "";

        $("difficulty").value =
          String(question.difficulty || 3);

        $("sourceType").value =
          question.sourceType || "original";

        $("sourceDetails").value =
          question.sourceDetails || "";

        $("syllabusObjective").value =
          question.syllabusObjective || "";

        for (let index = 0; index < 4; index++) {
          $(`option${index}`).value =
            question.options?.[index] || "";
        }

        $("answerIndex").value =
          String(question.answerIndex ?? 0);

        $("verified").checked =
          question.verified === true;

        $("explanation").value =
          question.explanation || "";

        $("form-heading").textContent = "Edit question";
        $("save-button").textContent = "Save changes";
        $("cancel-edit").style.display = "inline-flex";

        message(
          "Editing question. Review its publication status before saving."
        );

        $("question-form").scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });

  /*
   * Delete questions from the published Question Bank.
   */

  $("question-list")
    .querySelectorAll(".delete-q")
    .forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.closest("[data-id]").dataset.id;

        if (
          !confirm(
            "Delete this question from the published bank?"
          )
        ) {
          return;
        }

        try {
          await remove(
            ref(database, `questionBank/${id}`)
          );

          message("Question deleted.");

        } catch (error) {
          message(
            "Delete failed: " + error.message,
            true
          );
        }
      });
    });
}

/*
 * Textbook management API.
 */

async function materialRequest(
  url,
  method = "GET",
  body = null
) {
  if (
    !admin ||
    auth.currentUser?.uid !== ADMIN_UID
  ) {
    throw new Error(
      "Administrator authentication required."
    );
  }

  const token = await auth.currentUser.getIdToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_PUBLISHABLE_KEY
  };

  const options = {
    method,
    headers
  };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== null) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  const responseText = await response.text();

  let result = {};

  try {
    result = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    result = {
      message: responseText
    };
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
      result.error ||
      `Request failed (${response.status}).`
    );
  }

  return result;
}

function uploadMessage(text, error = false) {
  if (!uploadStatus) return;

  uploadStatus.textContent = text;

  uploadStatus.className = error
    ? "error"
    : "success";
}

function renderMaterials(items) {
  if (!Array.isArray(items) || !items.length) {
    materialsList.innerHTML =
      '<div class="empty-list">No textbooks uploaded yet.</div>';

    return;
  }

  materialsList.innerHTML = items.map(material => {
    const extraction = material.extraction || {};

    const status = material.status || "unknown";

    const extractionStatus =
      extraction.extraction_status || "not extracted";

    const size = (
      Number(material.file_size || 0) /
      (1024 * 1024)
    ).toFixed(2);

    const date = material.created_at
      ? new Date(material.created_at).toLocaleDateString()
      : "Unknown";

    let action = "";

    if (status !== "published") {
      action = `
        <button
          class="btn btn-primary approve-material"
          data-id="${esc(material.id)}"
        >
          Approve and extract
        </button>
      `;
    } else if (extractionStatus !== "completed") {
      action = `
        <button
          class="btn extract-material"
          data-id="${esc(material.id)}"
        >
          Retry extraction
        </button>
      `;
    }

    return `
      <article
        class="material-item"
        style="
          border:1px solid var(--qb-line);
          border-radius:13px;
          padding:13px;
          margin:10px 0;
        "
      >

        <h4>
          ${esc(material.title || "Untitled material")}
        </h4>

        <p class="draft-meta">

          Subject: ${esc(material.subject || "—")}
          · Topic: ${esc(material.topic || "—")}

          <br>

          File: ${esc(material.original_filename || "—")}
          · ${size} MB
          · ${esc(date)}

          <br>

          ${
            extraction
              ? `${Number(extraction.page_count || 0)} pages · ${Number(extraction.character_count || 0).toLocaleString()} characters`
              : "Text not extracted"
          }

        </p>

        <span class="section-tag">
          Review: ${esc(status)}
        </span>

        <span class="section-tag">
          Extraction: ${esc(extractionStatus)}
        </span>

        ${
          extraction?.extraction_status === "needs_ocr"
            ? '<p class="error">OCR may be required for this scanned document.</p>'
            : ""
        }

        <div class="form-actions">
          ${action}
        </div>

      </article>
    `;
  }).join("");

  materialsList
    .querySelectorAll(".approve-material")
    .forEach(button => {
      button.addEventListener("click", () =>
        approveAndExtract(button.dataset.id, button)
      );
    });

  materialsList
    .querySelectorAll(".extract-material")
    .forEach(button => {
      button.addEventListener("click", () =>
        extractMaterial(button.dataset.id, button)
      );
    });
}

async function loadMaterials() {
  if (!materialsList) return;

  materialsList.innerHTML =
    '<div class="empty-list">Loading textbook library...</div>';

  try {
    const result = await materialRequest(
      MATERIALS_API_URL
    );

    renderMaterials(result.materials || []);

  } catch (error) {
    materialsList.innerHTML = `
      <div class="empty-list">
        Could not load textbooks: ${esc(error.message)}
      </div>
    `;
  }
}

async function approveAndExtract(id, button) {
  if (
    !confirm(
      "Approve this textbook and begin extraction?"
    )
  ) {
    return;
  }

  button.disabled = true;
  button.textContent = "Approving...";

  try {
    await materialRequest(
      MATERIALS_API_URL,
      "PATCH",
      { materialId: id }
    );

    button.textContent = "Extracting...";

    const result = await materialRequest(
      EXTRACT_MATERIAL_URL,
      "POST",
      { materialId: id }
    );

    const extraction = result.extraction || {};

    uploadMessage(
      extraction.extractionStatus === "needs_ocr"
        ? "Approved, but the text is sparse; OCR may be required."
        : `Text extraction completed (${Number(extraction.pageCount || 0)} pages).`,
      extraction.extractionStatus === "needs_ocr"
    );

    await loadMaterials();

  } catch (error) {
    uploadMessage(
      "Approval/extraction failed: " + error.message,
      true
    );

    await loadMaterials();

  } finally {
    button.disabled = false;
  }
}

async function extractMaterial(id, button) {
  button.disabled = true;
  button.textContent = "Extracting...";

  try {
    const result = await materialRequest(
      EXTRACT_MATERIAL_URL,
      "POST",
      { materialId: id }
    );

    const extraction = result.extraction || {};

    uploadMessage(
      extraction.extractionStatus === "needs_ocr"
        ? "Extraction finished; OCR may be required."
        : "Text extraction completed.",
      extraction.extractionStatus === "needs_ocr"
    );

    await loadMaterials();

  } catch (error) {
    uploadMessage(
      "Extraction failed: " + error.message,
      true
    );

    await loadMaterials();

  } finally {
    button.disabled = false;
  }
}

/*
 * Textbook upload.
 */

materialUploadForm?.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    if (!admin) {
      uploadMessage(
        "Administrator access required.",
        true
      );

      return;
    }

    const file = materialFileInput.files?.[0];

    if (!file) {
      uploadMessage("Choose a PDF first.", true);
      return;
    }

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      uploadMessage(
        "Only PDF files are accepted.",
        true
      );

      return;
    }

    if (
      file.size < 1 ||
      file.size > 20 * 1024 * 1024
    ) {
      uploadMessage(
        "File must be between 1 byte and 20 MB.",
        true
      );

      return;
    }

    const formData = new FormData();

    formData.append(
      "title",
      document.getElementById("material-title").value.trim()
    );

    formData.append(
      "subject",
      document.getElementById("material-subject").value.trim()
    );

    formData.append(
      "topic",
      document.getElementById("material-topic").value.trim()
    );

    formData.append(
      "submission_notes",
      document.getElementById("material-notes").value.trim()
    );

    formData.append("file", file);

    uploadButton.disabled = true;

    uploadMessage("Uploading securely...");

    try {
      const result = await materialRequest(
        MATERIALS_API_URL,
        "POST",
        formData
      );

      uploadMessage(
        result.message || "Textbook uploaded; awaiting review."
      );

      materialUploadForm.reset();

      await loadMaterials();

    } catch (error) {
      uploadMessage(
        "Upload failed: " + error.message,
        true
      );

    } finally {
      uploadButton.disabled = false;
    }
  }
);

refreshMaterialsButton?.addEventListener(
  "click",
  loadMaterials
);

/*
 * Administrator authentication and Firebase Question Bank listener.
 */

onAuthStateChanged(auth, user => {
  admin =
    user && user.uid === ADMIN_UID
      ? user
      : null;

  if (!admin) {
    $("app-content").style.display = "none";

    if (stop) {
      stop();
      stop = null;
    }

    if (!user) {
      location.replace("login.html");
    }

    return;
  }

  $("app-content").style.display = "block";

  $("admin-email").textContent =
    user.email || "Administrator";

  loadMaterials();

  if (stop) {
    stop();
  }

  stop = onValue(
    ref(database, "questionBank"),

    snapshot => {
      bank = snapshot.val() || {};
      render();
    },

    error => {
      message(
        "Question bank load failed: " + error.message,
        true
      );
    }
  );
});

/*
 * Save and update questions.
 */

$("question-form").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    if (!admin || busy) return;

    const data = collect();

    if (!validate(data)) {
      message(
        "Complete all fields and ensure four non-empty options, a valid answer, and difficulty 1–7.",
        true
      );

      return;
    }

    busy = true;
    $("save-button").disabled = true;

    try {
      const now = Date.now();

      if (editId) {
        const old = bank[editId] || {};

        if (data.verified) {
          await update(
            ref(database, `questionBank/${editId}`),
            {
              ...data,
              verified: true,
              reviewStatus: "published",
              updatedAt: now,
              updatedBy: admin.uid
            }
          );

        } else {
          const pendingId = push(
            ref(database, "pendingQuestions")
          ).key;

          await update(
            ref(database),
            {
              [`pendingQuestions/${pendingId}`]: {
                ...data,
                sourceType: data.sourceType || "original",
                verified: false,
                reviewStatus: "pending_review",
                createdAt: old.createdAt || now,
                submittedAt: now,
                updatedAt: now,
                createdBy: admin.uid,
                source: "manual-edit"
              },

              [`questionBank/${editId}`]: null
            }
          );
        }

        message("Question updated.");

      } else if (data.verified) {
        const id = push(
          ref(database, "questionBank")
        ).key;

        await set(
          ref(database, `questionBank/${id}`),
          {
            ...data,
            id,
            sourceType: data.sourceType || "original",
            verified: true,
            reviewStatus: "published",
            createdAt: now,
            updatedAt: now,
            createdBy: admin.uid
          }
        );

        message("Published question saved.");

      } else {
        const id = push(
          ref(database, "pendingQuestions")
        ).key;

        await set(
          ref(database, `pendingQuestions/${id}`),
          {
            ...data,
            id,
            verified: false,
            reviewStatus: "pending_review",
            createdAt: now,
            submittedAt: now,
            updatedAt: now,
            createdBy: admin.uid,
            source: "manual"
          }
        );

        message(
          "Saved to the private review queue; students cannot see it."
        );
      }

      resetForm();

    } catch (error) {
      message(
        "Save failed: " + error.message,
        true
      );

    } finally {
      busy = false;
      $("save-button").disabled = false;
    }
  }
);

/*
 * Send a question to HAI's private pending-review queue.
 */

pendingButton.addEventListener(
  "click",
  async () => {
    if (!admin) return;

    const data = collect();

    if (!data) return;

    pendingButton.disabled = true;
    $("save-button").disabled = true;

    try {
      const token =
        await auth.currentUser.getIdToken(true);

      const response = await fetch(
        HAI_PENDING_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },

          body: JSON.stringify(data)
        }
      );

      let result = {};

      try {
        result = await response.json();
      } catch {
        // Keep the default empty result.
      }

      if (!response.ok) {
        throw new Error(
          result.detail ||
          result.message ||
          `HTTP ${response.status}`
        );
      }

      if (result.status === "duplicate_detected") {
        message(
          "A similar question already exists; it was not submitted.",
          true
        );

        return;
      }

      message(
        "Question sent to private final-review queue. It is not published."
      );

      resetForm();

    } catch (error) {
      message(
        "Pending submission failed: " + error.message,
        true
      );

    } finally {
      pendingButton.disabled = false;
      $("save-button").disabled = false;
    }
  }
);

/*
 * Remaining Question Bank controls.
 */

$("cancel-edit").addEventListener(
  "click",
  resetForm
);

$("search").addEventListener(
  "input",
  render
);

$("show-all-questions")?.addEventListener(
  "click",
  () => {
    document
      .querySelectorAll(".question-details")
      .forEach(element => {
        element.hidden = false;
      });

    document
      .querySelectorAll(".collapse-toggle")
      .forEach(button => {
        button.textContent = "Hide details";

        button.setAttribute(
          "aria-expanded",
          "true"
        );
      });
  }
);

$("collapse-all-questions")?.addEventListener(
  "click",
  () => {
    document
      .querySelectorAll(".question-details")
      .forEach(element => {
        element.hidden = true;
      });

    document
      .querySelectorAll(".collapse-toggle")
      .forEach(button => {
        button.textContent = "Show details";

        button.setAttribute(
          "aria-expanded",
          "false"
        );
      });
  }
);

$("logout-button").addEventListener(
  "click",
  async () => {
    try {
      await signOut(auth);
      location.replace("login.html");

    } catch (error) {
      message(
        "Logout failed: " + error.message,
        true
      );
    }
  }
);