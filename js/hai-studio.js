
/*
 * Hysteria's Cure
 * HAI Question Studio
 *
 * Workflow:
 * 1. Authenticate administrator.
 * 2. Load extracted textbooks from Supabase.
 * 3. Check HAI API availability.
 * 4. Generate question candidates.
 * 5. Edit and approve candidates.
 * 6. Submit approved questions to Firebase's pending queue.
 */

import { auth } from "./firebase-client.js";

import {
  onAuthStateChanged,
  signOut
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

const el = {
  pageMessage: $("page-message"),
  content: $("studio-content"),
  logout: $("logout-button"),

  apiCheck: $("check-api-button"),
  apiStatus: $("api-status"),

  material: $("hai-material"),
  refresh: $("refresh-materials"),
  subject: $("hai-subject"),
  topic: $("hai-topic"),
  chapter: $("hai-chapter"),
  count: $("hai-count"),
  difficulty: $("hai-difficulty"),

  generate: $("generate-button"),
  generationStatus: $("generation-status"),
  statistics: $("generation-statistics"),

  review: $("review-section"),
  questionList: $("question-list"),
  approveAll: $("approve-all-button"),
  unapproveAll: $("unapprove-all-button"),
  approvalCount: $("approval-count"),

  submit: $("submit-button"),
  submissionStatus: $("submission-status")
};


/* =========================================
   ELEMENT VALIDATION
========================================= */

const requiredElements = Object.entries(el).filter(
  ([, element]) => !element
);

if (requiredElements.length) {
  console.error(
    "HAI Studio is missing HTML elements:",
    requiredElements.map(([name]) => name)
  );

  throw new Error(
    `HAI Studio initialization failed. Missing elements: ${
      requiredElements.map(([name]) => name).join(", ")
    }`
  );
}


/* =========================================
   STATE
========================================= */

let currentAdmin = null;
let materials = [];
let candidates = [];

let generationInProgress = false;
let submissionInProgress = false;
let apiAvailable = false;


/* =========================================
   UTILITIES
========================================= */

function setMessage(element, message, type = "normal") {
  element.textContent = message;

  element.style.borderColor =
    type === "error" ? "#ff7777" :
    type === "success" ? "#65c98b" :
    "var(--border)";
}

function setBusy(button, busy, busyText, normalText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : normalText;
}

function isAdmin() {
  return Boolean(
    currentAdmin &&
    auth.currentUser &&
    currentAdmin.uid === ADMIN_UID &&
    auth.currentUser.uid === ADMIN_UID
  );
}

function createElement(tag, className, value) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (value !== undefined && value !== null) {
    node.textContent = String(value);
  }

  return node;
}


/* =========================================
   GENERATION BUTTON STATE
========================================= */

function updateGenerateButton() {
  const materialSelected =
    Boolean(el.material.value);

  const subjectProvided =
    Boolean(el.subject.value.trim());

  const topicProvided =
    Boolean(el.topic.value.trim());

  const count = Number(el.count.value);
  const difficulty = Number(el.difficulty.value);

  const validCount =
    Number.isInteger(count) &&
    count >= 1 &&
    count <= 100;

  const validDifficulty =
    Number.isInteger(difficulty) &&
    difficulty >= 1 &&
    difficulty <= 7;

  const ready =
    isAdmin() &&
    materialSelected &&
    subjectProvided &&
    topicProvided &&
    validCount &&
    validDifficulty;

  el.generate.disabled =
    !ready ||
    generationInProgress ||
    submissionInProgress;

  return ready;
}


/* =========================================
   REVIEW STATE
========================================= */

function clearReview() {
  candidates = [];

  el.questionList.replaceChildren();
  el.review.hidden = true;
  el.statistics.hidden = true;

  updateApprovalCount();
}

function updateApprovalCount() {
  const approved = candidates.filter(
    question => question.approved
  ).length;

  el.approvalCount.textContent =
    `${approved} of ${candidates.length} questions approved.`;

  el.submit.disabled =
    approved === 0 ||
    submissionInProgress ||
    !isAdmin();

  el.submit.textContent =
    `Submit ${approved} approved question${approved === 1 ? "" : "s"}`;
}


/* =========================================
   AUTHENTICATION
========================================= */

