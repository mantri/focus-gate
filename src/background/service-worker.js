import { DEFAULTS } from "../lib/config.js";

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== "install") return;
  const cur = await chrome.storage.sync.get(null);
  if (cur.rules !== undefined && cur.questions !== undefined) return;
  try {
    const [cfgRes, seedRes] = await Promise.all([
      fetch(chrome.runtime.getURL("seed/default-config.json")),
      fetch(chrome.runtime.getURL("seed/questions-seed.txt")),
    ]);
    const seedCfg = await cfgRes.json();
    const seedText = await seedRes.text();
    // Parse lazily via dynamic import to keep install robust
    const { parseSeedText } = await import("../lib/seed-parser.js");
    const { questions } = parseSeedText(seedText);
    await chrome.storage.sync.set({
      globalEnabled: cur.globalEnabled ?? seedCfg.globalEnabled ?? DEFAULTS.globalEnabled,
      rules: cur.rules ?? seedCfg.rules ?? [],
      intervalMinutes: cur.intervalMinutes ?? seedCfg.intervalMinutes ?? 15,
      quizMix: cur.quizMix ?? seedCfg.quizMix ?? "mixed",
      mathLevel: cur.mathLevel ?? seedCfg.mathLevel ?? 2,
      overlayTitle: cur.overlayTitle ?? seedCfg.overlayTitle ?? "Take a brain break",
      overlaySubtitle: cur.overlaySubtitle ?? seedCfg.overlaySubtitle ?? "Answer the following to continue",
      accentColor: cur.accentColor ?? seedCfg.accentColor ?? "#4a5a9e",
      questionsPerBreak: cur.questionsPerBreak ?? seedCfg.questionsPerBreak ?? 5,
      questions: cur.questions ?? questions,
    });
  } catch (e) {
    console.warn("focus-gate seed failed", e);
    await chrome.storage.sync.set({
      globalEnabled: DEFAULTS.globalEnabled,
      rules: [{ pattern: "youtube.com", enabled: true }],
      intervalMinutes: 15, quizMix: "mixed", mathLevel: 2, questions: [],
      overlayTitle: DEFAULTS.overlayTitle, overlaySubtitle: DEFAULTS.overlaySubtitle,
      accentColor: DEFAULTS.accentColor, questionsPerBreak: DEFAULTS.questionsPerBreak,
    });
  }
  chrome.runtime.openOptionsPage?.();
});

chrome.alarms.create("fg-heartbeat", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(() => { /* keep worker alive; timers live in content scripts */ });

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "FG_SOLVED") {
    chrome.storage.local.set({ lastPromptAt: Date.now() }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "FG_GET_STATE") {
    Promise.all([chrome.storage.sync.get(null), chrome.storage.local.get(null)]).then(
      ([sync, local]) => sendResponse({ ok: true, sync, local })
    );
    return true;
  }
});
