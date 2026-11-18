
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

const HAI_PENDING_URL =
  "https://hai-api-l7js.onrender.com/questions/pending";

const MATERIALS_API_URL =
  "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/manage-learning-materials";

const EXTRACT_MATERIAL_URL =
  "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/extract-materials-text";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_wMSMx1WpGWn7Tk0zBUDAhg_Jlj8RWDO";

// ==========================================
// PAGE ELEMENTS
// ==========================================

const statusBox = document.getElementById("status");
const appContent = document.getElementById("app-content");
const form = document.getElementById("question-form");
const formHeading = document.getElementById("form-heading");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-edit");
const questionList = document.getElementById("question-list");
const questionCount = document.getElementById("question-count");
const searchInput = document.getElementById("search");

const materialUploadForm = document.getElementById("material-upload-form");
const materialFileInput = document.getElementById("material-file");
const uploadButton = document.getElementById("upload-button");
const uploadStatus = document.getElementById("upload-status");
const materialsList = document.getElementById("materials-list");
const refreshMaterialsButton = document.getElementById("refresh-materials");

let currentUser = null;
let questions = {};
let editingId = null;
let stopListening = null;

// ==========================================
// HAI PENDING REVIEW BUTTON
// ==========================================

const pendingButton = document.createElement("button");

pendingButton.type = "button";
pendingButton.textContent = "Send to pending review";
pendingButton.className = saveButton.className;
pendingButton.style.marginLeft = "8px";

saveButton.insertAdjacentElement("afterend", pendingButton);

// ==========================================
// GENERAL FUNCTIONS
// ==========================================

function showStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = type;
}

function showUploadStatus(message, type = "") {
  uploadStatus.textContent = message;
  uploadStatus.className = type;
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

function collectQuestionData() {
  const options = [0, 1, 2, 3].map(i =>
    field(`option${i}`).value.trim()
  );

  if (options.some(option => !option)) {
    showStatus("Please fill in all four answer options.", "error");
    return null;
  }

  const difficulty = Number(field("difficulty").value);
  const answerIndex = Number(field("answerIndex").value);

  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 7) {
    showStatus("Choose a difficulty from 1 to 7.", "error");
    return null;
  }

  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
    showStatus("Choose a valid correct answer.", "error");
    return null;
  }

  const data = {
    subject: field("subject").value.trim(),
    topic: field("topic").value.trim(),
    question: field("question").value.trim(),
    difficulty,
    options,
    answerIndex,
    explanation: field("explanation").value.trim(),
    sourceDetails: field("sourceDetails").value.trim(),
    syllabusObjective: field("syllabusObjective").value.trim()
  };

  if (!data.subject || !data.topic || !data.question || !data.explanation) {
    showStatus("Complete all required fields.", "error");
    return null;
  }

  return data;
}

// ==========================================
// TEXTBOOK API REQUEST
// ==========================================

async function materialRequest(url, method = "GET", body = null) {
  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    throw new Error("Administrator authentication required.");
  }

  const token = await currentUser.getIdToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_PUBLISHABLE_KEY
  };

  const options = { method, headers };

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
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    result = { message: responseText };
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

// ==========================================
// TEXTBOOK LIBRARY DISPLAY
// ==========================================

