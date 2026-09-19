export default {
  schema: 1,
  primitive: "contact-collision",
  params: { mt: 2, mf: 200, u: 20 },
  question: "A truck hits a fly. Which one pushes harder on the other?",
  note: "Slowed about 500×, and zoomed right in on the moment of contact.",
  options: [
    { id: "truck", label: "The truck pushes much harder on the fly" },
    { id: "equal", label: "They push on each other exactly as hard" },
    { id: "fly",   label: "The fly pushes harder — that is why it splatters" },
  ],
  correct: "equal",
  errorTags: { truck: "bigger-pushes-harder", fly: "special-case-reasoning" },
  explain:
    "Equal forces, every time — change the masses or the speed and they stay equal. " +
    "What differs is the CONSEQUENCE: the same force divided by a tiny mass is an enormous " +
    "acceleration, and divided by two tonnes is almost nothing. The fly is not pushed harder, " +
    "it is just far easier to push.",
};
