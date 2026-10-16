
/*
 * Hysteria's Cure — Question Selection Engine
 *
 * Combines the original catalogue with questions saved in Firebase.
 * Preserves the original synchronous selector for existing callers.
 */

import { questionCatalogue } from "./question-catalogue.js";
import { database } from "./firebase-client.js";

import {
  get,
  ref
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesFilters(question, filters = {}) {
  const subject = normalize(filters.subject);
  const topic = normalize(filters.topic);
  const types = filters.types;

  if (subject && !normalize(question.subject).includes(subject)) {
    return false;
  }

  if (topic && !normalize(question.topic).includes(topic)) {
    return false;
  }

  if (
    Array.isArray(types) &&
    types.length > 0 &&
    !types.includes(question.type)
  ) {
    return false;
  }

  if (
    filters.minDifficulty != null &&
    Number(question.difficulty) < Number(filters.minDifficulty)
  ) {
    return false;
  }

  if (
    filters.maxDifficulty != null &&
    Number(question.difficulty) > Number(filters.maxDifficulty)
  ) {
    return false;
  }

  return true;
}

function validateOptions({
  minDifficulty,
  maxDifficulty,
  count,
  strategy
}) {
  if (
    !Number.isFinite(Number(minDifficulty)) ||
    minDifficulty < 1 ||
    minDifficulty > 7
  ) {
    throw new Error("minDifficulty must be between 1 and 7.");
  }

  if (
    !Number.isFinite(Number(maxDifficulty)) ||
    maxDifficulty < 1 ||
    maxDifficulty > 7
  ) {
    throw new Error("maxDifficulty must be between 1 and 7.");
  }

  if (minDifficulty > maxDifficulty) {
    throw new Error("Minimum difficulty cannot exceed maximum difficulty.");
  }

  if (!Number.isFinite(Number(count)) || Number(count) < 0) {
    throw new Error("Question count must be zero or greater.");
  }

  if (!["random", "progressive", "challenge"].includes(strategy)) {
    throw new Error(
      'strategy must be "random", "progressive", or "challenge".'
    );
  }
}

function prepareQuestion(question, id = question.id) {
  return {
    ...question,
    id: String(id),
    subject: String(question.subject ?? ""),
    topic: String(question.topic ?? ""),
    question: String(question.question ?? ""),
    difficulty: Number(question.difficulty ?? 1),
    type: question.type || "multiple-choice",
    options: Array.isArray(question.options) ? question.options : [],
    answerIndex: Number(question.answerIndex ?? 0),
    explanation: String(question.explanation ?? "")
  };
}

function isUsableQuestion(question) {
  return (
    question.id &&
    question.subject.trim() &&
    question.topic.trim() &&
    question.question.trim() &&
    Number.isInteger(question.difficulty) &&
    question.difficulty >= 1 &&
    question.difficulty <= 7 &&
    question.options.length >= 2 &&
    question.options.every(option =>
      typeof option === "string" && option.trim().length > 0
    ) &&
    Number.isInteger(question.answerIndex) &&
    question.answerIndex >= 0 &&
    question.answerIndex < question.options.length
  );
}

function combineQuestions(localQuestions, remoteQuestions) {
  const combined = new Map();

  for (const original of localQuestions) {
    const question = prepareQuestion(original);

    if (isUsableQuestion(question)) {
      combined.set(question.id, question);
    }
  }

  for (const original of remoteQuestions) {
    const question = prepareQuestion(original);

    if (isUsableQuestion(question)) {
      // Firebase records replace matching IDs if an ID is duplicated.
      combined.set(question.id, question);
    }
  }

  return [...combined.values()];
}

function selectFromQuestions(questions, {
  subject = "",
  topic = "",
  minDifficulty = 1,
  maxDifficulty = 7,
  count = 10,
  types = [],
  excludeIds = [],
  strategy = "random"
} = {}) {
  validateOptions({
    minDifficulty,
    maxDifficulty,
    count,
    strategy
  });

  const safeCount = Math.max(
    0,
    Math.min(100, Math.floor(Number(count)))
  );

  const excluded = new Set(excludeIds.map(String));

  const candidates = questions.filter(question =>
    matchesFilters(question, {
      subject,
      topic,
      types,
      minDifficulty,
      maxDifficulty
    }) && !excluded.has(String(question.id))
  );

  let selected = shuffle(candidates);

  if (strategy === "progressive") {
    selected.sort((a, b) => a.difficulty - b.difficulty);
  } else if (strategy === "challenge") {
    selected.sort((a, b) => b.difficulty - a.difficulty);
  }

  return selected.slice(0, safeCount);
}

/*
 * Original synchronous selector.
 * Keeps compatibility with existing code using the local catalogue.
 */
export function selectPracticeSet(options = {}) {
  return selectFromQuestions(questionCatalogue, options);
}

/*
 * New asynchronous selector.
 * Loads the shared Firebase question bank and combines it with the
 * local catalogue before applying the same filters and strategies.
 */
export async function selectPracticeSetAsync(options = {}) {
  let remoteQuestions = [];

  try {
    const snapshot = await get(ref(database, "questionBank"));

    if (snapshot.exists()) {
      const records = snapshot.val();

      remoteQuestions = Object.entries(records).map(([id, question]) => ({
        ...question,
        id
      }));
    }
  } catch (error) {
    console.error("Firebase question bank could not be loaded:", error);

    throw new Error(
      "Could not load the shared question bank. Check your internet connection and Firebase permissions, then try again."
    );
  }

  const combined = combineQuestions(
    questionCatalogue,
    remoteQuestions
  );

  return selectFromQuestions(combined, options);
}

/*
 * Summarize the original local catalogue.
 */
export function getCatalogueStats() {
  const subjects = {};
  const difficulties = {};
  const ids = new Set();
  const duplicateIds = [];

  for (const question of questionCatalogue) {
    subjects[question.subject] =
      (subjects[question.subject] || 0) + 1;

    difficulties[question.difficulty] =
      (difficulties[question.difficulty] || 0) + 1;

    if (ids.has(question.id)) {
      duplicateIds.push(question.id);
    }

    ids.add(question.id);
  }

  return {
    totalQuestions: questionCatalogue.length,
    uniqueIds: ids.size,
    duplicateIds,
    subjects,
    difficulties
  };
}
