
/*
 * Hysteria's Cure
 * Admin Controller — HAI Textbook Question Generator
 *
 * Handles:
 * - Administrator authentication
 * - Published textbook retrieval from Supabase
 * - Extracted text retrieval
 * - HAI textbook processing
 * - Generated question preview
 * - Selective submission to Firebase
 *
 * Submitted questions remain unverified.
 */

import { auth } from "./firebase-client.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


/* =========================================
   CONFIGURATION
========================================= */

const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const HAI_API_URL =
  "https://hai-api-l7js.onrender.com";

const MATERIALS_API_URL =
  "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/manage-learning-materials";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_wMSMx1WpGWn7Tk0zBUDAhg_Jlj8RWDO";


/* =========================================
   ELEMENTS
========================================= */

const $ = id => document.getElementById(id);

const materialSelect = $("hai-material");
const subjectInput = $("hai-subject");
const topicInput = $("hai-topic");
const chapterInput = $("hai-chapter");
const countInput = $("hai-count");
const difficultyInput = $("hai-difficulty");

const generateButton = $("hai-generate-button");
const refreshButton = $("hai-refresh-materials");

const statusElement = $("hai-generation-status");
const statisticsElement = $("hai-generation-statistics");
const resultsElement = $("hai-generation-results");
const questionList = $("hai-question-list");

const selectionCount = $("hai-selection-count");
const selectAllButton = $("hai-select-all");
const deselectAllButton = $("hai-deselect-all");
const submitButton = $("hai-submit-button");


/* =========================================
   STATE
========================================= */

let currentAdmin = null;

let availableMaterials = [];
let generatedQuestions = [];

let generationInProgress = false;
let submissionInProgress = false;


/* =========================================
   INITIALISATION CHECK
========================================= */

const requiredElements = {
  materialSelect,
  subjectInput,
  topicInput,
  chapterInput,
  countInput,
  difficultyInput,
  generateButton,
  refreshButton,
  statusElement,
  statisticsElement,
  resultsElement,
  questionList,
  selectionCount,
  selectAllButton,
  deselectAllButton,
  submitButton
};

const missingElements = Object.entries(requiredElements)
  .filter(([, element]) => !element)
  .map(([name]) => name);

if (missingElements.length) {
  console.error(
    "HAI generator could not initialise. Missing elements:",
    missingElements
  );
}


/* =========================================
   AUTHENTICATION
========================================= */

function isAuthorised() {
  return Boolean(
    currentAdmin &&
    auth.currentUser &&
    currentAdmin.uid === ADMIN_UID &&
    auth.currentUser.uid === ADMIN_UID
  );
}


/* =========================================
   STATUS AND UTILITIES
========================================= */

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


function clearGeneratedQuestions() {
  generatedQuestions = [];

  resultsElement.hidden = true;
  statisticsElement.hidden = true;

  questionList.replaceChildren();

  selectionCount.textContent =
    "0 questions selected.";

  submitButton.hidden = true;
  submitButton.disabled = false;
}


async function getAdminToken() {
  if (!isAuthorised()) {
    throw new Error(
      "Administrator authentication is unavailable."
    );
  }

  return currentAdmin.getIdToken();
}


