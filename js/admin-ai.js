
/*
 * Hysteria's Cure
 * Admin Controller — GPT-6 Luna Integration
 *
 * Handles:
 * - Administrator authentication for AI actions
 * - GPT-6 Luna question generation
 * - Candidate preview
 * - Administrator approval and publishing
 * - Candidate status updates
 *
 * This controller is compatible with the existing admin.html.
 * It does not require the separate redesigned dashboard elements.
 */

import { auth, database } from "./firebase-client.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  ref,
  get,
  update
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

/* =========================================
   CONFIGURATION
========================================= */

const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const AI_BACKEND_URL =
  "https://silver-raindrop-743021.netlify.app/.netlify/functions/generate-question";

/* =========================================
   ELEMENTS
========================================= */

const $ = id => document.getElementById(id);

const form = $("ai-generation-form");
const statusElement = $("ai-generation-status");
const resultElement = $("ai-generation-result");
const resultContent = $("ai-result-content");
const generateButton = $("ai-generate-button");
const publishButton = $("ai-publish-button");

let currentAdmin = null;
let generatedCandidate = null;
let generationInProgress = false;
let publishingInProgress = false;

/* =========================================
   UTILITIES
========================================= */

function isAuthorised() {
  return Boolean(
    currentAdmin &&
    auth.currentUser &&
    currentAdmin.uid === ADMIN_UID &&
    auth.currentUser.uid === ADMIN_UID
  );
}

function setStatus(message, type = "info") {
  if (!statusElement) return;

  statusElement.hidden = false;
  statusElement.textContent = message;

  statusElement.style.borderColor =
    type === "error"
      ? "#ff7777"
      : type === "success"
        ? "#69c98b"
        : "var(--border)";
}

function clearCandidate() {
  generatedCandidate = null;

  if (resultElement) {
    resultElement.hidden = true;
  }

  if (resultContent) {
    resultContent.replaceChildren();
  }

  if (publishButton) {
    publishButton.hidden = true;
  }
}

function addText(parent, heading, value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  const section = document.createElement("div");
  section.style.marginBottom = "14px";

  const title = document.createElement("strong");
  title.textContent = heading;

  const content = document.createElement("p");
  content.style.whiteSpace = "pre-wrap";
  content.style.overflowWrap = "anywhere";
  content.textContent =
    typeof value === "object"
      ? JSON.stringify(value, null, 2)
      : String(value);

  section.append(title, content);
  parent.appendChild(section);
}

function displayCandidate(candidate, observationId) {
  resultContent.replaceChildren();

  addText(resultContent, "Question", candidate.question);

  if (Array.isArray(candidate.options)) {
    const listSection = document.createElement("div");
    listSection.style.marginBottom = "14px";

    const heading = document.createElement("strong");
    heading.textContent = "Options";

    const list = document.createElement("ol");

    candidate.options.forEach((option, index) => {
      const item = document.createElement("li");
      item.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
      list.appendChild(item);
    });

    listSection.append(heading, list);
    resultContent.appendChild(listSection);
  }

  addText(
    resultContent,
    "Correct answer",
    candidate.correctAnswer
  );

  addText(
    resultContent,
    "Expected answer",
    candidate.expectedAnswer
  );

  addText(
    resultContent,
    "Explanation",
    candidate.explanation
  );

  addText(
    resultContent,
    "Marking scheme",
    candidate.markingScheme
  );

  addText(
    resultContent,
    "Difficulty",
    candidate.difficulty
  );

  addText(
    resultContent,
    "Candidate ID",
    candidate.id
  );

  addText(
    resultContent,
    "Teacher observation ID",
    observationId
  );

  const note = document.createElement("p");
  note.className = "muted";
  note.textContent =
    "This candidate is awaiting your review. It has not been published.";

  resultContent.appendChild(note);

  resultElement.hidden = false;
}

/* =========================================
   GENERATE QUESTION
========================================= */

