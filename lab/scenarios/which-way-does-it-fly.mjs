// SPDX-License-Identifier: MIT
export default {
  schema: 1,
  id: "which-way-does-it-fly",
  concept: "circular-motion",
  difficulty: "easy",
  subject: "physics",
  primitive: "circular-release",
  params: { r: 1.2, omega: 2.4 },
  question: "A ball is whirling on a string. You cut the string. Which way does it fly?",
  note: "Looking down on a frictionless table — no gravity in this plane. Cut the string whenever you like.",
  options: [
    { id: "outward", label: "Straight outward, away from the centre" },
    { id: "tangent", label: "Straight, in the direction it was already moving" },
    { id: "curve",   label: "It carries on curving along the same circle" },
    { id: "spiral",  label: "It spirals outwards, widening as it goes" },
  ],
  correct: "tangent",
  errorTags: {
    outward: "outward-in-circles",
    curve: "force-is-stored",
    spiral: "outward-in-circles",
  },
  // ADR 0014. Each cue names what to look at and what to decide, and stops
  // there. If reading the cue settles the question, it is an explanation.
  cues: {
    "outward-in-circles":
      "Before the cut, find the one thing that was touching the ball. Which way was it " +
      "pulling — towards the centre, or away from it? Nothing else was in contact with it at all.",
    "force-is-stored":
      "After the cut, list everything still touching the ball. Then ask what is left to " +
      "keep bending its path, and where that bend would come from.",
  },
  explain:
    "The string was pulling the ball INWARD the whole time — that is the only force there was. " +
    "Remove it and nothing pushes the ball anywhere, so it simply keeps the velocity it already had: " +
    "along the tangent. Nothing ever pushed it outward, so it cannot fly outward.",
};
