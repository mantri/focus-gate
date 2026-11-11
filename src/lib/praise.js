// Success praise shown after a correct answer. Kid-friendly, funny.
export const PRAISES = [
  "BOOM! Brain power +100! 🎉",
  "Correct! Your neurons just did a victory dance! 🕺🧠",
  "Smarty-pants status: CONFIRMED! 🤓⭐",
  "You outsmarted the quiz. It is filing a complaint. 😎",
  "High-five from your brain! ✋🧠",
  "Einstein called — he says nice work! ⚡",
  "LEVEL UP! Unlocking your show in 3... 2... 1... 🚀",
  "That answer was smoother than pizza! 🍕✅",
  "Gold star for you! ⭐ Actually, take the whole galaxy! 🌟",
  "Your brain just grew 3 sizes! (Grinch-style, but happier.) 💚",
  "Correct! Doing a confetti cannon just for you! 🎊",
  "Too easy for you! The quiz needs a nap now. 😴🏆",
];

export function getPraise(rand = Math.random) {
  return PRAISES[Math.floor(rand() * PRAISES.length)];
}