async function generateQuestion(event) {
  event.preventDefault();

  if (generationInProgress) return;

  if (!isAuthorised()) {
    setStatus(
      "Administrator authentication is unavailable. Please sign in again.",
      "error"
    );
    return;
  }

  const subject = $("ai-subject").value.trim();
  const topic = $("ai-topic").value.trim();
  const difficulty = Number($("ai-difficulty").value);
  const type = $("ai-type").value;
  const instructions = $("ai-instructions").value.trim();

  if (!subject || subject.length > 80) {
    setStatus("Enter a valid subject.", "error");
    return;
  }

  if (!topic || topic.length > 120) {
    setStatus("Enter a valid topic.", "error");
    return;
  }

  if (
    !Number.isInteger(difficulty) ||
    difficulty < 1 ||
    difficulty > 7
  ) {
    setStatus("Difficulty must be a whole number from 1 to 7.", "error");
    return;
  }

  if (
    !["multiple-choice", "written-response"].includes(type)
  ) {
    setStatus("Select a valid question type.", "error");
    return;
  }

  if (instructions.length > 1000) {
    setStatus("Additional instructions are too long.", "error");
    return;
  }

  generationInProgress = true;
  generateButton.disabled = true;
  generateButton.textContent = "Generating...";

  clearCandidate();
  setStatus("Contacting GPT-6 Luna. Please wait...");

  try {
    const token = await currentAdmin.getIdToken();

    const response = await fetch(AI_BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        subject,
        topic,
        difficulty,
        type,
        instructions
      })
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `The backend returned an unreadable response (HTTP ${response.status}).`
      );
    }

    if (!response.ok || data.status !== "success") {
      throw new Error(
        data.message ||
        `Question generation failed (HTTP ${response.status}).`
      );
    }

    const candidate = data.candidate;

    if (
      !candidate ||
      typeof candidate !== "object" ||
      !candidate.id ||
      typeof candidate.question !== "string"
    ) {
      throw new Error("The backend returned an invalid candidate.");
    }

    generatedCandidate = candidate;

    displayCandidate(candidate, data.observationId);

    if (candidate.type === "multiple-choice") {
      publishButton.hidden = false;

      setStatus(
        "Candidate generated and saved. Review it before approving.",
        "success"
      );
    } else {
      publishButton.hidden = true;

      setStatus(
        "Written-response candidate saved for review. Publishing is disabled until the question bank supports written-response questions.",
        "success"
      );
    }

  } catch (error) {
    console.error("GPT-6 Luna generation failed:", error);

    let message =
      error?.message || "An unexpected error occurred.";

    if (error instanceof TypeError) {
      message =
        "Could not reach the AI backend. Check your connection, Netlify deployment and allowed website origin.";
    }

    setStatus(message, "error");

  } finally {
    generationInProgress = false;
    generateButton.disabled = false;
    generateButton.textContent = "Generate Question";
  }
}

/* =========================================
   APPROVE AND PUBLISH
========================================= */

