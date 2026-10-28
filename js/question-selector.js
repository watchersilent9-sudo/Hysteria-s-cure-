/*
 * Hysteria's Cure — reliable question selector
 * Local questions remain available if Firebase is slow or unavailable.
 */

import { questionCatalogue } from "./question-catalogue.js";
import { database } from "./firebase-client.js";
import {
  get,
  ref
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const FIREBASE_TIMEOUT_MS = 7000;

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function prepareQuestion(question, id = question?.id) {
  return {
    ...question,
    id: String(id ?? ""),
    subject: String(question?.subject ?? ""),
    topic: String(question?.topic ?? ""),
    question: String(question?.question ?? ""),
    difficulty: Number(question?.difficulty ?? 1),
    type: question?.type || "multiple-choice",
    options: Array.isArray(question?.options) ? question.options : [],
    answerIndex: Number(question?.answerIndex ?? 0),
    explanation: String(question?.explanation ?? "")
  };
}

function isUsableQuestion(question) {
  return Boolean(
    question.id &&
    question.subject.trim() &&
    question.topic.trim() &&
    question.question.trim() &&
    Number.isInteger(question.difficulty) &&
    question.difficulty >= 1 &&
    question.difficulty <= 7 &&
    question.options.length >= 2 &&
    question.options.every(
      option =>
        typeof option === "string" &&
        option.trim().length > 0
    ) &&
    Number.isInteger(question.answerIndex) &&
    question.answerIndex >= 0 &&
    question.answerIndex < question.options.length
  );
}

function combineQuestions(localQuestions, remoteQuestions = []) {
  const combined = new Map();

  // Add local questions first so the site can work without Firebase.
  for (const item of localQuestions) {
    const question = prepareQuestion(item);

    if (isUsableQuestion(question)) {
      combined.set(question.id, question);
    }
  }

  // Add shared Firebase questions. Matching IDs replace local copies.
  for (const item of remoteQuestions) {
    const question = prepareQuestion(item, item?.id);

    if (isUsableQuestion(question)) {
      combined.set(question.id, question);
    }
  }

  return [...combined.values()];
}

function validateOptions(options = {}) {
  const min = Number(options.minDifficulty ?? 1);
  const max = Number(options.maxDifficulty ?? 7);
  const count = Number(options.count ?? 10);
  const strategy = options.strategy ?? "random";

  if (!Number.isInteger(min) || min < 1 || min > 7) {
    throw new Error("Choose a star level from 1 to 7.");
  }

  if (!Number.isInteger(max) || max < 1 || max > 7) {
    throw new Error("Choose a star level from 1 to 7.");
  }

  if (min > max) {
    throw new Error(
      "Minimum difficulty cannot exceed maximum difficulty."
    );
  }

  if (!Number.isFinite(count) || count < 1) {
    throw new Error("Choose at least one question.");
  }

  if (!["random", "progressive", "challenge"].includes(strategy)) {
    throw new Error("Choose a valid question order.");
  }

  return {
    min,
    max,
    count: Math.min(100, Math.floor(count)),
    strategy
  };
}

function selectFromQuestions(questions, options = {}) {
  const { min, max, count, strategy } = validateOptions(options);

  const subject = normalize(options.subject);
  const topic = normalize(options.topic);

  const excluded = new Set(
    (options.excludeIds || []).map(String)
  );

  const types = Array.isArray(options.types) ? options.types : [];

  const candidates = questions.filter(question => {
    if (
      subject &&
      !normalize(question.subject).includes(subject)
    ) {
      return false;
    }

    if (
      topic &&
      !normalize(question.topic).includes(topic)
    ) {
      return false;
    }

    if (
      question.difficulty < min ||
      question.difficulty > max
    ) {
      return false;
    }

    if (types.length && !types.includes(question.type)) {
      return false;
    }

    if (excluded.has(String(question.id))) {
      return false;
    }

    return true;
  });

  let selected = shuffle(candidates);

  if (strategy === "progressive") {
    selected.sort((a, b) => a.difficulty - b.difficulty);
  } else if (strategy === "challenge") {
    selected.sort((a, b) => b.difficulty - a.difficulty);
  }

  return selected.slice(0, count);
}

/**
 * Select from the local catalogue only.
 * This remains available as a reliable fallback.
 */
export function selectPracticeSet(options = {}) {
  return selectFromQuestions(
    combineQuestions(questionCatalogue),
    options
  );
}

/**
 * Load shared questions from Firebase when possible.
 * If Firebase is unavailable or times out, use local questions instead.
 */
export async function selectPracticeSetAsync(options = {}) {
  let remoteQuestions = [];

  try {
    const snapshot = await Promise.race([
      get(ref(database, "questionBank")),

      new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error("Firebase question-bank request timed out.")
          );
        }, FIREBASE_TIMEOUT_MS);
      })
    ]);

    if (snapshot.exists()) {
      const records = snapshot.val();

      if (records && typeof records === "object") {
        remoteQuestions = Object.entries(records).map(
          ([id, question]) => ({
            ...(question || {}),
            id
          })
        );
      }
    }
  } catch (error) {
    console.warn(
      "Using local questions because Firebase could not be loaded:",
      error
    );
  }

  // This runs even when Firebase fails.
  return selectFromQuestions(
    combineQuestions(questionCatalogue, remoteQuestions),
    options
  );
}

/**
 * Useful for checking the contents of the local catalogue.
 */
export function getCatalogueStats() {
  const ids = new Set();
  const duplicateIds = [];
  const subjects = {};
  const difficulties = {};

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
