/* Hysteria's Cure — Algorithm Collapse v0.2
 * Stage 1: strict source and variant integrity validation.
 * This module does NOT claim to verify academic correctness or semantic equivalence.
 * Original question records remain read-only; variants are preview-only.
 */

const LABELS = ["A", "B", "C", "D"];
const OPTION_COUNT = 4;

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeComparableText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function findDuplicateOptions(options) {
  const seen = new Map();
  const duplicates = [];

  options.forEach((option, index) => {
    const normalized = normalizeComparableText(option);
    if (!normalized) return;

    if (seen.has(normalized)) {
      duplicates.push({
        firstIndex: seen.get(normalized),
        duplicateIndex: index
      });
    } else {
      seen.set(normalized, index);
    }
  });

  return duplicates;
}

/** Validate an original Question Bank record before any transformation. */
export function validateOriginalQuestion(question) {
  const errors = [];
  const warnings = [];

  if (!question || typeof question !== "object" || Array.isArray(question)) {
    return {
      valid: false,
      errors: ["Question record must be an object."],
      warnings
    };
  }

  if (!isNonEmptyString(question.question)) {
    errors.push("Question text is missing.");
  }

  if (!Array.isArray(question.options)) {
    errors.push("Options must be an array.");
  } else {
    if (question.options.length !== OPTION_COUNT) {
      errors.push(
        `Exactly ${OPTION_COUNT} options are required; found ${question.options.length}.`
      );
    }

    question.options.forEach((option, index) => {
      if (!isNonEmptyString(option)) {
        errors.push(
          `Option ${LABELS[index] || index + 1} is empty or is not text.`
        );
      }
    });

    for (const duplicate of findDuplicateOptions(question.options)) {
      errors.push(
        `Options ${LABELS[duplicate.firstIndex]} and ${LABELS[duplicate.duplicateIndex]} are duplicates.`
      );
    }
  }

  if (
    !Number.isInteger(question.answerIndex) ||
    question.answerIndex < 0 ||
    question.answerIndex >= OPTION_COUNT
  ) {
    errors.push("Correct-answer index must be an integer from 0 to 3.");
  }

  if (
    isNonEmptyString(question.options?.[question.answerIndex]) === false &&
    Array.isArray(question.options)
  ) {
    errors.push("The selected correct answer is empty.");
  }

  if (!isNonEmptyString(question.explanation)) {
    warnings.push(
      "No explanation is supplied; explanation consistency cannot be checked."
    );
  }

  if (!isNonEmptyString(question.subject)) {
    warnings.push("Subject metadata is missing.");
  }

  if (!isNonEmptyString(question.topic)) {
    warnings.push("Topic metadata is missing.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function rotateOptions(options, answerIndex, seed) {
  const order = [0, 1, 2, 3];
  let state = seed || 1;

  for (let i = order.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  if (order.every((oldIndex, newIndex) => oldIndex === newIndex)) {
    [order[0], order[1]] = [order[1], order[0]];
  }

  return {
    options: order.map(index => options[index]),
    answerIndex: order.indexOf(answerIndex),
    sourceOptionOrder: order
  };
}

function snapshotOriginal(question) {
  return {
    question: question.question,
    options: [...question.options],
    answerIndex: question.answerIndex,
    explanation: String(question.explanation ?? ""),
    subject: String(question.subject ?? ""),
    topic: String(question.topic ?? ""),
    difficulty: question.difficulty ?? null,
    sourceType: String(question.sourceType ?? ""),
    sourceDetails: String(question.sourceDetails ?? ""),
    syllabusObjective: String(question.syllabusObjective ?? ""),
    id: question.id ?? null
  };
}

function sameMultiset(left, right) {
  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length !== right.length
  ) {
    return false;
  }

  const counts = new Map();

  for (const value of left) {
    const key = normalizeComparableText(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const value of right) {
    const key = normalizeComparableText(value);
    const count = counts.get(key) || 0;

    if (!count) return false;

    if (count === 1) {
      counts.delete(key);
    } else {
      counts.set(key, count - 1);
    }
  }

  return counts.size === 0;
}

/**
 * Validate structural integrity of a generated variant against its source snapshot.
 * This is deterministic integrity checking, not proof of academic correctness.
 */
export function validateCollapseVariant(
  variant,
  originalQuestion = null
) {
  const errors = [];
  const warnings = [];

  if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
    return {
      valid: false,
      errors: ["Variant must be an object."],
      warnings,
      checks: {}
    };
  }

  const source = originalQuestion || variant.originalSnapshot;
  const sourceCheck = validateOriginalQuestion(source);

  if (!sourceCheck.valid) {
    errors.push(
      "Original source snapshot is invalid: " +
      sourceCheck.errors.join(" ")
    );
  }

  warnings.push(...sourceCheck.warnings);

  if (!isNonEmptyString(variant.id)) {
    errors.push("Variant ID is missing.");
  }

  if (!isNonEmptyString(variant.originalQuestionId)) {
    errors.push("Original question ID is missing.");
  }

  if (!Number.isInteger(variant.sequence) || variant.sequence < 1) {
    errors.push("Variant sequence must be a positive integer.");
  }

  if (!isNonEmptyString(variant.question)) {
    errors.push("Variant question text is missing.");
  }

  if (
    !Array.isArray(variant.options) ||
    variant.options.length !== OPTION_COUNT ||
    variant.options.some(option => !isNonEmptyString(option))
  ) {
    errors.push(
      "Variant must contain exactly four non-empty text options."
    );
  } else {
    for (const duplicate of findDuplicateOptions(variant.options)) {
      errors.push(
        `Variant options ${LABELS[duplicate.firstIndex]} and ${LABELS[duplicate.duplicateIndex]} are duplicates.`
      );
    }
  }

  if (
    !Number.isInteger(variant.answerIndex) ||
    variant.answerIndex < 0 ||
    variant.answerIndex >= OPTION_COUNT
  ) {
    errors.push("Variant correct-answer index must be an integer from 0 to 3.");
  }

  const sourceAnswer = source?.options?.[source?.answerIndex];
  const variantAnswer = variant?.options?.[variant?.answerIndex];

  const answerPreserved =
    typeof sourceAnswer === "string" &&
    typeof variantAnswer === "string" &&
    normalizeComparableText(sourceAnswer) ===
      normalizeComparableText(variantAnswer);

  if (!answerPreserved) {
    errors.push("The original correct-answer content was not preserved.");
  }

  const distractorsMutated =
    Array.isArray(variant.transformation) &&
    variant.transformation.includes("distractor_mutation");

  const optionsConsistent = distractorsMutated
    ? true
    : sameMultiset(source?.options || [], variant?.options || []);

  if (!optionsConsistent) {
    errors.push("Options changed without declaring distractor mutation.");
  }

  const explanationPreserved =
    normalizeComparableText(variant.explanation ?? "") ===
    normalizeComparableText(source?.explanation ?? "");

  if (
    !explanationPreserved &&
    !(
      Array.isArray(variant.transformation) &&
      variant.transformation.includes("explanation_rewrite")
    )
  ) {
    errors.push(
      "Explanation changed without declaring an explanation rewrite."
    );
  }

  const declaredOrder = variant.sourceOptionOrder;

  if (!distractorsMutated && Array.isArray(declaredOrder)) {
    const isPermutation =
      declaredOrder.length === OPTION_COUNT &&
      [...declaredOrder]
        .sort((a, b) => a - b)
        .every((value, index) => value === index);

    if (!isPermutation) {
      errors.push(
        "Source option order is not a valid four-option permutation."
      );
    } else {
      const reconstructed = declaredOrder.map(
        index => source.options[index]
      );

      if (!sameMultiset(reconstructed, variant.options)) {
        errors.push(
          "Source option order does not match the displayed options."
        );
      }

      if (declaredOrder[variant.answerIndex] !== source.answerIndex) {
        errors.push(
          "Answer index does not point to the original correct option."
        );
      }
    }
  } else if (!distractorsMutated && !Array.isArray(declaredOrder)) {
    errors.push("Source option order metadata is missing.");
  }

  if (
    variant.originalQuestionId &&
    source?.id &&
    variant.originalQuestionId !== source.id
  ) {
    warnings.push(
      "Variant source ID differs from the source snapshot ID; verify the record mapping."
    );
  }

  warnings.push(
    "Academic correctness and semantic equivalence require separate review; this validator cannot prove either."
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checks: {
      sourceRecordValid: sourceCheck.valid,
      answerContentPreserved: answerPreserved,
      optionsConsistent,
      explanationPreserved,
      uniqueOptions:
        Array.isArray(variant.options) &&
        findDuplicateOptions(variant.options).length === 0,
      structuralEquivalenceIndependentlyVerified: false,
      academicAccuracyIndependentlyVerified: false
    }
  };
}

const FRAMES = [
  question =>
    `Select the option that correctly answers this question: ${question}`,

  question =>
    `Which of the following provides the correct answer? ${question}`,

  question =>
    `Choose the most accurate answer to the question below: ${question}`
];

export function createCollapseVariant(
  questionId,
  question,
  sequence = 1
) {
  if (!isNonEmptyString(String(questionId ?? ""))) {
    throw new Error("A valid original question ID is required.");
  }

  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Variant sequence must be a positive integer.");
  }

  const sourceValidation = validateOriginalQuestion(question);

  if (!sourceValidation.valid) {
    throw new Error(
      "Original question failed validation: " +
      sourceValidation.errors.join(" ")
    );
  }

  const original = snapshotOriginal(question);

  const versionSeed = stableHash(
    `${questionId}:${original.question}:${sequence}`
  );

  const rotated = rotateOptions(
    original.options,
    original.answerIndex,
    versionSeed
  );

  const frameIndex = versionSeed % FRAMES.length;

  const variantId =
    `ac_${stableHash(
      `${questionId}:${sequence}:${versionSeed}`
    ).toString(16)}`;

  const variant = {
    id: variantId,
    originalQuestionId: String(questionId),
    sequence,
    originalSnapshot: original,
    question: FRAMES[frameIndex](original.question),
    options: rotated.options,
    answerIndex: rotated.answerIndex,
    explanation: original.explanation,
    subject: original.subject,
    topic: original.topic,
    difficulty: original.difficulty,
    sourceType: original.sourceType,
    sourceDetails: original.sourceDetails,
    syllabusObjective: original.syllabusObjective,
    transformation: ["answer_rotation", "presentation_wrapper"],
    sourceOptionOrder: rotated.sourceOptionOrder,
    originalAnswer: original.options[original.answerIndex],
    validation: null,
    createdAt: new Date().toISOString()
  };

  const validation = validateCollapseVariant(variant, original);

  if (!validation.valid) {
    throw new Error(
      "Generated variant failed integrity validation: " +
      validation.errors.join(" ")
    );
  }

  variant.validation = validation;

  return Object.freeze(variant);
}

export function formatVariantForCopy(variant) {
  const validation = validateCollapseVariant(variant);

  if (!validation.valid) {
    throw new Error(
      "Cannot copy an invalid variant: " +
      validation.errors.join(" ")
    );
  }

  return [
    variant.question,
    ...variant.options.map(
      (option, index) => `${LABELS[index]}. ${option}`
    ),
    `Correct answer: ${LABELS[variant.answerIndex]}. ${variant.options[variant.answerIndex]}`,
    variant.explanation
      ? `Explanation: ${variant.explanation}`
      : "",
    `Variant ID: ${variant.id}`,
    `Original question ID: ${variant.originalQuestionId}`
  ]
    .filter(Boolean)
    .join("\n");
}