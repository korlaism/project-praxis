// SPDX-License-Identifier: MIT
/**
 * Finding things. Baits `better-big-o-always-wins` — the belief that better
 * growth means faster on every input. The counterexample is not exotic: it is
 * the first element of any array at all.
 */
export default [
  {
    schema: 1,
    id: "first-in-a-big-list",
    concept: "searching",
    difficulty: "easy",
    subject: "computing",
    primitive: "search-race",
    params: { n: 62, target: 1 },
    question: "62 sorted items, and the one you want is first. Which search reaches it in fewer comparisons?",
    note: "Counting comparisons, not seconds. Both searches are correct; only the count differs.",
    options: [
      { id: "binary", label: "The halving search — it is the faster algorithm" },
      { id: "linear", label: "The one-by-one scan" },
      { id: "tie",    label: "Exactly the same number" },
    ],
    correct: "linear",
    errorTags: { binary: "better-big-o-always-wins", tie: "special-case-reasoning" },
    cues: {
      "better-big-o-always-wins":
        "Watch where the halving search looks FIRST. It does not start at the front, and it has no way " +
        "of knowing that it should. Count how many comparisons each one has made by the time it stops.",
      "special-case-reasoning":
        "The two searches look in completely different places. Follow each one and count — a tie would " +
        "need both to stop on the same comparison, and they are not even starting in the same place.",
    },
    explain:
      "One comparison against six. Better growth is a claim about what happens as the list gets LONGER, " +
      "not a promise about this list. The halving search starts in the middle, because it cannot know " +
      "where the answer is — and starting in the middle is the worst possible guess when the answer is first.",
  },
  {
    schema: 1,
    id: "deep-in-a-big-list",
    concept: "searching",
    difficulty: "easy",
    subject: "computing",
    primitive: "search-race",
    params: { n: 62, target: 62 },
    question: "The same 62 items, but now you want the last one. Which search wins?",
    note: "Only the position changed.",
    options: [
      { id: "linear", label: "The one-by-one scan — it was ahead last time" },
      { id: "binary", label: "The halving search" },
      { id: "tie",    label: "Exactly the same number" },
    ],
    correct: "binary",
    errorTags: { linear: "special-case-reasoning", tie: "boundary-ignored" },
    cues: {
      "special-case-reasoning":
        "The scan won the last one because it stopped immediately. Watch how far it has to go this time " +
        "before it stops at all.",
      "boundary-ignored":
        "There is a position where the two draw, and the ends of the list are the furthest thing from it. " +
        "Count both and see how far apart they finish.",
    },
    explain:
      "62 comparisons against 6. This is the case the better algorithm was built for, and it is why " +
      "the growth claim matters: the scan's cost rises with every item added, and the halving search's " +
      "barely moves. Both items are true at once — which one wins depends on where you look.",
  },
];
