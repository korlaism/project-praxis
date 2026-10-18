// SPDX-License-Identifier: MIT
/**
 * Why order costs. Baits `same-work-same-cost` — the belief that the same
 * number of operations costs the same however they are ordered. Every cell is
 * read exactly once in both walks; what differs is what memory has to fetch.
 */
export default [
  {
    schema: 1,
    id: "same-cells-different-order",
    concept: "memory-and-cost",
    difficulty: "medium",
    subject: "computing",
    primitive: "cache-walk",
    params: { rows: 4, cols: 8, line: 4, held: 2 },
    question: "The same 32 cells, read along the rows or down the columns. Does the order change what memory has to fetch?",
    note: "A teaching model: cells are stored row by row, and a fetch brings in 4 neighbours at once.",
    options: [
      { id: "same", label: "No — the same 32 cells are read either way" },
      { id: "rows", label: "Yes — going along the rows fetches less" },
    ],
    correct: "rows",
    errorTags: { same: "same-work-same-cost" },
    cues: {
      "same-work-same-cost":
        "Both do read all 32 cells, so count something else: the outlined boxes. A fetch brings in a whole " +
        "box. Watch how many boxes each order has to open, and whether it ever opens the same one twice.",
    },
    explain:
      "8 fetches against 32. Reading along a row uses all four cells of a box before moving on; reading " +
      "down a column touches one cell of a box and then leaves, and by the time it comes back the cache " +
      "has thrown the box away. The work is identical and the cost is four times as much.",
  },
  {
    schema: 1,
    id: "a-cache-big-enough",
    concept: "memory-and-cost",
    difficulty: "hard",
    subject: "computing",
    primitive: "cache-walk",
    params: { rows: 4, cols: 8, line: 4, held: 4 },
    question: "Same grid, same two orders — but the cache now holds 4 lines instead of 2. Now does the order matter?",
    note: "Only the cache size changed.",
    options: [
      { id: "rows", label: "Yes — rows still fetch less" },
      { id: "same", label: "No — both fetch the same now" },
    ],
    correct: "same",
    errorTags: { rows: "special-case-reasoning" },
    cues: {
      "special-case-reasoning":
        "Rows won last time because the column walk kept losing boxes before it came back to them. " +
        "There are four rows. Count how many boxes the cache can now keep at once, and see whether it " +
        "ever has to throw one away.",
    },
    explain:
      "8 fetches either way. With room for one box per row, the column walk never loses a box before it " +
      "returns to it, so nothing is fetched twice. The lesson is not that columns are slow — it is that " +
      "the cost depends on whether what you are working on fits. Change the cache and the answer changes.",
  },
];
