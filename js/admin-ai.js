
/*
 * Hysteria's Cure
 * HAI Textbook Question Generator
 *
 * Workflow:
 * 1. Load published, successfully extracted textbooks from Supabase.
 * 2. Retrieve extracted textbook content.
 * 3. Generate question candidates through HAI.
 * 4. Allow administrator review and selection.
 * 5. Submit selected candidates to Firebase's pending queue.
 */

import { auth } from "./firebase-client.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


/* =========================================
   CONFIGURATION
========================================= */

const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const SUPABASE_FUNCTION_URL =
  "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/manage-learning-materials";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_wMSMx1WpGWn7Tk0zBUDAhg_Jlj8RWDO";

const HAI_API_URL =
  "https://hai-api-l7js.onrender.com";

const MAX_TEXT_LENGTH = 300000;


/* =========================================
   ELEMENTS
========================================= */

const $ = id => document.getElementById(id);

const elements = {
  material: $("hai-material"),
  refresh: $("hai-refresh-materials"),
  subject: $("hai-subject"),
  topic: $("hai-topic"),
  chapter: $("hai-chapter"),
  count: $("hai-count"),
  difficulty: $("hai-difficulty"),
  generate: $("hai-generate-button"),
  status: $("hai-generation-status"),
  statistics: $("hai-generation-statistics"),
  results: $("hai-generation-results"),
  questionList: $("hai-question-list"),
  selectAll: $("hai-select-all"),
  deselectAll: $("hai-deselect-all"),
  selectionCount: $("hai-selection-count"),
  submit: $("hai-submit-button")
};


/* =========================================
   STATE
========================================= */

let currentAdmin = null;
let materials = [];
let candidates = [];

let selectedQuestions = new Set();

let generationInProgress = false;
let submissionInProgress = false;


/* =========================================
   INITIAL VALIDATION
========================================= */

const requiredElements = Object.entries(elements)
  .filter(([key, element]) => !element);

if (requiredElements.length) {
  console.error(
    "HAI Admin: Missing HTML elements:",
    requiredElements.map(([key]) => key)
  );

  throw new Error(
    "HAI Admin interface is incomplete. Check the hai element IDs in admin.html."
  );
}


/* =========================================
   UTILITIES
========================================= */

function setStatus(message, type = "warn") {
  elements.status.hidden = false;
  elements.status.textContent = message;

  elements.status.style.borderColor =
    type === "error" ? "#ff7777" :
    type === "success" ? "#65c98b" :
    "var(--border)";
}

function setBusy(button, busy, busyText, normalText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : normalText;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function clearCandidates() {
  candidates = [];
  selectedQuestions.clear();

  elements.questionList.replaceChildren();

  elements.results.hidden = true;
  elements.statistics.hidden = true;
  elements.submit.hidden = true;

  updateSelectionCount();
}

function updateSelectionCount() {
  const count = selectedQuestions.size;

  elements.selectionCount.textContent =
    `${count} question${count === 1 ? "" : "s"} selected.`;

  elements.submit.hidden =
    count === 0 || candidates.length === 0;

  elements.submit.disabled =
    submissionInProgress || count === 0;
}


/* =========================================
   AUTHENTICATION
========================================= */

function getToken() {
  if (
    !currentAdmin ||
    auth.currentUser?.uid !== ADMIN_UID
  ) {
    throw new Error(
      "Administrator authentication is unavailable. Please sign in again."
    );
  }

  return currentAdmin.getIdToken();
}

onAuthStateChanged(auth, async user => {
  currentAdmin = null;

  clearCandidates();

  if (!user) {
    elements.generate.disabled = true;
    elements.refresh.disabled = true;

    setStatus(
      "Sign in as an administrator to use HAI.",
      "error"
    );

    return;
  }

  if (user.uid !== ADMIN_UID) {
    elements.generate.disabled = true;
    elements.refresh.disabled = true;

    setStatus(
      "Access denied. This account is not authorised to use HAI.",
      "error"
    );

    return;
  }

  currentAdmin = user;

  elements.generate.disabled = false;
  elements.refresh.disabled = false;

  setStatus(
    "Administrator verified. Loading available textbooks...",
    "success"
  );

  await loadMaterials();
});


/* =========================================
   RESPONSE HANDLING
========================================= */

async function readResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Server returned an unreadable response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      data?.error ||
      `Request failed (HTTP ${response.status}).`
    );
  }

  return data;
}

