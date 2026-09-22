// SPDX-License-Identifier: MIT
/**
 * Week 1 · Motion without force. The "moving means something is pushing" bait.
 *
 * Authored against the documented misconception, not drawn from an instrument
 * (ADR 0011). Every answer here is confirmed by running the simulation.
 */
export default [
  {
    schema: 1,
    id: "a-very-big-push",
    concept: "motion-without-force",
    difficulty: "medium",
    subject: "physics",
    primitive: "two-pucks",
    params: { push: 2, friction: 0, u: 2 },
    question: "The same slippery floor, but now the strongest push the lab has. Does a big push behave differently from a gentle one?",
    note: "2 N — ten times the gentle push, on the same frictionless floor.",
    options: [
      { id: "runaway", label: "No — same story, just faster: it keeps gaining speed" },
      { id: "needs",   label: "Yes — a big push drives it to a high steady speed and holds it there" },
      { id: "both",    label: "Yes — a push that hard makes it skid and lose speed" },
      { id: "same",    label: "Neither puck changes speed" },
    ],
    correct: "runaway",
    errorTags: { needs: "motion-implies-force", both: "bigger-pushes-harder", same: "boundary-ignored" },
    cues: {
      "motion-implies-force":
        "Compare this run with the gentle-push one. Look at whether the gaps between B's tape dots stop growing at some point, or only grow faster.",
      "bigger-pushes-harder":
        "Find what B could be skidding against. The friction figure at the bottom of the screen is the thing that would do it.",
      "boundary-ignored":
        "One puck has a 2 N push on it. Work out what a force does to something nothing else is touching.",
    },
    explain:
      "Same story, steeper. A force sets how fast the speed CHANGES, so ten times the push means ten times " +
      "the rate of gain — never a different kind of behaviour and never a speed it settles at. " +
      "Gentle and strong differ in degree, which is exactly what you would expect if force changes motion, " +
      "and not at all what you would expect if force maintained it.",
  },
  {
    schema: 1,
    id: "nothing-pushing-either",
    concept: "motion-without-force",
    difficulty: "easy",
    subject: "physics",
    primitive: "two-pucks",
    params: { push: 0, friction: 0, u: 5 },
    question: "Two pucks slide on a perfectly slippery floor. Nothing is pushing either of them. What happens?",
    note: "Ticker tape: a dot every quarter second. Even spacing means steady speed.",
    options: [
      { id: "both",    label: "Both slow down and stop — nothing is keeping them going" },
      { id: "same",    label: "Both keep sliding at the same steady speed" },
      { id: "needs",   label: "One holds its speed, the other slows" },
      { id: "runaway", label: "One of them speeds up" },
    ],
    correct: "same",
    errorTags: { both: "motion-implies-force", needs: "special-case-reasoning", runaway: "sign-or-direction" },
    cues: {
      "motion-implies-force":
        "Count the gaps between tape dots on either lane. If something were draining the motion away, the gaps would shrink — check whether they do.",
      "special-case-reasoning":
        "The two pucks have exactly the same everything. Look for a single difference between the lanes that could make them behave differently.",
      "sign-or-direction":
        "Look at the arrows, or the lack of them. Speeding up needs something pushing forward — find what it would be here.",
    },
    explain:
      "Nothing happens, and that IS the answer. Motion does not need a cause; only a CHANGE in motion does. " +
      "On a floor with no friction and no push, both pucks keep exactly the speed they started with, forever. " +
      "Everyday things stop because something quietly pushes back, not because motion runs out.",
  },
  {
    schema: 1,
    id: "a-gentle-steady-push",
    concept: "motion-without-force",
    difficulty: "hard",
    subject: "physics",
    primitive: "two-pucks",
    params: { push: 0.2, friction: 0, u: 5 },
    question: "Same slippery floor. Puck B gets a very gentle steady push — far too gentle to feel. What does it do?",
    note: "The push is 0.2 N, about the weight of two paperclips.",
    options: [
      { id: "needs",   label: "It settles at a slightly higher steady speed and stays there" },
      { id: "runaway", label: "It keeps gaining speed for as long as the push lasts" },
      { id: "same",    label: "A push that gentle does nothing at all" },
      { id: "both",    label: "It slows down more slowly than the other one" },
    ],
    correct: "runaway",
    errorTags: { needs: "motion-implies-force", same: "bigger-pushes-harder", both: "things-naturally-stop" },
    cues: {
      "motion-implies-force":
        "Watch B's tape dots over the whole run, not the first second. A steady speed makes evenly spaced dots — check whether B's ever stop spreading.",
      "bigger-pushes-harder":
        "Let it run to the end of the lane before judging. Ask what a small force does over a long time, not what it does immediately.",
      "things-naturally-stop":
        "Read the friction figure at the bottom of the screen first, then decide what could be slowing anything down.",
    },
    explain:
      "A force does not set a speed, it changes one — so even a tiny push keeps adding speed for as long as it lasts. " +
      "There is no speed at which the puck 'settles'. Gentleness changes how FAST the speed grows, never whether it grows.",
  },
];
