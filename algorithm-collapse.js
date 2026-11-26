/* Hysteria's Cure — Algorithm Collapse v0.1
 * Non-destructive variant preview. Original question records are never changed.
 * This first release supports answer rotation and conservative structural reframing.
 * Semantic distractor mutation and context replacement remain disabled until a
 * reliable academic validator is available.
 */

const LABELS = ["A", "B", "C", "D"];

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rotateOptions(options, answerIndex, seed) {
  if (!Array.isArray(options) || options.length !== 4 ||
      options.some(option => !String(option ?? "").trim()) ||
      !Number.isInteger(Number(answerIndex)) || Number(answerIndex) < 0 || Number(answerIndex) > 3) {
    throw new Error("This question does not have four valid options and a valid answer index.");
  }

  // A seeded Fisher–Yates permutation gives repeatable variants for the same ID/version.
  const order = [0, 1, 2, 3];
  let state = seed || 1;
  for (let i = order.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.every((oldIndex, newIndex) => oldIndex === newIndex)) {
    order.push(order.shift());
  }
  return {
    options: order.map(index => String(options[index])),
    answerIndex: order.indexOf(Number(answerIndex)),
    sourceOptionOrder: order
  };
}

const FRAMES = [
  question => `Select the option that correctly answers this question: ${question}`,
  question => `Which of the following provides the correct answer? ${question}`,
  question => `Choose the most accurate answer to the question below: ${question}`
];

export function createCollapseVariant(questionId, question, sequence = 1) {
  const original = {
    question: String(question.question || "").trim(),
    options: [...(question.options || [])].map(String),
    answerIndex: Number(question.answerIndex),
    explanation: String(question.explanation || ""),
    subject: String(question.subject || ""),
    topic: String(question.topic || ""),
    sourceType: String(question.sourceType || ""),
    sourceDetails: String(question.sourceDetails || ""),
    syllabusObjective: String(question.syllabusObjective || "")
  };
  if (!original.question || original.options.length !== 4 ||
      original.answerIndex < 0 || original.answerIndex > 3 ||
      !original.options.every(option => option.trim())) {
    throw new Error("Question data is incomplete. No variant was created.");
  }

  const versionSeed = stableHash(`${questionId}:${original.question}:${sequence}`);
  const rotated = rotateOptions(original.options, original.answerIndex, versionSeed);
  const frameIndex = versionSeed % FRAMES.length;
  const variantId = `ac_${stableHash(`${questionId}:${sequence}:${versionSeed}`).toString(16)}`;

  return Object.freeze({
    id: variantId,
    originalQuestionId: questionId,
    sequence,
    question: FRAMES[frameIndex](original.question),
    options: rotated.options,
    answerIndex: rotated.answerIndex,
    explanation: original.explanation,
    subject: original.subject,
    topic: original.topic,
    sourceType: original.sourceType,
    sourceDetails: original.sourceDetails,
    syllabusObjective: original.syllabusObjective,
    transformation: ["answer_rotation", "structural_reframing"],
    sourceOptionOrder: rotated.sourceOptionOrder,
    originalAnswer: original.options[original.answerIndex],
    validation: {
      structural: true,
      answerContentPreserved: rotated.options[rotated.answerIndex] === original.options[original.answerIndex],
      distractorsMutated: false,
      contextChanged: false,
      academicAccuracyIndependentlyVerified: false
    },
    createdAt: new Date().toISOString()
  });
}

export function formatVariantForCopy(variant) {
  return [
    variant.question,
    ...variant.options.map((option, index) => `${LABELS[index]}. ${option}`),
    `Correct answer: ${LABELS[variant.answerIndex]}. ${variant.options[variant.answerIndex]}`,
    variant.explanation ? `Explanation: ${variant.explanation}` : "",
    `Variant ID: ${variant.id}`,
    `Original question ID: ${variant.originalQuestionId}`
  ].filter(Boolean).join("\n");
}