async function requestJSON(url, options, serviceName) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    console.error(`${serviceName} network error:`, error);

    throw new Error(
      `Could not connect to ${serviceName}. Check network connectivity, CORS configuration and backend availability.`
    );
  }

  return readResponse(response);
}


/* =========================================
   SUPABASE REQUESTS
========================================= */

async function supabaseRequest(method, body = null) {
  const token = await getToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_PUBLISHABLE_KEY
  };

  const options = {
    method,
    headers
  };

  if (body !== null) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  return requestJSON(
    SUPABASE_FUNCTION_URL,
    options,
    "Supabase textbook service"
  );
}


/* =========================================
   LOAD TEXTBOOKS
========================================= */

async function loadMaterials() {
  if (!currentAdmin) return;

  setBusy(
    elements.refresh,
    true,
    "Loading...",
    "Refresh Textbooks"
  );

  elements.material.disabled = true;

  elements.material.replaceChildren(
    new Option("Loading textbooks...", "")
  );

  try {
    const data = await supabaseRequest("GET");

    if (!data.success || !Array.isArray(data.materials)) {
      throw new Error(
        "Supabase returned an invalid textbook list."
      );
    }

    materials = data.materials.filter(material =>
      material &&
      material.status === "published" &&
      material.extraction?.extraction_status === "completed"
    );

    elements.material.replaceChildren();

    if (!materials.length) {
      elements.material.add(
        new Option("No extracted textbooks available", "")
      );

      setStatus(
        "No published textbooks with completed extraction were found.",
        "warn"
      );

      return;
    }

    elements.material.add(
      new Option("Choose a textbook...", "")
    );

    materials.forEach(material => {
      elements.material.add(
        new Option(
          `${material.title || material.original_filename || "Untitled textbook"} — ${material.subject || "Unspecified subject"}`,
          material.id
        )
      );
    });

    setStatus(
      `${materials.length} extracted textbook(s) available.`,
      "success"
    );

  } catch (error) {
    console.error("Supabase textbook loading failed:", error);

    elements.material.replaceChildren(
      new Option("Could not load textbooks", "")
    );

    setStatus(error.message, "error");

  } finally {
    elements.material.disabled = false;

    setBusy(
      elements.refresh,
      false,
      "Loading...",
      "Refresh Textbooks"
    );
  }
}


/* =========================================
   SELECT TEXTBOOK
========================================= */

elements.material.addEventListener("change", () => {
  const material = materials.find(
    item => item.id === elements.material.value
  );

  clearCandidates();

  if (!material) return;

  elements.subject.value =
    String(material.subject || "").slice(0, 100);

  elements.topic.value =
    String(
      material.topic ||
      material.title ||
      ""
    ).slice(0, 200);

  elements.chapter.value = "";

  setStatus(
    "Textbook selected. Confirm the subject and topic before generating.",
    "success"
  );
});


/* =========================================
   RETRIEVE TEXTBOOK CONTENT
========================================= */

async function retrieveTextbook(materialId) {
  const data = await supabaseRequest(
    "POST",
    { materialId }
  );

  if (!data.success || !data.extraction) {
    throw new Error(
      "Supabase did not return the extracted textbook content."
    );
  }

  const text = data.extraction.extracted_text;

  if (
    typeof text !== "string" ||
    text.trim().length < 20
  ) {
    throw new Error(
      "This textbook does not contain enough extracted text."
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `Textbook exceeds the current ${MAX_TEXT_LENGTH.toLocaleString()} character limit. No text was silently truncated.`
    );
  }

  return {
    text,
    material: data.material
  };
}


/* =========================================
   HAI GENERATION
========================================= */