async function approveCandidate() {
  if (publishingInProgress) return;

  if (!isAuthorised()) {
    setStatus("Administrator access required.", "error");
    return;
  }

  const candidate = generatedCandidate;

  if (
    !candidate ||
    candidate.type !== "multiple-choice" ||
    !candidate.id
  ) {
    setStatus("There is no publishable multiple-choice candidate.", "error");
    return;
  }

  if (
    !Array.isArray(candidate.options) ||
    candidate.options.length !== 4 ||
    candidate.options.some(
      option => typeof option !== "string" || !option.trim()
    ) ||
    typeof candidate.correctAnswer !== "string" ||
    !candidate.options.includes(candidate.correctAnswer) ||
    !candidate.question?.trim() ||
    !candidate.explanation?.trim()
  ) {
    setStatus(
      "The candidate is incomplete or invalid. It cannot be published.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    "Have you checked the question, all four options, the correct answer and the explanation? Publish this question to the live question bank?"
  );

  if (!confirmed) return;

  publishingInProgress = true;
  publishButton.disabled = true;
  publishButton.textContent = "Publishing...";

  try {
    const candidateRef = ref(
      database,
      `aiQuestionCandidates/${candidate.id}`
    );

    const candidateSnapshot = await get(candidateRef);

    if (!candidateSnapshot.exists()) {
      throw new Error(
        "The saved candidate could not be found. Nothing was published."
      );
    }

    const savedCandidate = candidateSnapshot.val();

    if (savedCandidate.status !== "pending_review") {
      throw new Error(
        "This candidate is no longer awaiting review. Nothing was published."
      );
    }

    if (
      savedCandidate.type !== "multiple-choice" ||
      savedCandidate.createdBy !== currentAdmin.uid
    ) {
      throw new Error(
        "Candidate verification failed. Nothing was published."
      );
    }

    const answerIndex =
      savedCandidate.options.indexOf(savedCandidate.correctAnswer);

    if (
      answerIndex < 0 ||
      savedCandidate.options.length !== 4
    ) {
      throw new Error(
        "The saved candidate's answer could not be verified."
      );
    }

    const questionId =
      "ai_" + crypto.randomUUID().replace(/-/g, "_");

    const questionRef = ref(
      database,
      `questionBank/${questionId}`
    );

    const existingQuestion = await get(questionRef);

    if (existingQuestion.exists()) {
      throw new Error(
        "A question with this ID already exists. Please try again."
      );
    }

    const now = new Date().toISOString();

    const questionRecord = {
      id: questionId,
      subject: savedCandidate.subject,
      topic: savedCandidate.topic,
      difficulty: savedCandidate.difficulty,
      question: savedCandidate.question,
      options: savedCandidate.options,
      answerIndex,
      explanation: savedCandidate.explanation,
      verified: true,
      createdAt: now,
      createdBy: currentAdmin.uid,
      source: "teacher_model",
      sourceCandidateId: candidate.id,
      generatedByModel:
        savedCandidate.generatedByModel || "GPT-6 Luna"
    };

    /*
     * One Realtime Database multi-location update:
     * publish the question and update the candidate's
     * review status together.
     */
    await update(ref(database), {
      [`questionBank/${questionId}`]: questionRecord,

      [`aiQuestionCandidates/${candidate.id}/status`]:
        "published",

      [`aiQuestionCandidates/${candidate.id}/approvedBy`]:
        currentAdmin.uid,

      [`aiQuestionCandidates/${candidate.id}/approvedAt`]:
        Date.now(),

      [`aiQuestionCandidates/${candidate.id}/publishedQuestionId`]:
        questionId
    });

    generatedCandidate = null;
    publishButton.hidden = true;

    setStatus(
      `Approved and published successfully. Question ID: ${questionId}`,
      "success"
    );

    const publishedNote = document.createElement("p");
    publishedNote.className = "muted";
    publishedNote.textContent =
      "This question is now in the question bank. The original teacher observation remains separate.";

    resultContent.appendChild(publishedNote);

  } catch (error) {
    console.error("Candidate publishing failed:", error);

    setStatus(
      error?.message || "Could not publish the candidate.",
      "error"
    );

  } finally {
    publishingInProgress = false;
    publishButton.disabled = false;
    publishButton.textContent = "Approve and Publish";
  }
}

/* =========================================
   AUTHENTICATION
========================================= */

if (form && statusElement && resultElement) {
  form.addEventListener("submit", generateQuestion);
  publishButton.addEventListener("click", approveCandidate);

  onAuthStateChanged(auth, user => {
    currentAdmin = null;
    clearCandidate();

    if (!user) {
      setStatus(
        "Sign in as the administrator to use GPT-6 Luna.",
        "error"
      );
      return;
    }

    if (user.uid !== ADMIN_UID) {
      setStatus(
        "Access denied. This account is not authorised to use GPT-6 Luna.",
        "error"
      );
      return;
    }

    currentAdmin = user;

    setStatus(
      "GPT-6 Luna is ready. Generated questions will require your approval.",
      "success"
    );
  });

} else {
  console.info(
    "AI generator elements were not found. The GPT-6 Luna controller is inactive on this page."
  );
}
