// SPDX-License-Identifier: MIT
/**
 * Week 2 · Falling. The heaviest single misconception, and the only one where
 * everyday evidence is genuinely on the wrong side: heavy things really do
 * usually land first. So the air is part of the lesson rather than an excuse
 * for it — the third item hands the learner's own experience back with a
 * reason attached.
 */
export default [
  {
    schema: 1,
    id: "equal-masses-with-air",
    concept: "falling",
    difficulty: "medium",
    subject: "physics",
    primitive: "free-fall",
    params: { heavy: 2, light: 2, height: 20, air: 0.08 },
    question: "Thick air, and this time the two balls have the SAME mass. Which lands first?",
    note: "Identical balls, identical air — the previous item's air setting, unchanged.",
    options: [
      { id: "together", label: "Together — air makes no difference here" },
      { id: "heavier",  label: "One of them, unpredictably — air makes falling messy" },
    ],
    correct: "together",
    errorTags: { heavier: "boundary-ignored" },
    cues: {
      "boundary-ignored":
        "Air slowed the lighter ball more in the last item. Ask what it has to work with when there is no lighter ball.",
    },
    explain:
      "Air does not make falling random, and it does not punish falling — it punishes a DIFFERENCE. " +
      "With the same mass and the same shape, both balls meet the same push at the same speed and stay level " +
      "the whole way down. Air only separated them a moment ago because one of them was easier to slow.",
  },
  {
    schema: 1,
    id: "thin-air-short-drop",
    concept: "falling",
    difficulty: "hard",
    subject: "physics",
    primitive: "free-fall",
    params: { heavy: 5, light: 0.5, height: 5, air: 0.005 },
    question: "There IS air this time — just very little — and the drop is short. Which lands first?",
    note: "Air 0.005, a twentieth of the last setting, from five metres rather than twenty.",
    options: [
      { id: "heavier",  label: "The heavy one — any air at all separates them" },
      { id: "together", label: "Together — this isn't enough air, over this distance, to show" },
    ],
    correct: "together",
    errorTags: { heavier: "boundary-ignored" },
    cues: {
      "boundary-ignored":
        "Air resistance grows with speed, and speed takes distance to build. Watch the landing times, then try the same air from forty-five metres.",
    },
    explain:
      "Air needs speed to bite, and speed needs distance. Over five metres neither ball gets near the speed " +
      "where this much air matters, so they land together to the hundredth of a second. " +
      "The rule is not 'air separates them' — it is 'enough air, for long enough, separates them'. " +
      "Raise the drop to forty-five metres with this same air and the heavy one wins again.",
  },
  {
    schema: 1,
    id: "thin-air-long-drop",
    concept: "falling",
    difficulty: "hard",
    subject: "physics",
    primitive: "free-fall",
    params: { heavy: 5, light: 0.5, height: 45, air: 0.005 },
    question: "The same thin air as a moment ago, but now from as high as the lab goes. Still together?",
    note: "Air 0.005 — unchanged. Only the height is different.",
    options: [
      { id: "together", label: "Yes — this little air never mattered" },
      { id: "heavier",  label: "No — given enough fall, the heavy one pulls ahead" },
    ],
    correct: "heavier",
    errorTags: { together: "boundary-ignored" },
    cues: {
      "boundary-ignored":
        "Nothing about the air changed between these two items. Work out what did, and what that gives the air more of.",
    },
    explain:
      "Same air, longer fall, different answer. The balls have time to build speed, and the faster they go " +
      "the harder the air pushes back — so the difference that was invisible over five metres has room to show " +
      "over forty-five. This is why 'do heavy things fall faster?' has no single answer until you say how far, " +
      "through what.",
  },
  {
    schema: 1,
    id: "two-balls-no-air",
    concept: "falling",
    difficulty: "easy",
    subject: "physics",
    primitive: "free-fall",
    params: { heavy: 5, light: 0.5, height: 20, air: 0 },
    question: "Two balls, the same size, one ten times heavier. Dropped together, with the air removed. Which lands first?",
    note: "Same size and shape — only the mass differs. No air at all.",
    options: [
      { id: "heavier",  label: "The heavy one, by a clear margin" },
      { id: "together", label: "They land at the same moment" },
      { id: "lighter",  label: "The light one — it has less to hold it back" },
    ],
    correct: "together",
    errorTags: { heavier: "heavier-falls-faster", lighter: "sign-or-direction" },
    cues: {
      "heavier-falls-faster":
        "Weight pulls harder on the heavy ball — that much is true. Ask what else is ten times bigger about it, and what that does to how easily it can be sped up.",
      "sign-or-direction":
        "Work out which way this reasoning points. If having less mass helped, a feather would beat a hammer in a vacuum.",
    },
    explain:
      "Exactly together. Ten times the mass is pulled ten times as hard — and is also ten times harder to get moving. " +
      "The two effects cancel perfectly, so every object accelerates at the same 9.81 m/s² regardless of mass. " +
      "Nothing about being heavy makes you fall faster. Turn the air on and watch what actually causes the difference you have seen all your life.",
  },
  {
    schema: 1,
    id: "extreme-mass-ratio-no-air",
    concept: "falling",
    difficulty: "medium",
    subject: "physics",
    primitive: "free-fall",
    params: { heavy: 20, light: 0.1, height: 45, air: 0 },
    question: "Two hundred times the mass, dropped from as high as the lab goes, still no air. Does the difference show up now?",
    note: "20 kg against 100 g, from 45 metres — the longest fall available.",
    options: [
      { id: "together", label: "No — still exactly together, however far they fall" },
      { id: "heavier",  label: "Yes — over that distance the heavy one pulls ahead" },
      { id: "lighter",  label: "Yes — the light one drifts and arrives late" },
    ],
    correct: "together",
    errorTags: { heavier: "heavier-falls-faster", lighter: "motion-implies-force" },
    cues: {
      "heavier-falls-faster":
        "A small difference in rate would grow over a long fall — so a long fall is a good test. Watch the two landing times at the bottom of the screen and compare them.",
      "motion-implies-force":
        "Drifting needs something to push it sideways. Check what is touching either ball on the way down.",
    },
    explain:
      "Two hundred to one, forty-five metres, and the landing times are identical to the digit. " +
      "Distance does not accumulate a difference that was never there. This is the experiment Galileo argued for " +
      "and Apollo 15 actually ran on the Moon, with a hammer and a feather.",
  },
  {
    schema: 1,
    id: "same-balls-with-air",
    concept: "falling",
    difficulty: "hard",
    subject: "physics",
    primitive: "free-fall",
    params: { heavy: 5, light: 0.5, height: 20, air: 0.08 },
    question: "The same two balls, from the same height — but now with air. What happens?",
    note: "Same size, so the air pushes back on both equally hard at any given speed.",
    options: [
      { id: "heavier",  label: "The heavy one lands first" },
      { id: "together", label: "Still together — air cannot tell them apart" },
      { id: "lighter",  label: "The light one lands first" },
    ],
    correct: "heavier",
    errorTags: { together: "boundary-ignored", lighter: "sign-or-direction" },
    cues: {
      "boundary-ignored":
        "The air pushes back on both balls with the same force at the same speed. They do not have the same mass — think about what the same push does to each of them.",
      "sign-or-direction":
        "Decide which way air resistance acts, and which ball is more affected by a push of a given size.",
    },
    explain:
      "Now the heavy one wins — and notice WHY. The air pushes back equally hard on both, because they are the same " +
      "size and shape. That same push barely slows five kilograms and substantially slows half a kilogram. " +
      "So the everyday rule you have always seen is real, but it is about air, not about weight. " +
      "A feather loses because it is light FOR ITS SIZE, not because it is light.",
  },
];