async function getToken(forceRefresh = false) {
  if (!isAdmin()) {
    throw new Error(
      "Administrator authentication is unavailable. Sign in again."
    );
  }

  const token = await auth.currentUser.getIdToken(forceRefresh);

  if (!token || typeof token !== "string") {
    throw new Error("Firebase returned an empty authentication token.");
  }

  if (
    !/^[\x21-\x7E]+$/.test(token) ||
    token.split(".").length !== 3
  ) {
    throw new Error(
      "Firebase returned an incorrectly formatted authentication token."
    );
  }

  return token;
}


/* =========================================
   LOGOUT
========================================= */

el.logout.addEventListener("click", async () => {
  el.logout.disabled = true;

  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("Logout failed:", error);

    setMessage(
      el.pageMessage,
      "Logout failed. Check your connection and try again.",
      "error"
    );

    el.logout.disabled = false;
  }
});


/* =========================================
   HTTP RESPONSE HANDLING
========================================= */

async function readResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `The server returned an unreadable response (HTTP ${response.status}).`
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
    console.error(`${serviceName} connection error:`, {
      name: error.name,
      message: error.message,
      url
    });

    throw new Error(
      `${serviceName}: ${error.name}: ${error.message}`
    );
  }

  return readResponse(response);
}


/* =========================================
   SUPABASE
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
  if (!isAdmin()) return;

  setBusy(
    el.refresh,
    true,
    "Loading...",
    "Refresh textbooks"
  );

  el.material.disabled = true;

  el.material.replaceChildren(
    new Option("Loading textbooks...", "")
  );

  try {
    const data = await supabaseRequest("GET");

    if (!data.success || !Array.isArray(data.materials)) {
      throw new Error("Invalid textbook list returned by Supabase.");
    }

    materials = data.materials.filter(material =>
      material &&
      material.status === "published" &&
      material.extraction?.extraction_status === "completed"
    );

    el.material.replaceChildren();

    if (!materials.length) {
      el.material.add(
        new Option("No extracted textbooks available", "")
      );

      setMessage(
        el.generationStatus,
        "No published textbooks with completed extraction were found."
      );

      return;
    }

    el.material.add(
      new Option("Choose a textbook...", "")
    );

    materials.forEach(material => {
      el.material.add(
        new Option(
          `${material.title || material.original_filename || "Untitled"} — ${material.subject || "Unspecified subject"}`,
          material.id
        )
      );
    });

    setMessage(
      el.generationStatus,
      `${materials.length} extracted textbook(s) available.`,
      "success"
    );

  } catch (error) {
    console.error("Textbook loading failed:", error);

    el.material.replaceChildren(
      new Option("Could not load textbooks", "")
    );

    setMessage(
      el.generationStatus,
      error.message,
      "error"
    );

  } finally {
    el.material.disabled = false;

    setBusy(
      el.refresh,
      false,
      "Loading...",
      "Refresh textbooks"
    );

    updateGenerateButton();
  }
}


/* =========================================
   FORM INPUT LISTENERS
========================================= */

[
  el.material,
  el.subject,
  el.topic,
  el.chapter,
  el.count,
  el.difficulty
].forEach(element => {
  element.addEventListener("input", updateGenerateButton);
  element.addEventListener("change", updateGenerateButton);
});


/* =========================================
   TEXTBOOK SELECTION
========================================= */

el.material.addEventListener("change", () => {
  const material = materials.find(
    item => item.id === el.material.value
  );

  clearReview();

  if (!material) {
    updateGenerateButton();
    return;
  }

  el.subject.value =
    String(material.subject || "").slice(0, 100);

  el.topic.value =
    String(material.topic || material.title || "").slice(0, 200);

  el.chapter.value = "";

  setMessage(
    el.generationStatus,
    "Textbook selected. Confirm the subject and topic.",
    "success"
  );

  updateGenerateButton();
});


/* =========================================
   HAI API HEALTH CHECK
========================================= */

async function checkHAI(showMessage = true) {
  el.apiCheck.disabled = true;
  el.apiCheck.textContent = "Checking...";

  if (showMessage) {
    setMessage(
      el.apiStatus,
      "Contacting HAI server..."
    );
  }

  try {
    const response = await fetch(`${HAI_API_URL}/health`, {
      method: "GET",
      cache: "no-store"
    });

    const data = await readResponse(response);

    apiAvailable = data.status === "healthy";

    if (!apiAvailable) {
      throw new Error("HAI server responded but is not healthy.");
    }

    setMessage(
      el.apiStatus,
      `HAI is reachable. API version: ${data.api_version || "Unknown"}. Engines loaded: ${data.engines_loaded ? "Yes" : "No"}.`,
      "success"
    );

    return true;

  } catch (error) {
    apiAvailable = false;

    console.error("HAI health check failed:", error);

    setMessage(
      el.apiStatus,
      `HAI connection failed: ${error.message}`,
      "error"
    );

    return false;

  } finally {
    el.apiCheck.disabled = false;
    el.apiCheck.textContent = "Check connection";
  }
}

