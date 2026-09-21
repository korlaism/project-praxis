// SPDX-License-Identifier: MIT
/**
 * Week 3 · Action and reaction. The "bigger thing pushes harder" bait.
 *
 * The answer never changes, however extreme the mismatch — which is the point,
 * and why the items vary the numbers rather than the physics. A learner who
 * thinks size decides the force should watch it survive every setting.
 */
export default [
  {
    schema: 1,
    id: "lightest-possible-fly",
    concept: "action-and-reaction",
    difficulty: "medium",
    subject: "physics",
    primitive: "contact-collision",
    params: { mt: 5, mf: 10, u: 25 },
    question: "The heaviest truck and the lightest fly, at speed. Now which pushes harder?",
    note: "Five tonnes against ten milligrams — half a million to one.",
    options: [
      { id: "truck", label: "The truck, by about half a million times" },
      { id: "equal", label: "Exactly the same, even at this ratio" },
      { id: "fly",   label: "The fly, because all of it hits one tiny spot" },
    ],
    correct: "equal",
    errorTags: { truck: "bigger-pushes-harder", fly: "special-case-reasoning" },
    cues: {
      "bigger-pushes-harder":
        "If the ratio decided it, the two arrows would differ by that ratio. Measure them against each other at the instant of contact.",
      "special-case-reasoning":
        "Concentrating a force on a small spot changes what it DOES to the material. Check whether it changes the size of the push itself.",
    },
    explain:
      "Half a million to one, and the two forces are still identical. The mass ratio decides what the force DOES — " +
      "the fly's acceleration is half a million times the truck's — but never how big the force is. " +
      "Pushing is something two objects do to each other, and there is only ever one push to share.",
  },
  {
    schema: 1,
    id: "barely-moving-truck",
    concept: "action-and-reaction",
    difficulty: "hard",
    subject: "physics",
    primitive: "contact-collision",
    params: { mt: 1, mf: 500, u: 5 },
    question: "A light truck barely rolling, and an unusually heavy fly. Does a slow speed change who pushes harder?",
    note: "One tonne at walking pace, against half a gram.",
    options: [
      { id: "equal", label: "No — still exactly equal" },
      { id: "truck", label: "Yes — slower, but the truck still wins" },
      { id: "fly",   label: "At this speed the fly might actually push harder" },
    ],
    correct: "equal",
    errorTags: { truck: "bigger-pushes-harder", fly: "special-case-reasoning" },
    cues: {
      "bigger-pushes-harder":
        "Speed changes how big both forces are. Watch whether it changes how they compare with each other.",
      "special-case-reasoning":
        "You are looking for a setting where the rule breaks. Try the sliders yourself and watch the two arrows as you do.",
    },
    explain:
      "Slower contact means smaller forces — both of them, equally. Nothing about the speed, the masses or the " +
      "damage can separate the pair: they are the same interaction seen from two ends.",
  },
];
