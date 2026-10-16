
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
    explanation: "The kidneys filter the blood and remove urea to help form urine.",
    sourceType: "sample",
    verified: false
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
    explanation: "The glomerulus is a network of capillaries where ultrafiltration begins.",
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
    id: "physics-electricity-001",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 1,
    type: "multiple-choice",
    question: "What is the SI unit of electric current?",
    options: ["Volt", "Ohm", "Ampere", "Watt"],
    answerIndex: 2,
    explanation: "Electric current is measured in amperes (A).",
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
    question: "A 6 Ω resistor is connected across a 12 V supply. How much energy is transferred in 10 seconds?",
    options: ["20 J", "120 J", "240 J", "720 J"],
    answerIndex: 2,
    explanation: "P = V²/R = 24 W. Energy E = Pt = 24 × 10 = 240 J.",
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
    explanation: "Electrons carry a negative electric charge.",
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
    question: "A neutral atom has atomic number 17 and mass number 35. How many neutrons does it contain?",
    options: ["17", "18", "35", "52"],
    answerIndex: 1,
    explanation: "Neutrons = mass number − atomic number = 35 − 17 = 18.",
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
    explanation: "Subtract 7 from both sides: x = 12 − 7 = 5.",
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
  },
  
  {
    id: "bio-excretion-004",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 4,
    type: "multiple-choice",
    question: "A person's urine becomes more concentrated after prolonged exercise in hot weather. Which explanation best accounts for this change?",
    options: [
      "The kidneys stop filtering the blood",
      "More water is reabsorbed from the kidney tubules",
      "The bladder removes extra water from the blood",
      "The kidneys stop producing urine completely"
    ],
    answerIndex: 1,
    explanation: "Water conservation increases water reabsorption, producing a smaller volume of more concentrated urine.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "bio-excretion-005",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 5,
    type: "multiple-choice",
    question: "A student compares two people. Person A drinks little water and produces a small volume of concentrated urine. Person B drinks plenty of water and produces a larger volume of dilute urine. Which conclusion is best?",
    options: [
      "Person A's kidneys have stopped working",
      "Person B is unable to excrete waste",
      "The kidneys adjust water reabsorption according to the body's needs",
      "Urine concentration depends only on the amount of urea produced"
    ],
    answerIndex: 2,
    explanation: "The kidneys regulate water balance by changing how much water is reabsorbed.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "bio-excretion-006",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 6,
    type: "multiple-choice",
    question: "A substance is freely filtered into the kidney tubule but is normally reabsorbed completely. If the tubule can no longer reabsorb it, what is the most likely result?",
    options: [
      "The substance will be absent from urine",
      "The substance will be lost in the urine",
      "The glomerulus will stop receiving blood",
      "The bladder will convert it into urea"
    ],
    answerIndex: 1,
    explanation: "A filtered substance that is not reabsorbed remains in the tubular fluid and can be excreted.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "bio-excretion-007",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 7,
    type: "multiple-choice",
    question: "A patient has normal blood flow to the kidneys, but the kidney tubules cannot reabsorb water effectively. Which combination is most likely?",
    options: [
      "Low urine volume and concentrated urine",
      "No filtration and no urine formation",
      "High urine volume and increased risk of dehydration",
      "Complete removal of all proteins from the blood"
    ],
    answerIndex: 2,
    explanation: "Poor water reabsorption leads to excessive water loss in urine, which can cause dehydration.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "physics-electricity-004",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 4,
    type: "multiple-choice",
    question: "A resistor has a potential difference of 12 V across it and carries a current of 2 A. What is its resistance?",
    options: ["6 Ω", "10 Ω", "14 Ω", "24 Ω"],
    answerIndex: 0,
    explanation: "Using Ohm's law, R = V/I = 12/2 = 6 Ω.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "physics-electricity-005",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 5,
    type: "multiple-choice",
    question: "Two resistors of 4 Ω and 8 Ω are connected in series to a 24 V supply. What is the current in the circuit?",
    options: ["0.5 A", "2 A", "3 A", "6 A"],
    answerIndex: 1,
    explanation: "The total resistance is 4 + 8 = 12 Ω. Therefore, I = V/R = 24/12 = 2 A.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "physics-electricity-006",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 6,
    type: "multiple-choice",
    question: "A 6 Ω resistor and a 3 Ω resistor are connected in parallel across a 12 V supply. What is the total current supplied?",
    options: ["2 A", "4 A", "6 A", "9 A"],
    answerIndex: 2,
    explanation: "The branch currents are 12/6 = 2 A and 12/3 = 4 A. Total current = 6 A.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "physics-electricity-007",
    subject: "Physics",
    topic: "Electricity",
    difficulty: 7,
    type: "multiple-choice",
    question: "A 4 Ω resistor and an 8 Ω resistor are connected in parallel across a 12 V supply. How much electrical energy is transferred in 60 seconds?",
    options: ["1,080 J", "2,160 J", "3,240 J", "4,320 J"],
    answerIndex: 2,
    explanation: "The total power is V²/Rₑq. The equivalent resistance is 8/3 Ω, so power = 144 ÷ (8/3) = 54 W. Energy = 54 × 60 = 3,240 J.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "chemistry-atoms-004",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 4,
    type: "multiple-choice",
    question: "An atom has 12 protons, 12 neutrons and 10 electrons. What is its electrical charge?",
    options: ["2+", "2−", "Neutral", "12+"],
    answerIndex: 0,
    explanation: "There are two more protons than electrons, giving the particle a charge of 2+.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "chemistry-atoms-005",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 5,
    type: "multiple-choice",
    question: "Two atoms have the same atomic number but different mass numbers. What can be concluded?",
    options: [
      "They have different numbers of protons",
      "They are isotopes of the same element",
      "They must be different elements",
      "They have identical numbers of neutrons"
    ],
    answerIndex: 1,
    explanation: "Isotopes have the same number of protons but different numbers of neutrons.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "chemistry-atoms-006",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 6,
    type: "multiple-choice",
    question: "An ion has 16 protons and 18 electrons. Which statement correctly describes it?",
    options: [
      "It is a 2+ ion of sulfur",
      "It is a neutral sulfur atom",
      "It is a 2− ion of sulfur",
      "It is a 2− ion of oxygen"
    ],
    answerIndex: 2,
    explanation: "Atomic number 16 identifies sulfur. Two extra electrons give it a 2− charge.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "chemistry-atoms-007",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: 7,
    type: "multiple-choice",
    question: "Element X has isotopes X-35 and X-37 in a ratio of 3:1. Assuming these are the only isotopes, what is its relative atomic mass?",
    options: ["35.0", "35.5", "36.0", "36.5"],
    answerIndex: 1,
    explanation: "The weighted mean is (35 × 3 + 37 × 1) ÷ 4 = 35.5.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "math-algebra-004",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 4,
    type: "multiple-choice",
    question: "The sum of three consecutive integers is 72. What is the middle integer?",
    options: ["23", "24", "25", "26"],
    answerIndex: 1,
    explanation: "Three consecutive integers centred on n sum to 3n. Thus 3n = 72 and n = 24.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "math-algebra-005",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 5,
    type: "multiple-choice",
    question: "The length of a rectangle is 3 cm more than its width. Its perimeter is 30 cm. What is its area?",
    options: ["36 cm²", "45 cm²", "54 cm²", "60 cm²"],
    answerIndex: 2,
    explanation: "If the width is w, the length is w + 3. Then 2w + 2(w + 3) = 30, so w = 6 and length = 9. Area = 54 cm².",
    sourceType: "sample",
    verified: false
  },
  {
    id: "math-algebra-006",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 6,
    type: "multiple-choice",
    question: "The equation x² − 5x + k = 0 has equal roots. What is the value of k?",
    options: ["5", "6", "25/4", "10"],
    answerIndex: 2,
    explanation: "Equal roots require a zero discriminant: b² − 4ac = 0. Therefore, 25 − 4k = 0 and k = 25/4.",
    sourceType: "sample",
    verified: false
  },
  {
    id: "math-algebra-007",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: 7,
    type: "multiple-choice",
    question: "If x + 1/x = 3, what is the value of x² + 1/x²?",
    options: ["5", "7", "9", "11"],
    answerIndex: 1,
    explanation: "Squaring gives x² + 2 + 1/x² = 9. Therefore, x² + 1/x² = 7.",
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