function renderMaterials(materials) {
  if (!Array.isArray(materials) || materials.length === 0) {
    materialsList.innerHTML = `
      <div class="empty-list">
        No textbooks have been uploaded yet.
      </div>
    `;
    return;
  }

  materialsList.innerHTML = materials.map(material => {
    const extraction = material.extraction;
    const reviewStatus = material.status || "unknown";
    const extractionStatus =
      extraction?.extraction_status || "not extracted";

    const reviewClass =
      reviewStatus === "published" ? "success" : "pending";

    const extractionClass =
      extractionStatus === "completed"
        ? "success"
        : extractionStatus === "needs_ocr"
          ? "pending"
          : extractionStatus === "failed"
            ? "error"
            : "";

    const sizeMB = (
      Number(material.file_size || 0) / (1024 * 1024)
    ).toFixed(2);

    const createdDate = material.created_at
      ? new Date(material.created_at).toLocaleDateString()
      : "Unknown date";

    const extractionDetails = extraction
      ? `${Number(extraction.page_count || 0)} pages · ${
          Number(extraction.character_count || 0).toLocaleString()
        } characters`
      : "Text has not been extracted.";

    let actionButton = "";

    if (reviewStatus !== "published") {
      actionButton = `
        <button type="button"
          class="btn btn-primary approve-material"
          data-id="${escapeHTML(material.id)}">
          Approve and extract
        </button>
      `;
    } else if (extractionStatus !== "completed") {
      actionButton = `
        <button type="button"
          class="btn extract-material"
          data-id="${escapeHTML(material.id)}">
          Retry extraction
        </button>
      `;
    }

    return `
      <article class="material-item">
        <h4>${escapeHTML(material.title)}</h4>

        <div class="material-meta">
          Subject: ${escapeHTML(material.subject)}<br>
          Topic: ${escapeHTML(material.topic || "Not specified")}<br>
          File: ${escapeHTML(material.original_filename)}<br>
          Size: ${sizeMB} MB · Uploaded: ${escapeHTML(createdDate)}
        </div>

        <div>
          <span class="material-status ${reviewClass}">
            Review: ${escapeHTML(reviewStatus)}
          </span>

          <span class="material-status ${extractionClass}">
            Extraction: ${escapeHTML(extractionStatus)}
          </span>
        </div>

        <p class="material-meta">
          ${escapeHTML(extractionDetails)}
        </p>

        <div class="material-actions">
          ${actionButton}
        </div>
      </article>
    `;
  }).join("");

  materialsList.querySelectorAll(".approve-material").forEach(button => {
    button.addEventListener("click", () => {
      approveAndExtract(button.dataset.id, button);
    });
  });

  materialsList.querySelectorAll(".extract-material").forEach(button => {
    button.addEventListener("click", () => {
      extractMaterial(button.dataset.id, button);
    });
  });
}

async function loadMaterials() {
  if (!materialsList) return;

  materialsList.innerHTML = `
    <div class="empty-list">Loading textbook library...</div>
  `;

  try {
    const result = await materialRequest(MATERIALS_API_URL);

    renderMaterials(result.materials || []);

  } catch (error) {
    console.error("Material loading error:", error);

    materialsList.innerHTML = `
      <div class="empty-list">
        Could not load textbooks: ${escapeHTML(error.message)}
      </div>
    `;
  }
}

// ==========================================
// UPLOAD TEXTBOOK
// ==========================================

materialUploadForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    showUploadStatus("Administrator access required.", "error");
    return;
  }

  const file = materialFileInput.files[0];

  if (!file) {
    showUploadStatus("Choose a PDF file first.", "error");
    return;
  }

  if (
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    showUploadStatus("Only PDF files are accepted.", "error");
    return;
  }

  if (file.size === 0 || file.size > 20 * 1024 * 1024) {
    showUploadStatus("The PDF must be between 1 byte and 20 MB.", "error");
    return;
  }

  const formData = new FormData();

  formData.append("title", field("material-title").value.trim());
  formData.append("subject", field("material-subject").value.trim());
  formData.append("topic", field("material-topic").value.trim());
  formData.append(
    "submission_notes",
    field("material-notes").value.trim()
  );
  formData.append("file", file);

  uploadButton.disabled = true;
  showUploadStatus("Uploading textbook securely...");

  try {
    const result = await materialRequest(
      MATERIALS_API_URL,
      "POST",
      formData
    );

    showUploadStatus(
      result.message || "Textbook uploaded successfully.",
      "success"
    );

    materialUploadForm.reset();
    await loadMaterials();

  } catch (error) {
    console.error("Textbook upload error:", error);

    showUploadStatus(
      `Upload failed: ${error.message}`,
      "error"
    );

  } finally {
    uploadButton.disabled = false;
  }
});

// ==========================================
// APPROVE AND EXTRACT
// ==========================================

async function approveAndExtract(materialId, button) {
  if (!confirm("Approve this textbook and begin text extraction?")) {
    return;
  }

  button.disabled = true;
  button.textContent = "Approving...";

  try {
    await materialRequest(
      MATERIALS_API_URL,
      "PATCH",
      { materialId }
    );

    button.textContent = "Extracting text...";

    const result = await materialRequest(
      EXTRACT_MATERIAL_URL,
      "POST",
      { materialId }
    );

    const extraction = result.extraction || {};

    if (extraction.extractionStatus === "needs_ocr") {
      showUploadStatus(
        "Textbook approved. Extraction found too little text; OCR may be needed.",
        "error"
      );
    } else {
      showUploadStatus(
        `Text extraction completed. ${Number(
          extraction.pageCount || 0
        )} pages processed.`,
        "success"
      );
    }

    await loadMaterials();

  } catch (error) {
    console.error("Approval/extraction error:", error);

    showUploadStatus(
      `Processing failed: ${error.message}. Refresh the library to check the textbook status.`,
      "error"
    );

    await loadMaterials();

  } finally {
    button.disabled = false;
  }
}

