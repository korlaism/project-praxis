// SPDX-License-Identifier: MIT
/**
 * Straight lines. Baits `boundary-ignored` — "two lines cross somewhere" is
 * true until the slopes match, and then wrong in two different ways.
 *
 * The second subject (P-91). Nothing is simulated: the answer is computed from
 * the closed form, which is why maths is cheaper to verify than physics.
 */
export default [
  {
    schema: 1,
    id: "do-these-lines-cross",
    concept: "straight-lines",
    difficulty: "easy",
    subject: "maths",
    primitive: "line-pair",
    params: { m1: 1, c1: 0, m2: -1, c2: 4 },
    question: "Two lines are about to be drawn. Do they cross, and if so how many times?",
    note: "y = x in orange, y = −x + 4 in green.",
    options: [
      { id: "one-point", label: "Once, at a single point" },
      { id: "parallel",  label: "Never — they run alongside each other" },
      { id: "same-line", label: "Everywhere — they are the same line" },
    ],
    correct: "one-point",
    errorTags: { parallel: "boundary-ignored", "same-line": "special-case-reasoning" },
    cues: {
      "boundary-ignored": "Compare the two slopes before you decide. Lines miss each other only when they lean by exactly the same amount.",
      "special-case-reasoning": "Two lines are the same line only if BOTH numbers match. Check the second one as well as the first.",
    },
    explain:
      "Different slopes means they must cross, exactly once, somewhere — here at (2, 2). " +
      "Two straight lines can only avoid each other by never closing the gap, and a gap " +
      "closes whenever one line leans more steeply than the other.",
  },
  {
    schema: 1,
    id: "same-slope-different-height",
    concept: "straight-lines",
    difficulty: "medium",
    subject: "maths",
    primitive: "line-pair",
    params: { m1: 2, c1: -3, m2: 2, c2: 3 },
    question: "These two lean by exactly the same amount, but start at different heights. Where do they cross?",
    note: "Both have slope 2. Only the constant differs.",
    options: [
      { id: "parallel",  label: "Nowhere — they never meet" },
      { id: "one-point", label: "Once, far off to one side" },
      { id: "same-line", label: "Everywhere" },
    ],
    correct: "parallel",
    errorTags: { "one-point": "boundary-ignored", "same-line": "special-case-reasoning" },
    cues: {
      "boundary-ignored": "Follow the gap between them as the lines are drawn. Watch whether it narrows at all, or stays exactly the same.",
      "special-case-reasoning": "They match in one way and not the other. Look at what is still different between them.",
    },
    explain:
      "Equal slopes means the vertical gap between them never changes — it is 6 at every x, " +
      "forever. 'Two lines must cross somewhere' is the rule that fails exactly here, and it " +
      "fails because crossing requires the gap to close.",
  },
];
