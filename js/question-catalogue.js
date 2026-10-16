/*
 * Hysteria's Cure — Question Catalogue
 * Cleaned foundation for the future intelligent question engine.
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
    verified: false,
    syllabusObjective: "Explain the role of the kidney in excretion."
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
    verified: false,
    syllabusObjective: "Describe ultrafiltration in the nephron."
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
    verified: false,
    syllabusObjective: "Explain how the kidneys regulate water balance."
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
    verified: false,
    syllabusObjective: "Apply kidney function to water balance."
  },
  {
    id: "bio-excretion-005",
    subject: "Biology",
    topic: "Excretion",
    difficulty: 5,
    type: "multiple-choice",
    question: "Person A drinks little water and produces a small volume of concentrated urine. Person B drinks plenty of water and produces a larger volume of dilute urine. Which conclusion is best?",
    options: [
      "Person A's kidneys have stopped working",
      "Person B is unable to excrete waste",
      "The kidneys adjust water reabsorption according to the body's needs",
      "Urine concentration depends only on the amount of urea produced"
    ],
    answerIndex: 2,
    explanation: "The kidneys regulate water balance by changing how much water is reabsorbed.",
    sourceType: "sample",
    verified: false,
    syllabusObjective: "Interpret observations about kidney water regulation."
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
    verified: false,
    syllabusObjective: "Analyse the effect of impaired tubular reabsorption."
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
    verified: false,
    syllabusObjective: "Predict the consequences of impaired water reabsorption."
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
    verified: false,
    syllabusObjective: "Identify electrical quantities and their SI units."
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
    verified: false,
    syllabusObjective: "Apply Ohm's law."
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
    verified: false,
    syllabusObjective: "Calculate electrical energy using power and time."
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
    verified: false,
    syllabusObjective: "Rearrange Ohm's law to find resistance."
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
    explanation: "Total resistance = 4 + 8 = 12 Ω. Current = 24/12 = 2 A.",
    sourceType: "sample",
    verified: false,
    syllabusObjective: "Solve series-resistance circuit problems."
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
    verified: false,
    syllabusObjective: "Analyse current in parallel circuits."
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
    explanation: "Equivalent resistance = 8/3 Ω. Power = 144 ÷ (8/3) = 54 W. Energy = 54 × 60 = 3,240 J.",
    sourceType: "sample",
    verified: false,
    syllabusObjective: "Combine parallel resistance, power and energy calculations."
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
    verified: false,
    syllabusObjective: "Identify the charges of subatomic particles."
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
    verified: false,
    syllabusObjective: "Calculate mass number."
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
    verified: false,
    syllabusObjective: "Calculate neutron number from atomic and mass numbers."
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
    verified: false,
    syllabusObjective: "Determine ionic charge from proton and electron counts."
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
    verified: false,
    syllabusObjective: "Explain isotopy."
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
    verified: false,
    syllabusObjective: "Determine the identity and charge of an ion."
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
    verified: false,
    syllabusObjective: "Calculate relative atomic mass from isotopic abundances."
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
    verified: false,
    syllabusObjective: "Solve simple linear equations."
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
    verified: false,
    syllabusObjective: "Solve linear equations involving multiplication and subtraction."
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
    verified: false,
    syllabusObjective: "Solve simultaneous linear equations."
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
    verified: false,
    syllabusObjective: "Form and solve equations from word problems."
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
    explanation: "If width = w, length = w + 3. Then 2w + 2(w + 3) = 30, so w = 6 and length = 9. Area = 54 cm².",
    sourceType: "sample",
    verified: false,
    syllabusObjective: "Translate geometric word problems into algebraic equations."
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
    explanation: "Equal roots require a zero discriminant: 25 − 4k = 0, so k = 25/4.",
    sourceType: "sample",
    verified: false,
    syllabusObjective: "Apply the discriminant of a quadratic equation."
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
    verified: false,
    syllabusObjective: "Apply algebraic identities to simplify expressions."
  }
];

/*
 * Basic catalogue validation.
 * Run validateQuestionCatalogue() during development.
 */
export function validateQuestionCatalogue() {
  const errors = [];
  
export function validateQuestionCatalogue() {
  const errors = [];
  const seenIds = new Set();

  for (const [index, question] of questionCatalogue.entries()) {
    const label = `Question ${index + 1}`;

    if (!question || typeof question !== "object") {
      errors.push(`${label}: invalid question entry.`);
      continue;
    }

    if (!question.id || typeof question.id !== "string") {
      errors.push(`${label}: missing or invalid ID.`);
    } else if (seenIds.has(question.id)) {
      errors.push(`${label}: duplicate ID "${question.id}".`);
    } else {
      seenIds.add(question.id);
    }

    for (const field of ["subject", "topic", "question"]) {
      if (
        typeof question[field] !== "string" ||
        !question[field].trim()
      ) {
        errors.push(`${label}: missing or invalid ${field}.`);
      }
    }

    if (
      !Number.isInteger(question.difficulty) ||
      question.difficulty < 1 ||
      question.difficulty > 7
    ) {
      errors.push(`${label}: difficulty must be an integer from 1 to 7.`);
    }

    if (question.type === "multiple-choice") {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`${label}: multiple-choice questions need at least two options.`);
      } else {
        if (
          question.options.some(
            option => typeof option !== "string" || !option.trim()
          )
        ) {
          errors.push(`${label}: every option must be a non-empty string.`);
        }

        if (
          !Number.isInteger(question.answer) ||
          question.answer < 0 ||
          question.answer >= question.options.length
        ) {
          errors.push(`${label}: answer index is outside the options.`);
        }
      }
    } else {
      errors.push(`${label}: unsupported question type "${question.type}".`);
    }

    if (
      question.verified !== true &&
      question.verified !== false
    ) {
      errors.push(`${label}: verified must be true or false.`);
    }
  }

  return {
    valid: errors.length === 0,
    totalQuestions: questionCatalogue.length,
    uniqueIds: seenIds.size,
    errors
  };
}
  ];
