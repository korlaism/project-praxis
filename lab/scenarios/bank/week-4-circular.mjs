// SPDX-License-Identifier: MIT
/**
 * Week 4 · Circular motion. The outward-force bait.
 *
 * Like week 3, the answer is the same at every setting, and that is the
 * lesson. The variations exist so a learner can hunt for the setting where
 * the ball finally flies outward, and fail to find one.
 */
export default [
  {
    schema: 1,
    id: "short-string-fast-spin",
    concept: "circular-motion",
    difficulty: "easy",
    subject: "physics",
    primitive: "circular-release",
    params: { r: 0.5, omega: 4 },
    question: "A short string, spun as fast as it goes. Cut it — does the extra speed throw the ball outward?",
    note: "Looking down on a frictionless table. Half a metre of string, four radians a second.",
    options: [
      { id: "outward", label: "Yes — the faster it spins, the more it flies straight out" },
      { id: "tangent", label: "No — straight along the way it was already moving" },
      { id: "spiral",  label: "It spirals outward, widening as it goes" },
      { id: "curve",   label: "It keeps curving along the same circle" },
    ],
    correct: "tangent",
    errorTags: { outward: "outward-in-circles", spiral: "outward-in-circles", curve: "force-is-stored" },
    cues: {
      "outward-in-circles":
        "Find everything touching the ball before the cut, and work out which way each one pulls. There is only one, and it is not pulling outward.",
      "force-is-stored":
        "After the cut, name what is still touching the ball. Then ask what could bend its path without touching it.",
    },
    explain:
      "Speed changes how FAST it leaves, never which way. The string only ever pulled inward, so cutting it leaves " +
      "nothing pulling at all — and something with no force on it travels in a straight line, along the tangent. " +
      "Spin it faster and you get a faster straight line.",
  },
  {
    schema: 1,
    id: "long-string-slow-spin",
    concept: "circular-motion",
    difficulty: "medium",
    subject: "physics",
    primitive: "circular-release",
    params: { r: 2, omega: 1 },
    question: "Now a long string, turning lazily. With this much room, which way does it go when cut?",
    note: "Two metres of string, one radian a second — slow enough to watch closely.",
    options: [
      { id: "tangent", label: "Straight, along the way it was already moving" },
      { id: "curve",   label: "It carries on around the circle for a while, then straightens" },
      { id: "outward", label: "Straight outward from the centre" },
      { id: "spiral",  label: "A gentle spiral outward" },
    ],
    correct: "tangent",
    errorTags: { curve: "force-is-stored", outward: "outward-in-circles", spiral: "outward-in-circles" },
    cues: {
      "force-is-stored":
        "Watch the frame right after the cut, not the whole flight. Decide whether the path bends at all, or whether it was straight from the first instant.",
      "outward-in-circles":
        "Slow it down and watch which way the string pulls while it still exists. Cutting removes that pull; it does not reverse it.",
    },
    explain:
      "Going slowly makes it easier to see that the turn stops INSTANTLY. Nothing is stored up in the ball to keep " +
      "it curving, and nothing was ever pushing it outward — the string pulled inward, and now it is gone.",
  },
];
