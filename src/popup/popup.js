import { verifyPassword } from "../lib/auth.js";
import { isEnabledForUrl } from "../lib/rules.js";

const $ = (id) => document.getElementById(id);

async function refresh() {
  const sync = await chrome.storage.sync.get(null);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const guarded = tab?.url ? isEnabledForUrl(tab.url, sync.rules ?? [], sync.globalEnabled ?? true) : false;
  $("status").textContent = (sync.globalEnabled ?? true) ? "Focus Gate: ON" : "Focus Gate: OFF";
  $("detail").textContent =
    `This tab ${guarded ? "IS" : "is NOT"} guarded · every ${sync.intervalMinutes ?? 15} min · ` +
    `${sync.questionsPerBreak ?? 5}/break · ${(sync.rules ?? []).length} URL rules · ${(sync.questions ?? []).length} questions`;
}

async function requirePassword() {
  const sync = await chrome.storage.sync.get(["pwdHash", "pwdSalt", "pbkdfIterations"]);
  if (!sync.pwdHash) { alert("Set a master password in Settings first."); return false; }
  const pw = prompt("Parent password:");
  if (!pw) return false;
  const ok = await verifyPassword(pw, sync.pwdSalt, sync.pwdHash, sync.pbkdfIterations || 100000);
  if (!ok) alert("Wrong password.");
  return ok;
}

$("toggle").onclick = async () => {
  if (!(await requirePassword())) return;
  const { globalEnabled } = await chrome.storage.sync.get(["globalEnabled"]);
  await chrome.storage.sync.set({ globalEnabled: !globalEnabled });
  refresh();
};
$("snooze").onclick = async () => {
  if (!(await requirePassword())) return;
  await chrome.storage.local.set({ unlockedUntil: Date.now() + 15 * 60 * 1000 });
  alert("Snoozed 15 min on this device.");
};
$("open").onclick = () => chrome.runtime.openOptionsPage();
refresh();
