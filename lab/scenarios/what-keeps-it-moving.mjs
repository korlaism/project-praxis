// SPDX-License-Identifier: MIT
export default {
  schema: 1,
  id: "what-keeps-it-moving",
  subject: "physics",
  primitive: "two-pucks",
  params: { push: 0.6, friction: 0, u: 4 },
  question: "Two identical pucks, same speed. One has a steady forward push, one has nothing. What happens?",
  note: "Ticker tape: a dot every quarter second. Even spacing means steady speed.",
  options: [
    { id: "needs",   label: "The pushed one keeps its speed; the other slows and stops" },
    { id: "runaway", label: "The pushed one keeps speeding up; the other holds its speed forever" },
    { id: "same",    label: "Both carry on at the same steady speed" },
    { id: "both",    label: "Both slow down — the pushed one just takes longer" },
  ],
  correct: "runaway",
  errorTags: {
    needs: "motion-implies-force",
    same: "motion-implies-force",
    both: "things-naturally-stop",
  },
  // ADR 0014. The tape is the instrument here: even gaps mean steady speed,
  // growing gaps mean speeding up. Both cues send the learner to the gaps.
  cues: {
    "motion-implies-force":
      "Set friction to zero and watch the tape dots on lane A, the puck with nothing pushing " +
      "it. Are its gaps growing, shrinking, or staying the same? Then compare B's gaps.",
    "things-naturally-stop":
      "Take friction to zero, then raise it again, watching only lane A. Decide whether " +
      "stopping is something the puck does by itself, or something the floor does to it.",
  },
  explain:
    "A force does not maintain speed, it CHANGES it — so a steady push means steady " +
    "acceleration, not steady motion. The unpushed puck needs nothing at all to keep going. " +
    "Turn the friction up and it does slow down, which is the real answer to why everyday " +
    "things stop: something is quietly pushing back, not because motion runs out.",
};
