// SPDX-License-Identifier: MIT
/**
 * Quadratics. Baits `boundary-ignored` again — "a quadratic has two
 * solutions" holds until the discriminant reaches zero, and the same
 * structural mistake appears here as in straight lines and in circular motion.
 */
export default [
  {
    schema: 1,
    id: "how-many-solutions",
    concept: "quadratics",
    difficulty: "medium",
    subject: "maths",
    primitive: "quadratic-roots",
    params: { a: 1, b: 1, c: 3 },
    question: "How many times does this curve cross the x-axis?",
    note: "y = x² + x + 3.",
    options: [
      { id: "two",  label: "Twice — quadratics always have two solutions" },
      { id: "one",  label: "Once, just touching it" },
      { id: "none", label: "Not at all" },
    ],
    correct: "none",
    errorTags: { two: "boundary-ignored", one: "special-case-reasoning" },
    cues: {
      "boundary-ignored": "Watch where the lowest point of the curve sits relative to the axis. A curve that never gets down to the axis cannot cross it.",
      "special-case-reasoning": "Touching once is its own case, and it needs the curve's lowest point to land exactly on the axis. Check whether it does.",
    },
    explain:
      "It never reaches the axis: b² − 4ac is 1 − 12 = −11, and a negative discriminant means " +
      "no real solutions at all. 'Every quadratic has two roots' is true of most of them and " +
      "false here — the curve simply sits above the axis the whole way.",
  },
  {
    schema: 1,
    id: "the-exact-touch",
    concept: "quadratics",
    difficulty: "hard",
    subject: "maths",
    primitive: "quadratic-roots",
    params: { a: 1, b: 2, c: 1 },
    question: "And this one? y = x² + 2x + 1.",
    note: "The numbers have been chosen carefully.",
    options: [
      { id: "one",  label: "Once — it touches and turns back" },
      { id: "two",  label: "Twice" },
      { id: "none", label: "Never" },
    ],
    correct: "one",
    errorTags: { two: "boundary-ignored", none: "sign-or-direction" },
    cues: {
      "boundary-ignored": "Work out b² − 4ac before deciding. Two crossings need it to be bigger than zero, and this one is not.",
      "sign-or-direction": "Check which way the curve opens and where its lowest point sits. Never reaching the axis and just touching it are different cases.",
    },
    explain:
      "Exactly one: b² − 4ac is 4 − 4 = 0, so the curve's lowest point sits precisely on the " +
      "axis at x = −1. This is the case between the other two, and it is the one that makes " +
      "'always two' and 'never' both wrong. It exists because the numbers were chosen so the " +
      "discriminant lands exactly on zero — nudge any of them and it breaks.",
  },
];