elements.generate.addEventListener("click", async () => {
  if (generationInProgress || !currentAdmin) return;

  const materialId = elements.material.value;
  const subject = elements.subject.value.trim();
  const topic = elements.topic.value.trim();

  const chapter =
    elements.chapter.value.trim() || "Unspecified";

  const count = Number(elements.count.value);
  const difficulty = Number(elements.difficulty.value);

  if (!materialId) {
    setStatus("Select a textbook first.", "error");
    return;
  }

  if (!subject || subject.length > 100) {
    setStatus("Enter a valid subject.", "error");
    return;
  }

  if (!topic || topic.length > 200) {
    setStatus("Enter a valid topic.", "error");
    return;
  }

  if (chapter.length > 200) {
    setStatus("Chapter name is too long.", "error");
    return;
  }

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    setStatus(
      "Question count must be between 1 and 100.",
      "error"
    );
    return;
  }

  if (
    !Number.isInteger(difficulty) ||
    difficulty < 1 ||
    difficulty > 7
  ) {
    setStatus(
      "Difficulty must be between 1 and 7.",
      "error"
    );
    return;
  }

  generationInProgress = true;

  setBusy(
    elements.generate,
    true,
    "Generating...",
    "Generate Questions"
  );

  elements.refresh.disabled = true;

  clearCandidates();

  try {
    setStatus(
      "Retrieving textbook content from Supabase...",
      "warn"
    );

    let textbook;

    try {
      textbook = await retrieveTextbook(materialId);
    } catch (error) {
      throw new Error(
        `Supabase textbook retrieval failed: ${error.message}`
      );
    }

    const documentName = String(
      textbook.material?.title ||
      textbook.material?.original_filename ||
      "Untitled textbook"
    ).slice(0, 200);

    const token = await getToken();

    setStatus(
      "Sending extracted content to HAI...",
      "warn"
    );

    let data;

    try {
      data = await requestJSON(
        `${HAI_API_URL}/textbooks/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            text: textbook.text,
            subject,
            topic,
            document: documentName,
            chapter,
            count,
            difficulty
          })
        },
        "HAI generation API"
      );
    } catch (error) {
      throw new Error(
        `HAI generation failed: ${error.message}`
      );
    }

    if (!Array.isArray(data.questions)) {
      throw new Error(
        "HAI returned an invalid questions list."
      );
    }

    candidates = data.questions.filter(question =>
      question &&
      typeof question.question === "string" &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      Number.isInteger(question.answerIndex) &&
      question.answerIndex >= 0 &&
      question.answerIndex <= 3
    );

    if (!candidates.length) {
      throw new Error(
        "HAI did not return any valid four-option questions."
      );
    }

    selectedQuestions.clear();

    displayStatistics(data.statistics || {});
    renderCandidates();

    setStatus(
      `HAI generated ${candidates.length} valid question candidates. Review them before submission.`,
      "success"
    );

  } catch (error) {
    console.error("HAI generation error:", error);

    setStatus(
      error.message || "Question generation failed.",
      "error"
    );

  } finally {
    generationInProgress = false;

    setBusy(
      elements.generate,
      false,
      "Generating...",
      "Generate Questions"
    );

    elements.refresh.disabled = false;
  }
});


/* =========================================
   GENERATION STATISTICS
========================================= */

function displayStatistics(statistics) {
  elements.statistics.replaceChildren();

  elements.statistics.appendChild(
    createElement("h3", "", "Generation Statistics")
  );

  const entries = Object.entries(statistics);

  if (!entries.length) {
    elements.statistics.appendChild(
      createElement(
        "p",
        "muted",
        "No statistics were returned."
      )
    );
  } else {
    entries.forEach(([key, value]) => {
      elements.statistics.appendChild(
        createElement(
          "p",
          "achievement-meta",
          `${key.replace(/_/g, " ")}: ${
            typeof value === "object"
              ? JSON.stringify(value)
              : String(value)
          }`
        )
      );
    });
  }

  elements.statistics.hidden = false;
}


/* =========================================
   QUESTION CANDIDATES
========================================= */

function renderCandidates() {
  elements.questionList.replaceChildren();

  candidates.forEach((candidate, index) => {
    const card = createElement(
      "article",
      "achievement-item"
    );

    const top = createElement(
      "div",
      "achievement-top"
    );

    const title = createElement(
      "strong",
      "",
      `Question ${index + 1}`
    );

    const label = createElement("label");

    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = selectedQuestions.has(index);
    checkbox.style.width = "auto";
    checkbox.style.margin = "0";

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedQuestions.add(index);
      } else {
        selectedQuestions.delete(index);
      }

      updateSelectionCount();
    });

    label.append(
      checkbox,
      document.createTextNode("Keep this question")
    );

    top.append(title, label);
    card.appendChild(top);

    card.appendChild(
      createElement("p", "", candidate.question)
    );

    const options = document.createElement("ol");

    candidate.options.forEach((option, optionIndex) => {
      const item = createElement(
        "li",
        "",
        `${String.fromCharCode(65 + optionIndex)}. ${option}`
      );

      if (optionIndex === candidate.answerIndex) {
        item.style.fontWeight = "700";
        item.style.color = "#9be6b1";
      }

      options.appendChild(item);
    });

    card.appendChild(options);

    card.appendChild(
      createElement(
        "p",
        "achievement-meta",
        `Correct answer: ${String.fromCharCode(65 + candidate.answerIndex)}`
      )
    );

    if (candidate.explanation) {
      card.appendChild(
        createElement(
          "p",
          "achievement-meta",
          `Explanation: ${candidate.explanation}`
        )
      );
    }

    if (candidate.sourceDetails) {
      card.appendChild(
        createElement(
          "p",
          "achievement-meta",
          `Source: ${candidate.sourceDetails}`
        )
      );
    }

    if (candidate.syllabusObjective) {
      card.appendChild(
        createElement(
          "p",
          "achievement-meta",
          `Syllabus objective: ${candidate.syllabusObjective}`
        )
      );
    }

    card.appendChild(
      createElement(
        "p",
        "achievement-meta",
        `Difficulty: ${candidate.difficulty ?? "Not specified"}`
      )
    );

    elements.questionList.appendChild(card);
  });

  elements.results.hidden = false;

  updateSelectionCount();
}


/* =========================================
   SELECT / DESELECT
========================================= */

elements.selectAll.addEventListener("click", () => {
  candidates.forEach((_, index) => {
    selectedQuestions.add(index);
  });

  renderCandidates();
});

elements.deselectAll.addEventListener("click", () => {
  selectedQuestions.clear();
  renderCandidates();
});


/* =========================================
   SUBMIT TO FIREBASE PENDING QUEUE
========================================= */

elements.submit.addEventListener("click", async () => {
  if (
    submissionInProgress ||
    !currentAdmin ||
    selectedQuestions.size === 0
  ) {
    return;
  }

  const selected = [...selectedQuestions]
    .sort((a, b) => a - b)
    .map(index => candidates[index])
    .filter(Boolean);

  if (!selected.length || selected.length > 100) {
    setStatus(
      "Select between 1 and 100 valid questions.",
      "error"
    );
    return;
  }

  submissionInProgress = true;

  setBusy(
    elements.submit,
    true,
    "Submitting...",
    "Submit Selected Questions for Review"
  );

  elements.generate.disabled = true;
  elements.refresh.disabled = true;

  try {
    const token = await getToken();

    const questions = selected.map(question => ({
      subject: String(
        question.subject || elements.subject.value
      ).slice(0, 100),

      topic: String(
        question.topic || elements.topic.value
      ).slice(0, 200),

      question: question.question,

      difficulty: Number(question.difficulty),

      options: question.options,

      answerIndex: question.answerIndex,

      explanation: String(question.explanation || ""),

      sourceDetails: String(
        question.sourceDetails || "Generated by HAI"
      ),

      syllabusObjective: String(
        question.syllabusObjective || ""
      )
    }));

    setStatus(
      "Submitting questions to the Firebase review queue...",
      "warn"
    );

    const data = await requestJSON(
      `${HAI_API_URL}/questions/pending/batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions })
      },
      "HAI Firebase submission API"
    );

    if (
      typeof data.submitted_count !== "number" ||
      data.submitted_count !== questions.length
    ) {
      throw new Error(
        "The server did not confirm that every selected question was submitted."
      );
    }

    const submittedIndices = new Set(selectedQuestions);

    candidates = candidates.filter(
      (_, index) => !submittedIndices.has(index)
    );

    selectedQuestions.clear();

    renderCandidates();

    setStatus(
      `${data.submitted_count} questions submitted successfully. They are awaiting administrator review and have not been published.`,
      "success"
    );

    if (!candidates.length) {
      elements.results.hidden = true;
      elements.statistics.hidden = true;
    }

  } catch (error) {
    console.error("Question submission failed:", error);

    setStatus(
      `Submission failed: ${error.message}`,
      "error"
    );

  } finally {
    submissionInProgress = false;

    elements.generate.disabled = false;
    elements.refresh.disabled = false;

    setBusy(
      elements.submit,
      false,
      "Submitting...",
      "Submit Selected Questions for Review"
    );

    updateSelectionCount();
  }
});


/* =========================================
   REFRESH TEXTBOOKS
========================================= */

elements.refresh.addEventListener(
  "click",
  loadMaterials
);
