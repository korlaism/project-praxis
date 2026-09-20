// SPDX-License-Identifier: MIT
export default {
  schema: 1,
  id: "which-way-does-it-fly",
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
  explain:
    "The string was pulling the ball INWARD the whole time — that is the only force there was. " +
    "Remove it and nothing pushes the ball anywhere, so it simply keeps the velocity it already had: " +
    "along the tangent. Nothing ever pushed it outward, so it cannot fly outward.",
};
