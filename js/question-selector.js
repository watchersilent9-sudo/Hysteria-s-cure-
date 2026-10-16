
/*
 * Hysteria's Cure — Question Selection Engine
 *
 * Builds balanced practice sets from the question catalogue.
 * Does not modify the original questions.
 */

import { questionCatalogue } from "./question-catalogue.js";

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
    question.difficulty < Number(filters.minDifficulty)
  ) {
    return false;
  }

  if (
    filters.maxDifficulty != null &&
    question.difficulty > Number(filters.maxDifficulty)
  ) {
    return false;
  }

  return true;
}

/*
 * Select a practice set.
 *
 * Options:
 * subject       — e.g. "Biology"
 * topic         — e.g. "Excretion"
 * minDifficulty — lowest permitted difficulty
 * maxDifficulty — highest permitted difficulty
 * count         — maximum number of questions
 * types         — allowed question formats
 * excludeIds    — question IDs to avoid
 * strategy      — "random", "progressive", or "challenge"
 */
export function selectPracticeSet({
  subject = "",
  topic = "",
  minDifficulty = 1,
  maxDifficulty = 7,
  count = 10,
  types = [],
  excludeIds = [],
  strategy = "random"
} = {}) {
  const safeCount = Math.max(
    0,
    Math.min(100, Math.floor(Number(count) || 0))
  );

  if (minDifficulty < 1 || minDifficulty > 7) {
    throw new Error("minDifficulty must be between 1 and 7.");
  }

  if (maxDifficulty < 1 || maxDifficulty > 7) {
    throw new Error("maxDifficulty must be between 1 and 7.");
  }

  if (minDifficulty > maxDifficulty) {
    throw new Error("Minimum difficulty cannot exceed maximum difficulty.");
  }

  const excluded = new Set(excludeIds);

  const candidates = questionCatalogue.filter(question =>
    matchesFilters(question, {
      subject,
      topic,
      types,
      minDifficulty,
      maxDifficulty
    }) && !excluded.has(question.id)
  );

  let selected = shuffle(candidates);

  if (strategy === "progressive") {
    selected.sort((a, b) => a.difficulty - b.difficulty);
  } else if (strategy === "challenge") {
    selected.sort((a, b) => b.difficulty - a.difficulty);
  } else if (strategy !== "random") {
    throw new Error(
      'strategy must be "random", "progressive", or "challenge".'
    );
  }

  return selected.slice(0, safeCount);
}

/*
 * Summarize the catalogue for development and planning.
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