// ==========================================
// RETRY EXTRACTION
// ==========================================

async function extractMaterial(materialId, button) {
  button.disabled = true;
  button.textContent = "Extracting...";

  try {
    const result = await materialRequest(
      EXTRACT_MATERIAL_URL,
      "POST",
      { materialId }
    );

    const extraction = result.extraction || {};

    if (extraction.extractionStatus === "needs_ocr") {
      showUploadStatus(
        "Extraction finished, but OCR may be required.",
        "error"
      );
    } else {
      showUploadStatus(
        "Text extraction completed successfully.",
        "success"
      );
    }

    await loadMaterials();

  } catch (error) {
    console.error("Extraction retry error:", error);

    showUploadStatus(
      `Extraction failed: ${error.message}`,
      "error"
    );

    await loadMaterials();

  } finally {
    button.disabled = false;
  }
}

// ==========================================
// TEXTBOOK REFRESH
// ==========================================

refreshMaterialsButton.addEventListener("click", loadMaterials);

// ==========================================
// QUESTION EDITING
// ==========================================

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

// ==========================================
// QUESTION DISPLAY
// ==========================================

function renderQuestions() {
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

  if (entries.length === 0) {
    questionList.innerHTML = `
      <div class="empty-list">
        No questions found. Add one using the form above.
      </div>
    `;
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
          ${question.sourceDetails
            ? " — " + escapeHTML(question.sourceDetails)
            : ""}
        </p>

        ${question.syllabusObjective ? `
          <p class="hint">
            Syllabus objective: ${escapeHTML(question.syllabusObjective)}
          </p>
        ` : ""}

        <div class="actions">
          <button type="button" class="btn edit-button"
            data-id="${escapeHTML(id)}">Edit</button>

          <button type="button" class="btn btn-danger delete-button"
            data-id="${escapeHTML(id)}">Delete</button>
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

// ==========================================
// AUTHENTICATION AND FIREBASE LISTENER
// ==========================================

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

    showStatus(
      "Access denied. This account is not authorised to manage questions.",
      "error"
    );

    return;
  }

  appContent.style.display = "block";
  field("admin-email").textContent = user.email || "Administrator";

  showStatus("Administrator access confirmed.", "success");

  loadMaterials();

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

// ==========================================
// SAVE OR UPDATE QUESTION
// ==========================================

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    showStatus("You are not authorised to save questions.", "error");
    return;
  }

  const questionData = collectQuestionData();
  if (!questionData) return;

  const now = Date.now();

  const data = {
    type: "multiple-choice",
    ...questionData,
    sourceType: field("sourceType").value,
    verified: field("verified").checked,
    updatedAt: now,
    updatedBy: currentUser.uid
  };

  saveButton.disabled = true;

  try {
    if (editingId) {
      await update(ref(database, `questionBank/${editingId}`), data);
      showStatus("Question updated successfully.", "success");

    } else {
      const newQuestionRef = push(ref(database, "questionBank"));

      await set(newQuestionRef, {
        ...data,
        id: newQuestionRef.key,
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

// ==========================================
// SEND QUESTION TO HAI PENDING API
// ==========================================

pendingButton.addEventListener("click", async () => {
  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    showStatus("You are not authorised to submit questions.", "error");
    return;
  }

  const questionData = collectQuestionData();
  if (!questionData) return;

  pendingButton.disabled = true;
  saveButton.disabled = true;

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch(HAI_PENDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(questionData)
    });

    const responseText = await response.text();

    let result = {};

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = { detail: responseText };
    }

    if (!response.ok) {
      throw new Error(
        result.detail ||
        result.message ||
        `Server rejected the request (${response.status}).`
      );
    }

    showStatus(
      "Question submitted successfully. It is awaiting administrator review.",
      "success"
    );

    resetForm();

  } catch (error) {
    console.error("HAI pending submission error:", error);

    showStatus(
      `Submission failed: ${error.message}`,
      "error"
    );

  } finally {
    pendingButton.disabled = false;
    saveButton.disabled = false;
  }
});

// ==========================================
// OTHER CONTROLS
// ==========================================

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
