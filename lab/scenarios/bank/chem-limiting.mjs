// SPDX-License-Identifier: MIT
/**
 * What runs out first. Baits `more-means-more-product` — the belief that
 * whichever reactant you have most of decides the yield. The recipe decides,
 * and the one that runs out stops everything.
 */
export default [
  {
    schema: 1,
    id: "which-one-runs-out",
    concept: "limiting-reagent",
    difficulty: "easy",
    subject: "chemistry",
    primitive: "limiting-reagent",
    params: { a: 4, b: 10, needA: 1, needB: 2 },
    question: "4 atoms of A and 10 of B, and every reaction needs 1 A with 2 B. Which runs out first?",
    note: "Watch the shelves empty. A hollow circle has already been used up.",
    options: [
      { id: "a",       label: "A — there is less of it to start with" },
      { id: "b",       label: "B — it gets used two at a time" },
      { id: "neither", label: "Neither: they run out together" },
    ],
    correct: "a",
    errorTags: { b: "more-means-more-product", neither: "special-case-reasoning" },
    cues: {
      "more-means-more-product":
        "Count how many reactions each pile can supply on its own, not how fast each pile shrinks. " +
        "Ten B at two per reaction is five reactions' worth. How many is four A worth?",
      "special-case-reasoning":
        "Running out together is a particular case, not the usual one. Work out what each pile is worth " +
        "in reactions and see whether those two numbers actually match.",
    },
    explain:
      "A is worth 4 reactions and B is worth 5, so the reaction stops after 4 and 2 B are left sitting " +
      "in the flask. Having MORE of something does not make it the one that lasts — what matters is how " +
      "many reactions each pile can supply, which is the amount divided by what the recipe asks for.",
  },
  {
    schema: 1,
    id: "exactly-enough",
    concept: "limiting-reagent",
    difficulty: "medium",
    subject: "chemistry",
    primitive: "limiting-reagent",
    params: { a: 5, b: 10, needA: 1, needB: 2 },
    question: "Now 5 A and 10 B, same recipe of 1 A to 2 B. What is left at the end?",
    note: "Same recipe, one more atom of A than last time.",
    options: [
      { id: "b",       label: "Some B — there was more of it" },
      { id: "a",       label: "Some A" },
      { id: "neither", label: "Nothing at all is left" },
    ],
    correct: "neither",
    errorTags: { b: "more-means-more-product", a: "boundary-ignored" },
    cues: {
      "more-means-more-product":
        "Ten is more than five, but the recipe eats B twice as fast. Work out how many reactions each " +
        "pile is worth before deciding which one outlasts the other.",
      "boundary-ignored":
        "There is a case where neither is left over, and it is easy to skip past. Check whether this is it " +
        "before picking which one survives.",
    },
    explain:
      "5 A at one each is 5 reactions; 10 B at two each is also 5. They run out together and the flask " +
      "ends empty of both. This exact case is reachable because the particles are whole — change A to 4 " +
      "or 6 and one of them is left over again.",
  },
];
