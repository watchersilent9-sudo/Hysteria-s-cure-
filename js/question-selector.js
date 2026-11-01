
/*
 * Hysteria's Cure — Firebase-first question selector
 * Verified Firebase questions take priority.
 * Local sample questions are used only when Firebase
 * is unavailable or has no usable verified questions.
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
    options: Array.isArray(question?.options)
      ? question.options
      : [],
    answerIndex: Number(question?.answerIndex ?? 0),
    explanation: String(question?.explanation ?? "")
  };
}

function isUsableQuestion(question) {
  return Boolean(
    question &&
    question.id &&
    question.subject.trim() &&
    question.topic.trim() &&
    question.question.trim() &&
    Number.isInteger(question.difficulty) &&
    question.difficulty >= 1 &&
    question.difficulty <= 7 &&
    question.type === "multiple-choice" &&
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

function getLocalQuestions() {
  return questionCatalogue
    .map(item => prepareQuestion(item))
    .filter(isUsableQuestion);
}

function getVerifiedRemoteQuestions(records) {
  if (!records || typeof records !== "object") {
    return [];
  }

  return Object.entries(records)
    .map(([id, item]) => {
      if (!item || item.verified !== true) {
        return null;
      }

      return prepareQuestion(item, item.id || id);
    })
    .filter(Boolean)
    .filter(isUsableQuestion);
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

  const types = Array.isArray(options.types)
    ? options.types
    : [];

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
 * Local catalogue only.
 * Used as a fallback when Firebase cannot provide questions.
 */
export function selectPracticeSet(options = {}) {
  return selectFromQuestions(getLocalQuestions(), options);
}

/**
 * Firebase-first question loading.
 * Only verified Firebase questions are accepted.
 */
export async function selectPracticeSetAsync(options = {}) {
  let remoteQuestions = [];

  try {
    const snapshot = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error("Firebase question-bank request timed out.")
        );
      }, FIREBASE_TIMEOUT_MS);

      get(ref(database, "questionBank"))
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });

    if (snapshot.exists()) {
      remoteQuestions = getVerifiedRemoteQuestions(snapshot.val());
    }

  } catch (error) {
    console.warn(
      "Firebase question bank unavailable. Using local fallback:",
      error
    );
  }

  if (remoteQuestions.length > 0) {
    return selectFromQuestions(remoteQuestions, options);
  }

  console.warn(
    "No usable verified Firebase questions found. Using local sample questions."
  );

  return selectFromQuestions(getLocalQuestions(), options);
}

/**
 * Statistics for the local catalogue.
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
