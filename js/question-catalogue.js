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
  
  {
    id: "bio-excretion-002",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 2,
    type: "multiple-choice",
    question: "Which structure in the kidney filters blood under pressure?",
    options: ["Ureter", "Glomerulus", "Collecting duct", "Urinary bladder"],
    answerIndex: 1,
    explanation: "The glomerulus is a network of capillaries where ultrafiltration of blood begins.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "bio-excretion-003",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 3,
    type: "multiple-choice",
    question: "A person produces very little urine on a hot day after sweating heavily. What best explains this?",
    options: [
      "The kidneys have stopped filtering blood",
      "More water is reabsorbed by the kidney tubules",
      "The bladder has absorbed all the water",
      "The body has stopped producing urea"
    ],
    answerIndex: 1,
    explanation: "Heavy sweating causes water loss, so the body conserves water by increasing its reabsorption in the kidneys.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "physics-electricity-002",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 2,
    type: "multiple-choice",
    question: "A current of 3 A flows through a resistor of 4 Ω. What is the potential difference across it?",
    options: ["0.75 V", "7 V", "12 V", "16 V"],
    answerIndex: 2,
    explanation: "Using Ohm's law, V = IR = 3 × 4 = 12 V.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "physics-electricity-003",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 3,
    type: "multiple-choice",
    question: "A 6 Ω resistor is connected across a 12 V supply. How much electrical energy does it transfer in 10 seconds?",
    options: ["20 J", "120 J", "240 J", "720 J"],
    answerIndex: 2,
    explanation: "Power P = V²/R = 12²/6 = 24 W. Energy E = Pt = 24 × 10 = 240 J.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "chemistry-atoms-002",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 2,
    type: "multiple-choice",
    question: "An atom has 11 protons and 12 neutrons. What is its mass number?",
    options: ["11", "12", "23", "24"],
    answerIndex: 2,
    explanation: "Mass number = number of protons + number of neutrons = 11 + 12 = 23.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "chemistry-atoms-003",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 3,
    type: "multiple-choice",
    question: "A neutral atom has atomic number 17 and mass number 35. How many neutrons does it contain?",
    options: ["17", "18", "35", "52"],
    answerIndex: 1,
    explanation: "Number of neutrons = mass number − atomic number = 35 − 17 = 18.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "math-algebra-002",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 2,
    type: "multiple-choice",
    question: "Solve: 3x − 4 = 11.",
    options: ["3", "4", "5", "7"],
    answerIndex: 2,
    explanation: "Add 4 to both sides: 3x = 15. Divide by 3 to get x = 5.",
    sourceType: "sample",
    verified: false
  },

  {
    id: "math-algebra-003",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 3,
    type: "multiple-choice",
    question: "If x + y = 10 and x − y = 4, what is the value of x?",
    options: ["3", "5", "7", "14"],
    answerIndex: 2,
    explanation: "Adding the equations gives 2x = 14, so x = 7.",
    sourceType: "sample",
    verified: false
              }

    
  },

  {
    id: "bio-excretion-002",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 2,
    type: "multiple-choice",
    question: "Which structure in the kidney filters blood under pressure?",
    options: ["Ureter", "Glomerulus", "Collecting duct", "Urinary bladder"],
    answerIndex: 1,
    explanation: "The glomerulus is where ultrafiltration of blood begins.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "bio-excretion-003",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 3,
    type: "multiple-choice",
    question: "Why might a person produce less urine after sweating heavily?",
    options: [
      "The kidneys stop filtering blood",
      "More water is reabsorbed by the kidney tubules",
      "The bladder absorbs water",
      "The body stops producing urea"
    ],
    answerIndex: 1,
    explanation: "The body conserves water by increasing its reabsorption in the kidneys.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "physics-electricity-002",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 2,
    type: "multiple-choice",
    question: "A current of 3 A flows through a 4 Ω resistor. What is the potential difference?",
    options: ["0.75 V", "7 V", "12 V", "16 V"],
    answerIndex: 2,
    explanation: "Ohm's law gives V = IR = 3 × 4 = 12 V.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "physics-electricity-003",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 3,
    type: "multiple-choice",
    question: "A 6 Ω resistor is connected to a 12 V supply. How much energy is transferred in 10 seconds?",
    options: ["20 J", "120 J", "240 J", "720 J"],
    answerIndex: 2,
    explanation: "P = V²/R = 24 W. Therefore, E = Pt = 24 × 10 = 240 J.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "chemistry-atoms-002",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 2,
    type: "multiple-choice",
    question: "An atom has 11 protons and 12 neutrons. What is its mass number?",
    options: ["11", "12", "23", "24"],
    answerIndex: 2,
    explanation: "Mass number = protons + neutrons = 11 + 12 = 23.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "chemistry-atoms-003",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 3,
    type: "multiple-choice",
    question: "An atom has atomic number 17 and mass number 35. How many neutrons does it contain?",
    options: ["17", "18", "35", "52"],
    answerIndex: 1,
    explanation: "Neutrons = mass number − atomic number = 35 − 17 = 18.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "math-algebra-002",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 2,
    type: "multiple-choice",
    question: "Solve: 3x − 4 = 11.",
    options: ["3", "4", "5", "7"],
    answerIndex: 2,
    explanation: "3x = 15, so x = 5.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "math-algebra-003",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 3,
    type: "multiple-choice",
    question: "If x + y = 10 and x − y = 4, what is x?",
    options: ["3", "5", "7", "14"],
    answerIndex: 2,
    explanation: "Adding the equations gives 2x = 14, so x = 7.",
    sourceType: "sample",
    verified: false
  }
];
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
