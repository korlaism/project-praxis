// SPDX-License-Identifier: MIT
/**
 * Where the mass went. Baits `mass-is-lost` — the balance reading really does
 * fall, which is what makes the misconception reasonable. What the learner has
 * to separate is the gas leaving the jar from matter ceasing to exist.
 */
export default [
  {
    schema: 1,
    id: "fizzing-with-the-lid-off",
    concept: "conservation-of-mass",
    difficulty: "easy",
    subject: "chemistry",
    primitive: "sealed-jar",
    params: { start: 50, gas: 6, sealed: 0 },
    question: "A tablet fizzes in an open jar on a balance. What does the balance read at the end?",
    note: "It started at 50 g. The lid is off.",
    options: [
      { id: "same",    label: "50 g — matter cannot be destroyed" },
      { id: "lighter", label: "Less than 50 g" },
    ],
    correct: "lighter",
    errorTags: { same: "special-case-reasoning" },
    cues: {
      "special-case-reasoning":
        "Nothing was destroyed, and the balance still falls. Watch what rises out of the top of the jar, " +
        "then ask what the balance is actually weighing.",
    },
    explain:
      "The balance ends at 44 g, and nothing was destroyed to get there. It weighs what is IN THE JAR, " +
      "and 6 g of that left through the open top. The mass is not gone — it is in the room.",
  },
  {
    schema: 1,
    id: "same-fizz-lid-on",
    concept: "conservation-of-mass",
    difficulty: "medium",
    subject: "chemistry",
    primitive: "sealed-jar",
    params: { start: 50, gas: 6, sealed: 1 },
    question: "The same tablet, the same jar, the same 6 g of gas — but the lid is on. Now what?",
    note: "Only one thing changed from the last one.",
    options: [
      { id: "lighter", label: "Less than 50 g — it still fizzed" },
      { id: "same",    label: "Still 50 g" },
    ],
    correct: "same",
    errorTags: { lighter: "mass-is-lost" },
    cues: {
      "mass-is-lost":
        "The reaction is identical to the one before: the same tablet, the same gas. The only thing that " +
        "changed is whether that gas can get out. Watch the bubbles and see where they end up this time.",
    },
    explain:
      "50 g, exactly as it started. The reaction did not change at all — the gas is still made, and you " +
      "can see it collected under the lid. What changed is that it had nowhere to go, so the balance kept " +
      "weighing it. The fizzing never destroyed anything; an open lid just let the evidence walk away.",
  },
];
