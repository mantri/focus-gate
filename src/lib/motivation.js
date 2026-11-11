// Funny motivational excuses shown on the overlay. Keep kid-friendly, no shame.
export const MOTIVATIONS = [
  "Your brain asked for a snack. Math is the snack.",
  "This quiz is sponsored by your future genius self.",
  "YouTube will still be there. Prove you're smarter than autoplay first.",
  "One question now = +10 brain XP. Boss level later.",
  "Scientists agree: pausing is basically a superpower. (Probably.)",
  "Your eyes needed a stretch. Your brain volunteered.",
  "Answer this and unlock... exactly what you were already watching. Worth it!",
  "Even robots do homework updates. This is yours.",
  "Quick detour through Smarty-Town. Population: you.",
  "WARNING: excessive knowledge may cause extreme coolness.",
  "This break brought to you by Mom/Dad's master plan. Shhh.",
  "Solve it fast and you can tell everyone the quiz feared YOU.",
];

export function getMotivation(rand = Math.random) {
  return MOTIVATIONS[Math.floor(rand() * MOTIVATIONS.length)];
}
