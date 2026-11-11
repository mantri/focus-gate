export const STORAGE_KEYS = ["globalEnabled", "rules", "intervalMinutes", "quizMix", "mathLevel", "questions", "pwdHash", "pwdSalt", "pbkdfIterations", "overlayTitle", "overlaySubtitle", "accentColor", "questionsPerBreak"];

export const DEFAULTS = {
  globalEnabled: true,
  intervalMinutes: 15,
  quizMix: "mixed", // mixed | math-only | bank-only
  mathLevel: 2, // 1..3
  rules: [],
  questions: [],
  overlayTitle: "Take a brain break",
  overlaySubtitle: "Answer the following to continue",
  accentColor: "#4a5a9e",
  questionsPerBreak: 5,
};

export function validateConfig(cfg) {
  const errors = [];
  if (cfg.intervalMinutes == null || Number.isNaN(Number(cfg.intervalMinutes)) || Number(cfg.intervalMinutes) < 0.1) {
    errors.push("intervalMinutes must be a number >= 0.1");
  }
  if (!["mixed", "math-only", "bank-only"].includes(cfg.quizMix)) errors.push("quizMix must be mixed|math-only|bank-only");
  if (![1, 2, 3].includes(Number(cfg.mathLevel))) errors.push("mathLevel must be 1, 2 or 3");
  if (!Array.isArray(cfg.rules)) errors.push("rules must be an array");
  if (!Array.isArray(cfg.questions)) errors.push("questions must be an array");
  if (cfg.overlayTitle != null && String(cfg.overlayTitle).length > 80) errors.push("overlayTitle max 80 chars");
  if (cfg.overlaySubtitle != null && String(cfg.overlaySubtitle).length > 140) errors.push("overlaySubtitle max 140 chars");
  if (cfg.accentColor != null && !/^#[0-9a-fA-F]{6}$/.test(String(cfg.accentColor))) errors.push("accentColor must be #rrggbb");
  if (cfg.questionsPerBreak == null || !Number.isInteger(Number(cfg.questionsPerBreak)) || Number(cfg.questionsPerBreak) < 1 || Number(cfg.questionsPerBreak) > 20) {
    errors.push("questionsPerBreak must be an integer 1..20");
  }
  return errors;
}
