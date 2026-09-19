/**
 * Spike batch 01 — P-45.
 *
 * Twenty candidate scenarios written against the schema and the primitives'
 * control ranges, with each `correct` reasoned to rather than measured. None
 * was run before being written down. Spike artefacts: not shipped.
 */
const circular = (r, omega, correct) => ({
  schema: 1, primitive: "circular-release", params: { r, omega },
  question: "The string is cut. Which way does the ball go?",
  options: [
    { id: "outward", label: "Straight out, away from the centre" },
    { id: "tangent", label: "Straight on, the way it was already going" },
    { id: "curve",   label: "It keeps following the circle" },
    { id: "spiral",  label: "It spirals outward" },
  ],
  correct,
  errorTags: { outward: "outward-in-circles", curve: "force-is-stored", spiral: "outward-in-circles" },
  explain: "The string pulled inward, so nothing ever pushed it outward. It keeps the velocity it had.",
});

const contact = (mt, mf, u, correct) => ({
  schema: 1, primitive: "contact-collision", params: { mt, mf, u },
  question: "During the collision, which pushes harder on the other?",
  options: [
    { id: "truck", label: "The heavy one pushes harder" },
    { id: "equal", label: "Exactly equally hard" },
    { id: "fly",   label: "The light one pushes harder" },
  ],
  correct,
  errorTags: { truck: "bigger-pushes-harder", fly: "special-case-reasoning" },
  explain: "The forces are equal and opposite. Only the accelerations differ, because the masses do.",
});

const pucks = (push, friction, u, correct) => ({
  schema: 1, primitive: "two-pucks", params: { push, friction, u },
  question: "One puck has a steady push, the other has none. What happens?",
  options: [
    { id: "needs",   label: "The pushed one holds its speed; the other stops" },
    { id: "runaway", label: "The pushed one keeps gaining speed; the other holds its speed" },
    { id: "same",    label: "Both carry on at the same steady speed" },
    { id: "both",    label: "Both slow down and stop" },
  ],
  correct,
  errorTags: { needs: "motion-implies-force", same: "motion-implies-force", both: "things-naturally-stop" },
  explain: "A force changes speed rather than maintaining it.",
});

export default [
  // circular-release — the physics does not depend on the parameters
  circular(0.8, 3.0, "tangent"),
  circular(1.8, 1.2, "tangent"),
  circular(2.0, 4.0, "tangent"),
  circular(0.5, 1.0, "tangent"),
  circular(1.6, 3.5, "tangent"),

  // contact-collision — likewise, the third law does not care about masses
  contact(1,   10,  30, "equal"),
  contact(5,   500,  5, "equal"),
  contact(3,   50,  25, "equal"),
  contact(1.5, 300, 12, "equal"),
  contact(4,   20,  18, "equal"),

  // two-pucks — here the parameters DO decide the answer, so this is the
  // informative subset: reasoned from push vs mu*m*g, m = 0.5 kg.
  pucks(0.6,  0,    4, "runaway"),  // frictionless, a push always adds speed
  pucks(0,    0,    5, "same"),     // nothing acting on either
  pucks(1.5,  0,    3, "runaway"),
  pucks(0.5,  0.1,  4, "needs"),    // push ~= mu*m*g = 0.49 N, so B should hold
  pucks(0.2,  0.1,  4, "both"),     // push below friction, both die
  pucks(2.0,  0.05, 2, "runaway"),  // strong push beats friction, B gains
  pucks(0,    0.15, 6, "both"),
  pucks(0.8,  0,    8, "runaway"),
  pucks(0.6,  0.2,  4, "both"),     // 0.6 < 0.981 N, B cannot sustain
  pucks(1.2,  0.25, 5, "both"),     // 1.2 < 1.226 N, B decays slowly
];
