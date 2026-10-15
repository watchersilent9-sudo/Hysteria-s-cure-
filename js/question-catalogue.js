/*
 * Hysteria's Cure — Question Catalogue
 *
 * Each question is independent of the interface.
 * Add questions from any subject using this structure.
 */

export const questionCatalogue = [
  {
    id: "bio-excretion-001",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 1,
    type: "multiple-choice",
    question: "Which organ removes urea from the blood?",
    options: ["Heart", "Kidney", "Stomach", "Pancreas"],
    answerIndex: 1,
    explanation:
      "The kidneys filter the blood and remove urea to help form urine.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "physics-electricity-001",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 1,
    type: "multiple-choice",
    question: "What is the SI unit of electric current?",
    options: ["Volt", "Ohm", "Ampere", "Watt"],
    answerIndex: 2,
    explanation:
      "Electric current is measured in amperes (A).",
    sourceType: "sample",
    verified: false
  },

  {
    id: "chemistry-atoms-001",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 1,
    type: "multiple-choice",
    question: "Which subatomic particle has a negative charge?",
    options: ["Proton", "Neutron", "Electron", "Nucleus"],
    answerIndex: 2,
    explanation:
      "Electrons carry a negative electric charge.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "math-algebra-001",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 1,
    type: "multiple-choice",
    question: "Solve: x + 7 = 12.",
    options: ["3", "4", "5", "19"],
    answerIndex: 2,
    explanation:
      "Subtract 7 from both sides: x = 12 - 7 = 5.",
    sourceType: "sample",
    verified: false
  }
];

/*
 * Search by subject, topic, keywords, and difficulty.
 * An empty subject or topic means no restriction for that field.
 */

export function searchQuestions({
  subject = "",
  topic = "",
  query = "",
  difficulty = null
} = {}) {
  const normalize = value => value.trim().toLowerCase();

  const wantedSubject = normalize(subject);
  const wantedTopic = normalize(topic);
  const keywords = normalize(query);

  return questionCatalogue.filter(item => {
    const subjectMatches =
      !wantedSubject ||
      normalize(item.subject).includes(wantedSubject);

    const topicMatches =
      !wantedTopic ||
      normalize(item.topic).includes(wantedTopic);

    const text = normalize(
      `${item.subject} ${item.topic} ${item.question} ` +
      `${item.options.join(" ")} ${item.explanation}`
    );

    const queryMatches =
      !keywords ||
      keywords.split(/\s+/).every(word => text.includes(word));

    const difficultyMatches =
      difficulty === null ||
      item.difficulty === Number(difficulty);

    return (
      subjectMatches &&
      topicMatches &&
      queryMatches &&
      difficultyMatches
    );
  });
}
