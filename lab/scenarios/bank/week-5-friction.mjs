// SPDX-License-Identifier: MIT
/**
 * Week 5 · Friction and inertia. The "things naturally stop" bait.
 *
 * The same apparatus as week 1 with friction turned on, on purpose: the point
 * only lands if the learner has already seen what happens without it.
 */
export default [
  {
    schema: 1,
    id: "push-weaker-than-friction",
    concept: "friction-and-inertia",
    difficulty: "medium",
    subject: "physics",
    primitive: "two-pucks",
    params: { push: 0.3, friction: 0.15, u: 5 },
    question: "A rough floor now. Puck B has a steady push, puck A has nothing. Who is still moving at the end?",
    note: "Friction 0.15 — a floor with some grip.",
    options: [
      { id: "needs",   label: "B holds its speed; A slows and stops" },
      { id: "both",    label: "Both slow and stop — B just takes a little longer" },
      { id: "outruns", label: "B speeds up while A slows" },
      { id: "same",    label: "Neither changes speed" },
    ],
    correct: "both",
    errorTags: { needs: "force-is-stored", outruns: "bigger-pushes-harder", same: "boundary-ignored" },
    cues: {
      "force-is-stored":
        "Compare two numbers before deciding: the push on B, and how hard this floor grips. One of them is bigger.",
      "bigger-pushes-harder":
        "A push does not automatically win. Ask what has to be true of its size for B to gain any speed at all.",
      "boundary-ignored":
        "Read the friction figure at the bottom of the screen. It is not zero this time.",
    },
    explain:
      "The push is real but it loses. Friction here takes more away each second than the push adds, so B slows too — " +
      "just more gradually than A. Nothing 'naturally' stops: B stops because the floor beats the push, and A stops " +
      "because nothing is fighting the floor on its behalf.",
  },
  {
    schema: 1,
    id: "push-beats-friction",
    concept: "friction-and-inertia",
    difficulty: "medium",
    subject: "physics",
    primitive: "two-pucks",
    params: { push: 1.5, friction: 0.05, u: 4 },
    question: "Same rough floor, but B's push is much stronger now. What happens to the two pucks?",
    note: "Friction 0.05, push 1.5 N.",
    options: [
      { id: "outruns", label: "B gains speed while A slows to a stop" },
      { id: "both",    label: "Both slow down; friction always wins in the end" },
      { id: "needs",   label: "B holds a steady speed while A slows" },
      { id: "same",    label: "Both hold their speed" },
    ],
    correct: "outruns",
    errorTags: { both: "things-naturally-stop", needs: "motion-implies-force", same: "boundary-ignored" },
    cues: {
      "things-naturally-stop":
        "Friction is not a law that everything must obey — it is one force among others. Compare its size here with the push.",
      "motion-implies-force":
        "Watch whether B's tape dots stay evenly spaced or keep spreading. Those are two different stories.",
      "boundary-ignored":
        "Check both numbers at the bottom before answering: there is friction, and it is small.",
    },
    explain:
      "Whichever is bigger, wins. The push adds more each second than friction removes, so B keeps gaining speed; " +
      "A has nothing fighting for it and slows to a stop. Same floor, same friction, opposite outcomes — " +
      "which is why 'things naturally stop' explains nothing.",
  },
];