el.apiCheck.addEventListener("click", () => checkHAI(true));


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
      "Supabase did not return extracted textbook content."
    );
  }

  const text = data.extraction.extracted_text;

  if (typeof text !== "string" || text.trim().length < 20) {
    throw new Error(
      "The textbook does not contain enough extracted text."
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `The textbook exceeds the ${MAX_TEXT_LENGTH.toLocaleString()} character limit.`
    );
  }

  return {
    text,
    material: data.material
  };
}


/* =========================================
   GENERATE QUESTIONS
========================================= */

el.generate.addEventListener("click", async () => {
  if (!updateGenerateButton()) {
    setMessage(
      el.generationStatus,
      "Complete all required fields before generating questions.",
      "error"
    );
    return;
  }

  if (generationInProgress || !isAdmin()) return;

  const materialId = el.material.value;
  const subject = el.subject.value.trim();
  const topic = el.topic.value.trim();
  const chapter = el.chapter.value.trim() || "Unspecified";
  const count = Number(el.count.value);
  const difficulty = Number(el.difficulty.value);

  generationInProgress = true;

  updateGenerateButton();

  el.refresh.disabled = true;
  clearReview();

  try {
    setMessage(
      el.generationStatus,
      "Checking HAI server availability..."
    );

    const healthy = await checkHAI(false);

    if (!healthy) {
      throw new Error(
        "HAI is not reachable. Check the server connection before trying again."
      );
    }

    setMessage(
      el.generationStatus,
      "Retrieving textbook content from Supabase..."
    );

    const textbook = await retrieveTextbook(materialId);

    const documentName = String(
      textbook.material?.title ||
      textbook.material?.original_filename ||
      "Untitled textbook"
    ).slice(0, 200);

    const token = await getToken(true);

    setMessage(
      el.generationStatus,
      "Sending extracted content to HAI. This may take a while..."
    );

    const data = await requestJSON(
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

    if (!Array.isArray(data.questions)) {
      throw new Error(
        "HAI returned an invalid questions list."
      );
    }

    candidates = data.questions
      .filter(question =>
        question &&
        typeof question.question === "string" &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        Number.isInteger(question.answerIndex) &&
        question.answerIndex >= 0 &&
        question.answerIndex <= 3
      )
      .map(question => ({
        ...question,
        question: String(question.question),
        options: question.options.map(option => String(option)),
        answerIndex: question.answerIndex,
        explanation: String(question.explanation || ""),
        difficulty: Number(question.difficulty || difficulty),
        approved: false
      }));

    if (!candidates.length) {
      throw new Error(
        "HAI did not return any valid four-option questions."
      );
    }

    displayStatistics(data.statistics || {});
    renderCandidates();

    setMessage(
      el.generationStatus,
      `${candidates.length} valid question candidates generated. Review and edit them below.`,
      "success"
    );

  } catch (error) {
    console.error("Generation failed:", error);

    setMessage(
      el.generationStatus,
      error.message || "Question generation failed.",
      "error"
    );

  } finally {
    generationInProgress = false;

    el.refresh.disabled = false;

    updateGenerateButton();
  }
});


/* =========================================
   STATISTICS
========================================= */

function displayStatistics(statistics) {
  el.statistics.replaceChildren();

  el.statistics.appendChild(
    createElement("h3", "", "Generation statistics")
  );

  const entries = Object.entries(statistics);

  if (!entries.length) {
    el.statistics.appendChild(
      createElement("p", "muted", "No statistics returned.")
    );
  } else {
    entries.forEach(([key, value]) => {
      const displayValue =
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

      el.statistics.appendChild(
        createElement(
          "p",
          "question-meta",
          `${key.replace(/_/g, " ")}: ${displayValue}`
        )
      );
    });
  }

  el.statistics.hidden = false;
}


/* =========================================
   EDITABLE QUESTION REVIEW
========================================= */

function updateCandidate(index, property, value) {
  if (!candidates[index]) return;

  candidates[index][property] = value;
}

function renderCandidates() {
  el.questionList.replaceChildren();

  candidates.forEach((candidate, index) => {
    const card = createElement(
      "article",
      `question-card${candidate.approved ? " approved" : ""}`
    );

    const header = createElement(
      "div",
      "question-card-header"
    );

    header.appendChild(
      createElement("strong", "", `Question ${index + 1}`)
    );

    const approvalLabel = createElement(
      "label",
      "approval-control"
    );

    const approval = document.createElement("input");
    approval.type = "checkbox";
    approval.checked = candidate.approved;

    approval.addEventListener("change", () => {
      candidate.approved = approval.checked;
      card.classList.toggle("approved", candidate.approved);
      updateApprovalCount();
    });

    approvalLabel.append(
      approval,
      document.createTextNode("Approve this question")
    );

    header.appendChild(approvalLabel);
    card.appendChild(header);

    // Question text
    const questionLabel = createElement("label", "", "Question");
    const questionInput = document.createElement("textarea");

    questionInput.value = candidate.question;
    questionInput.maxLength = 10000;

    questionInput.addEventListener("input", () => {
      updateCandidate(index, "question", questionInput.value);
    });

    card.append(questionLabel, questionInput);

    // Options
    const optionHeading = createElement(
      "p",
      "muted",
      "Answer options"
    );

    card.appendChild(optionHeading);

    candidate.options.forEach((option, optionIndex) => {
      const group = createElement("div", "option-group");

      const label = createElement(
        "label",
        "",
        `Option ${String.fromCharCode(65 + optionIndex)}`
      );

      const input = document.createElement("textarea");

      input.value = option;
      input.maxLength = 2000;

      input.addEventListener("input", () => {
        candidate.options[optionIndex] = input.value;
      });

      group.append(label, input);
      card.appendChild(group);
    });

    // Correct answer
    const answerLabel = createElement(
      "label",
      "",
      "Correct answer"
    );

    const answerSelect = document.createElement("select");
    answerSelect.className = "answer-select";

    candidate.options.forEach((_, optionIndex) => {
      answerSelect.add(
        new Option(
          `Option ${String.fromCharCode(65 + optionIndex)}`,
          String(optionIndex)
        )
      );
    });

    answerSelect.value = String(candidate.answerIndex);

    answerSelect.addEventListener("change", () => {
      candidate.answerIndex = Number(answerSelect.value);
    });

    card.append(answerLabel, answerSelect);

    // Explanation
    const explanationLabel = createElement(
      "label",
      "",
      "Explanation"
    );

    const explanationInput = document.createElement("textarea");

    explanationInput.value = candidate.explanation;
    explanationInput.maxLength = 5000;
    explanationInput.placeholder =
      "Explain why the correct answer is right.";

    explanationInput.addEventListener("input", () => {
      candidate.explanation = explanationInput.value;
    });

    card.append(explanationLabel, explanationInput);

    // Difficulty
    const difficultyLabel = createElement(
      "label",
      "",
      "Difficulty (1–7)"
    );

    const difficultyInput = document.createElement("input");

    difficultyInput.type = "number";
    difficultyInput.min = "1";
    difficultyInput.max = "7";
    difficultyInput.step = "1";
    difficultyInput.value = String(candidate.difficulty);

    difficultyInput.addEventListener("change", () => {
      candidate.difficulty = Number(difficultyInput.value);
    });

    card.append(difficultyLabel, difficultyInput);

    // Source information
    if (candidate.sourceDetails) {
      card.appendChild(
        createElement(
          "p",
          "question-meta",
          `Source: ${candidate.sourceDetails}`
        )
      );
    }

    if (candidate.syllabusObjective) {
      card.appendChild(
        createElement(
          "p",
          "question-meta",
          `Syllabus objective: ${candidate.syllabusObjective}`
        )
      );
    }

    el.questionList.appendChild(card);
  });

  el.review.hidden = candidates.length === 0;

  updateApprovalCount();
}


/* =========================================
   APPROVE / UNAPPROVE ALL
========================================= */

el.approveAll.addEventListener("click", () => {
  candidates.forEach(question => {
    question.approved = true;
  });

  renderCandidates();
});

el.unapproveAll.addEventListener("click", () => {
  candidates.forEach(question => {
    question.approved = false;
  });

  renderCandidates();
});


/* =========================================
   VALIDATE APPROVED QUESTIONS
========================================= */

function validateApprovedQuestions(approved) {
  for (let index = 0; index < approved.length; index++) {
    const question = approved[index];

    if (!question.question.trim()) {
      throw new Error(
        `Question ${index + 1} has empty question text.`
      );
    }

    if (
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      question.options.some(option => !String(option).trim())
    ) {
      throw new Error(
        `Question ${index + 1} must have four non-empty options.`
      );
    }

    if (
      !Number.isInteger(question.answerIndex) ||
      question.answerIndex < 0 ||
      question.answerIndex > 3
    ) {
      throw new Error(
        `Question ${index + 1} has an invalid correct answer.`
      );
    }

    if (
      typeof question.explanation !== "string" ||
      !question.explanation.trim()
    ) {
      throw new Error(
        `Question ${index + 1} needs an explanation before submission.`
      );
    }

    if (
      !Number.isInteger(question.difficulty) ||
      question.difficulty < 1 ||
      question.difficulty > 7
    ) {
      throw new Error(
        `Question ${index + 1} has an invalid difficulty.`
      );
    }
  }
}


/* =========================================
   SUBMIT APPROVED QUESTIONS
========================================= */

el.submit.addEventListener("click", async () => {
  if (submissionInProgress || !isAdmin()) return;

  const approved = candidates.filter(
    question => question.approved
  );

  if (!approved.length) {
    setMessage(
      el.submissionStatus,
      "Approve at least one question first.",
      "error"
    );
    return;
  }

  if (approved.length > 100) {
    setMessage(
      el.submissionStatus,
      "Submit no more than 100 questions at a time.",
      "error"
    );
    return;
  }

  try {
    validateApprovedQuestions(approved);
  } catch (error) {
    setMessage(
      el.submissionStatus,
      error.message,
      "error"
    );
    return;
  }

  submissionInProgress = true;
  updateApprovalCount();
  updateGenerateButton();

  setBusy(
    el.submit,
    true,
    "Submitting...",
    "Submit approved questions"
  );

  el.generate.disabled = true;
  el.refresh.disabled = true;

  try {
    const token = await getToken(true);

    const questions = approved.map(question => ({
      subject: String(
        question.subject || el.subject.value
      ).slice(0, 100),

      topic: String(
        question.topic || el.topic.value
      ).slice(0, 200),

      question: question.question.trim(),

      difficulty: question.difficulty,

      options: question.options.map(option =>
        String(option).trim()
      ),

      answerIndex: question.answerIndex,

      explanation: question.explanation.trim(),

      sourceDetails: String(
        question.sourceDetails || "Generated by HAI"
      ),

      syllabusObjective: String(
        question.syllabusObjective || ""
      )
    }));

    setMessage(
      el.submissionStatus,
      "Sending approved questions to the Firebase review queue..."
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
      "HAI question submission API"
    );

    if (
      typeof data.submitted_count !== "number" ||
      data.submitted_count !== questions.length
    ) {
      throw new Error(
        "The server did not confirm that every question was submitted."
      );
    }

    const submittedSet = new Set(approved);

    candidates = candidates.filter(
      question => !submittedSet.has(question)
    );

    renderCandidates();

    setMessage(
      el.submissionStatus,
      `${data.submitted_count} questions submitted successfully. They are awaiting review and have not been published.`,
      "success"
    );

  } catch (error) {
    console.error("Question submission failed:", error);

    setMessage(
      el.submissionStatus,
      `Submission failed: ${error.message}`,
      "error"
    );

  } finally {
    submissionInProgress = false;

    el.refresh.disabled = !isAdmin();

    updateApprovalCount();
    updateGenerateButton();
  }
});


/* =========================================
   INITIALIZE
========================================= */

onAuthStateChanged(auth, async user => {
  currentAdmin = null;
  clearReview();

  if (!user) {
    el.content.hidden = true;
    window.location.replace("login.html");
    return;
  }

  if (user.uid !== ADMIN_UID) {
    el.content.hidden = true;

    setMessage(
      el.pageMessage,
      "Access denied. Administrator privileges are required.",
      "error"
    );

    return;
  }

  currentAdmin = user;

  el.content.hidden = false;
  el.pageMessage.hidden = true;

  updateGenerateButton();

  setMessage(
    el.generationStatus,
    "Administrator verified. Loading textbooks...",
    "success"
  );

  await loadMaterials();

  updateGenerateButton();
});