async function parseResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `The server returned an unreadable response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.detail?.message ||
      data.detail ||
      data.message ||
      `Request failed (HTTP ${response.status}).`
    );
  }

  return data;
}


/* =========================================
   SUPABASE REQUESTS
========================================= */

async function materialRequest(method, body = null) {
  const token = await getAdminToken();

  const headers = {
    "Authorization": `Bearer ${token}`,
    "apikey": SUPABASE_PUBLISHABLE_KEY
  };

  const options = {
    method,
    headers
  };

  if (body !== null) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(
    MATERIALS_API_URL,
    options
  );

  return parseResponse(response);
}


/* =========================================
   MATERIAL DATA HELPERS
========================================= */

function getMaterialList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data.materials)) {
    return data.materials;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}


function getMaterialId(material) {
  return String(
    material.id ||
    material.material_id ||
    ""
  );
}


function getMaterialTitle(material) {
  return String(
    material.title ||
    material.name ||
    material.file_name ||
    "Untitled textbook"
  );
}


function getExtractionStatus(material) {
  return String(
    material.extraction_status ||
    material.extraction?.extraction_status ||
    material.extraction?.status ||
    ""
  ).toLowerCase();
}


function isPublished(material) {
  const status = String(
    material.status ||
    material.approval_status ||
    ""
  ).toLowerCase();

  return (
    status === "published" ||
    material.published === true ||
    material.is_published === true
  );
}


function isExtractionComplete(material) {
  return getExtractionStatus(material) === "completed";
}


function getEligibleMaterials(materials) {
  return materials.filter(material =>
    getMaterialId(material) &&
    isPublished(material) &&
    isExtractionComplete(material)
  );
}


/* =========================================
   LOAD PUBLISHED TEXTBOOKS
========================================= */

async function loadMaterials() {
  if (!isAuthorised()) {
    setStatus(
      "Administrator access required.",
      "error"
    );
    return;
  }

  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing...";

  materialSelect.disabled = true;

  materialSelect.replaceChildren();

  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "Loading textbooks...";

  materialSelect.appendChild(loadingOption);

  try {
    const data = await materialRequest("GET");

    const materials = getMaterialList(data);

    availableMaterials = getEligibleMaterials(materials);

    materialSelect.replaceChildren();

    if (availableMaterials.length === 0) {
      const option = document.createElement("option");

      option.value = "";
      option.textContent =
        "No published textbooks with completed extraction";

      materialSelect.appendChild(option);

      setStatus(
        "No eligible textbooks found. Publish a textbook and complete its extraction first.",
        "info"
      );

      return;
    }

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = "Select a textbook";

    materialSelect.appendChild(placeholder);

    availableMaterials.forEach(material => {
      const option = document.createElement("option");

      option.value = getMaterialId(material);
      option.textContent = getMaterialTitle(material);

      materialSelect.appendChild(option);
    });

    materialSelect.disabled = false;

    setStatus(
      `${availableMaterials.length} eligible textbook(s) loaded.`,
      "success"
    );

  } catch (error) {
    console.error(
      "HAI textbook loading failed:",
      error
    );

    materialSelect.replaceChildren();

    const option = document.createElement("option");

    option.value = "";
    option.textContent = "Could not load textbooks";

    materialSelect.appendChild(option);

    setStatus(
      error.message ||
      "Could not retrieve textbooks from Supabase.",
      "error"
    );

  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh Textbooks";
  }
}


/* =========================================
   SELECTED MATERIAL
========================================= */

function getSelectedMaterial() {
  const selectedId = materialSelect.value;

  return availableMaterials.find(
    material => getMaterialId(material) === selectedId
  ) || null;
}


function populateMaterialDetails() {
  const material = getSelectedMaterial();

  if (!material) return;

  const subject =
    material.subject ||
    "";

  const topic =
    material.topic ||
    material.chapter ||
    "";

  const chapter =
    material.chapter ||
    material.topic ||
    "";

  if (subject) {
    subjectInput.value = subject;
  }

  if (topic) {
    topicInput.value = topic;
  }

  if (chapter) {
    chapterInput.value = chapter;
  }

  clearGeneratedQuestions();
}


/* =========================================
   RETRIEVE EXTRACTED TEXT
========================================= */

async function getExtractedText(material) {
  const materialId = getMaterialId(material);

  const data = await materialRequest(
    "POST",
    {
      materialId
    }
  );

  const extractedText =
    data.extraction?.extracted_text ||
    data.extracted_text ||
    "";

  if (
    typeof extractedText !== "string" ||
    extractedText.trim().length < 20
  ) {
    throw new Error(
      "The selected textbook does not contain enough extracted text."
    );
  }

  return {
    text: extractedText,
    metadata: data.material || material,
    extraction: data.extraction || {}
  };
}


/* =========================================
   HAI GENERATION REQUEST
========================================= */

async function requestHAIGeneration(payload) {
  const token = await getAdminToken();

  const response = await fetch(
    `${HAI_API_URL}/textbooks/generate`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },

      body: JSON.stringify(payload)
    }
  );

  return parseResponse(response);
}


/* =========================================
   QUESTION VALIDATION
========================================= */

function validateGeneratedQuestion(question) {
  if (!question || typeof question !== "object") {
    return false;
  }

  if (
    typeof question.subject !== "string" ||
    !question.subject.trim()
  ) {
    return false;
  }

  if (
    typeof question.topic !== "string" ||
    !question.topic.trim()
  ) {
    return false;
  }

  if (
    typeof question.question !== "string" ||
    !question.question.trim()
  ) {
    return false;
  }

  if (
    !Array.isArray(question.options) ||
    question.options.length !== 4 ||
    question.options.some(
      option =>
        typeof option !== "string" ||
        !option.trim()
    )
  ) {
    return false;
  }

  if (
    new Set(question.options).size !== 4
  ) {
    return false;
  }

  if (
    !Number.isInteger(question.answerIndex) ||
    question.answerIndex < 0 ||
    question.answerIndex > 3
  ) {
    return false;
  }

  if (
    typeof question.explanation !== "string" ||
    !question.explanation.trim()
  ) {
    return false;
  }

  if (
    !Number.isInteger(question.difficulty) ||
    question.difficulty < 1 ||
    question.difficulty > 7
  ) {
    return false;
  }

  return true;
}


/* =========================================
   DISPLAY HELPERS
========================================= */

function addResultText(parent, heading, value) {
  const section = document.createElement("div");

  section.className = "ai-result-section";

  const title = document.createElement("strong");
  title.textContent = heading;

  const content = document.createElement("p");

  content.textContent =
    value === undefined || value === null
      ? ""
      : String(value);

  section.append(title, content);

  parent.appendChild(section);
}


/* =========================================
   RENDER GENERATED QUESTIONS
========================================= */

function renderQuestions() {
  questionList.replaceChildren();

  generatedQuestions.forEach((question, index) => {
    const card = document.createElement("article");

    card.className = "achievement-item";

    const top = document.createElement("div");
    top.className = "achievement-top";

    const heading = document.createElement("strong");

    heading.textContent =
      `Question ${index + 1}`;

    const checkboxLabel = document.createElement("label");

    checkboxLabel.style.display = "flex";
    checkboxLabel.style.alignItems = "center";
    checkboxLabel.style.gap = "8px";
    checkboxLabel.style.cursor = "pointer";

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.questionIndex = String(index);
    checkbox.style.width = "auto";

    const labelText = document.createElement("span");
    labelText.textContent = "Select for review";

    checkboxLabel.append(checkbox, labelText);

    top.append(heading, checkboxLabel);

    card.appendChild(top);

    addResultText(
      card,
      "Question",
      question.question
    );

    const optionsSection = document.createElement("div");

    optionsSection.className = "ai-result-section";

    const optionsHeading = document.createElement("strong");
    optionsHeading.textContent = "Options";

    const optionsList = document.createElement("ol");

    question.options.forEach((option, optionIndex) => {
      const item = document.createElement("li");

      item.textContent =
        `${String.fromCharCode(65 + optionIndex)}. ${option}`;

      if (optionIndex === question.answerIndex) {
        item.style.fontWeight = "800";
      }

      optionsList.appendChild(item);
    });

    optionsSection.append(
      optionsHeading,
      optionsList
    );

    card.appendChild(optionsSection);

    addResultText(
      card,
      "Correct answer",
      question.options[question.answerIndex]
    );

    addResultText(
      card,
      "Explanation",
      question.explanation
    );

    addResultText(
      card,
      "Difficulty",
      question.difficulty
    );

    addResultText(
      card,
      "Source",
      question.sourceDetails
    );

    addResultText(
      card,
      "Syllabus objective",
      question.syllabusObjective
    );

    questionList.appendChild(card);
  });

  questionList
    .querySelectorAll('input[type="checkbox"]')
    .forEach(checkbox => {
      checkbox.addEventListener(
        "change",
        updateSelectionCount
      );
    });

  updateSelectionCount();

  resultsElement.hidden = false;
}


function getSelectedQuestions() {
  const selectedIndexes = new Set(
    [...questionList.querySelectorAll(
      'input[type="checkbox"]:checked'
    )].map(checkbox =>
      Number(checkbox.dataset.questionIndex)
    )
  );

  return generatedQuestions.filter(
    (_, index) => selectedIndexes.has(index)
  );
}


function updateSelectionCount() {
  const selected = getSelectedQuestions();

  selectionCount.textContent =
    `${selected.length} of ${generatedQuestions.length} questions selected.`;

  submitButton.hidden = selected.length === 0;
}


/* =========================================
   SELECT ALL / DESELECT ALL
========================================= */

function setAllSelections(checked) {
  questionList
    .querySelectorAll('input[type="checkbox"]')
    .forEach(checkbox => {
      checkbox.checked = checked;
    });

  updateSelectionCount();
}


/* =========================================
   GENERATE QUESTIONS
========================================= */

async function generateQuestions() {
  if (generationInProgress) return;

  if (!isAuthorised()) {
    setStatus(
      "Administrator authentication is unavailable.",
      "error"
    );
    return;
  }

  const material = getSelectedMaterial();

  if (!material) {
    setStatus(
      "Select a published textbook first.",
      "error"
    );
    return;
  }

  const subject = subjectInput.value.trim();
  const topic = topicInput.value.trim();

  const chapter =
    chapterInput.value.trim() || topic;

  const count = Number(countInput.value);
  const difficulty = Number(difficultyInput.value);

  if (!subject || !topic || !chapter) {
    setStatus(
      "Enter a subject, topic and chapter.",
      "error"
    );
    return;
  }

  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 100
  ) {
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
      "Difficulty must be a whole number from 1 to 7.",
      "error"
    );
    return;
  }

  generationInProgress = true;

  generateButton.disabled = true;
  generateButton.textContent = "Processing Textbook...";

  clearGeneratedQuestions();

  try {
    setStatus(
      "Retrieving extracted textbook content from Supabase..."
    );

    const extracted = await getExtractedText(material);

    const documentTitle = getMaterialTitle(
      extracted.metadata
    );

    setStatus(
      "Sending textbook content to HAI. Processing knowledge..."
    );

    generateButton.textContent = "HAI Processing...";

    const result = await requestHAIGeneration({
      text: extracted.text,
      subject,
      topic,
      document: documentTitle,
      chapter,
      count,
      difficulty
    });

    if (
      result.status !== "success" ||
      !Array.isArray(result.questions)
    ) {
      throw new Error(
        result.message ||
        "HAI returned an invalid generation result."
      );
    }

    const validQuestions = result.questions.filter(
      validateGeneratedQuestion
    );

    if (validQuestions.length === 0) {
      throw new Error(
        "HAI did not produce any structurally valid questions."
      );
    }

    generatedQuestions = validQuestions;

    const statistics = result.statistics || {};

    statisticsElement.replaceChildren();

    const statisticsHeading = document.createElement("strong");
    statisticsHeading.textContent = "Processing Results";

    statisticsElement.appendChild(statisticsHeading);

    const statisticsText = document.createElement("p");

    statisticsText.className = "muted";

    statisticsText.textContent = [
      `Knowledge records: ${statistics.knowledge_records ?? "N/A"}`,
      `Validation records: ${statistics.validation_records ?? "N/A"}`,
      `Accepted relationships: ${statistics.accepted_relationships ?? "N/A"}`,
      `Generated questions: ${statistics.generated_questions ?? validQuestions.length}`,
      `Skipped relationships: ${statistics.skipped_relationships ?? "N/A"}`,
      `Processing time: ${statistics.processing_seconds ?? "N/A"} seconds`
    ].join("\n");

    statisticsElement.appendChild(statisticsText);

    statisticsElement.hidden = false;

    renderQuestions();

    setStatus(
      `${validQuestions.length} question(s) generated. Review and select the ones you want to submit.`,
      "success"
    );

  } catch (error) {
    console.error(
      "HAI textbook generation failed:",
      error
    );

    setStatus(
      error.message ||
      "Textbook question generation failed.",
      "error"
    );

  } finally {
    generationInProgress = false;

    generateButton.disabled = false;
    generateButton.textContent = "Generate Questions";
  }
}


/* =========================================
   SUBMIT SELECTED QUESTIONS
========================================= */

async function submitSelectedQuestions() {
  if (submissionInProgress) return;

  if (!isAuthorised()) {
    setStatus(
      "Administrator access required.",
      "error"
    );
    return;
  }

  const selectedQuestions = getSelectedQuestions();

  if (selectedQuestions.length === 0) {
    setStatus(
      "Select at least one question.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    `Submit ${selectedQuestions.length} selected question(s) to Firebase for administrator review? They will remain unverified.`
  );

  if (!confirmed) return;

  submissionInProgress = true;

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const token = await getAdminToken();

    const response = await fetch(
      `${HAI_API_URL}/questions/pending/batch`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },

        body: JSON.stringify({
          questions: selectedQuestions
        })
      }
    );

    const result = await parseResponse(response);

    if (
      result.status !== "success" ||
      result.submitted_count !== selectedQuestions.length
    ) {
      throw new Error(
        result.message ||
        "Firebase did not confirm the complete submission."
      );
    }

    clearGeneratedQuestions();

    setStatus(
      `${result.submitted_count} question(s) submitted to Firebase for review. They are all unverified.`,
      "success"
    );

  } catch (error) {
    console.error(
      "HAI question submission failed:",
      error
    );

    setStatus(
      error.message ||
      "Could not submit selected questions.",
      "error"
    );

  } finally {
    submissionInProgress = false;

    submitButton.disabled = false;
    submitButton.textContent =
      "Submit Selected Questions for Review";
  }
}


/* =========================================
   EVENT LISTENERS
========================================= */

if (missingElements.length === 0) {

  refreshButton.addEventListener(
    "click",
    loadMaterials
  );

  materialSelect.addEventListener(
    "change",
    populateMaterialDetails
  );

  generateButton.addEventListener(
    "click",
    generateQuestions
  );

  selectAllButton.addEventListener(
    "click",
    () => setAllSelections(true)
  );

  deselectAllButton.addEventListener(
    "click",
    () => setAllSelections(false)
  );

  submitButton.addEventListener(
    "click",
    submitSelectedQuestions
  );

  onAuthStateChanged(
    auth,

    async user => {
      currentAdmin = null;

      clearGeneratedQuestions();

      if (!user) {
        availableMaterials = [];

        setStatus(
          "Sign in as the administrator to use HAI.",
          "error"
        );

        return;
      }

      if (user.uid !== ADMIN_UID) {
        availableMaterials = [];

        setStatus(
          "Access denied. Administrator privileges required.",
          "error"
        );

        return;
      }

      currentAdmin = user;

      setStatus(
        "Administrator verified. Loading published textbooks..."
      );

      await loadMaterials();
    },

    error => {
      console.error(
        "HAI authentication listener failed:",
        error
      );

      setStatus(
        "Could not verify administrator authentication.",
        "error"
      );
    }
  );
}
