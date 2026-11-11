import { generateSalt, hashPassword, verifyPassword } from "../lib/auth.js";
import { parseSeedText, serializeQuestions } from "../lib/seed-parser.js";
import { validateConfig } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
let rules = [], questions = [];

async function load() {
  const s = await chrome.storage.sync.get(null);
  const local = await chrome.storage.local.get(["mascotImage"]);
  rules = s.rules ?? []; questions = s.questions ?? [];
  $("globalEnabled").checked = s.globalEnabled ?? true;
  $("intervalMinutes").value = s.intervalMinutes ?? 15;
  $("quizMix").value = s.quizMix ?? "mixed";
  $("mathLevel").value = String(s.mathLevel ?? 2);
  $("questionsPerBreak").value = s.questionsPerBreak ?? 5;
  $("overlayTitle").value = s.overlayTitle ?? "Take a brain break";
  $("overlaySubtitle").value = s.overlaySubtitle ?? "Answer the following to continue";
  $("accentColor").value = s.accentColor ?? "#4a5a9e";
  $("mascotPreview").src = local.mascotImage || chrome.runtime.getURL("assets/mascot-default.png");
  $("pwStatus").textContent = s.pwdHash ? "Password is SET." : "No password yet — set one now.";
  renderRules(); renderQuestions();
  $("bulk").value = serializeQuestions(questions);
}

function renderRules() {
  $("rules").innerHTML = "";
  rules.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td></td><td><input type="checkbox" ${r.enabled !== false ? "checked" : ""}></td><td><button>✕</button></td>`;
    tr.children[0].textContent = r.pattern;
    tr.querySelector("input").onchange = (e) => (rules[i].enabled = e.target.checked);
    tr.querySelector("button").onclick = () => { rules.splice(i, 1); renderRules(); };
    $("rules").appendChild(tr);
  });
}

function renderQuestions() {
  $("qlist").innerHTML = "";
  questions.forEach((q, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td></td><td></td><td></td><td><button>✕</button></td>`;
    tr.children[0].textContent = q.type; tr.children[1].textContent = q.question; tr.children[2].textContent = q.answer;
    tr.querySelector("button").onclick = () => { questions.splice(i, 1); renderQuestions(); persistQuestions(); };
    $("qlist").appendChild(tr);
  });
}

async function persistQuestions() {
  await chrome.storage.sync.set({ questions });
  $("bulk").value = serializeQuestions(questions);
}

$("pwSave").onclick = async () => {
  const a = $("pw1").value, b = $("pw2").value;
  if (a.length < 4) return ($("pwErr").textContent = "min 4 chars");
  if (a !== b) return ($("pwErr").textContent = "passwords differ");
  const salt = generateSalt();
  const hash = await hashPassword(a, salt, 100000);
  await chrome.storage.sync.set({ pwdHash: hash, pwdSalt: salt, pbkdfIterations: 100000 });
  $("pwErr").textContent = ""; $("pw1").value = $("pw2").value = "";
  load();
};

$("timeSave").onclick = async () => {
  const cfg = {
    globalEnabled: $("globalEnabled").checked,
    intervalMinutes: Number($("intervalMinutes").value),
    quizMix: $("quizMix").value, mathLevel: Number($("mathLevel").value), rules, questions,
    questionsPerBreak: Number($("questionsPerBreak").value),
    overlayTitle: $("overlayTitle").value.trim() || "Take a brain break",
    overlaySubtitle: $("overlaySubtitle").value.trim() || "Answer the following to continue",
    accentColor: $("accentColor").value,
  };
  const errs = validateConfig(cfg);
  if (errs.length) return alert(errs.join("\n"));
  await chrome.storage.sync.set(cfg);
  alert("Saved.");
};

$("appearanceSave").onclick = async () => {
  const cfg = {
    overlayTitle: $("overlayTitle").value.trim() || "Take a brain break",
    overlaySubtitle: $("overlaySubtitle").value.trim() || "Answer the following to continue",
    accentColor: $("accentColor").value,
  };
  const errs = validateConfig({ intervalMinutes: Number($("intervalMinutes").value) || 15, quizMix: $("quizMix").value, mathLevel: Number($("mathLevel").value), rules, questions, questionsPerBreak: Number($("questionsPerBreak").value) || 5, ...cfg });
  if (errs.length) return alert(errs.join("\n"));
  await chrome.storage.sync.set(cfg);
  alert("Appearance saved.");
};

$("mascotFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 500 * 1024) return alert("Keep image under 500KB for storage.");
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f);
  });
  await chrome.storage.local.set({ mascotImage: dataUrl });
  $("mascotPreview").src = dataUrl;
};

$("mascotReset").onclick = async () => {
  await chrome.storage.local.remove(["mascotImage"]);
  $("mascotPreview").src = chrome.runtime.getURL("assets/mascot-default.png");
};

$("addRule").onclick = () => {
  const p = $("newPattern").value.trim();
  if (!p) return;
  rules.push({ pattern: p, enabled: true });
  $("newPattern").value = ""; renderRules();
};
$("rulesSave").onclick = async () => { await chrome.storage.sync.set({ rules }); alert("URLs saved."); };

$("qAdd").onclick = async () => {
  const q = { id: "manual-" + Date.now(), type: $("qType").value.trim().toLowerCase() || "text", question: $("qQ").value.trim(), answer: $("qA").value.trim() };
  if (!q.question || !q.answer) return alert("question + answer required");
  if ($("qC").value.trim()) q.choices = $("qC").value.split(/[|,]/).map((s) => s.trim()).filter(Boolean);
  questions.push(q); renderQuestions(); persistQuestions();
  $("qQ").value = $("qA").value = $("qC").value = "";
};

$("bulkImport").onclick = async () => {
  const { questions: qs, errors } = parseSeedText($("bulk").value);
  if (errors.length) $("bulkErr").textContent = errors.map((e) => `line ${e.line}: ${e.message}`).join("; ");
  else $("bulkErr").textContent = "";
  if (!qs.length) return alert("No valid questions found.");
  questions = qs; renderQuestions(); await persistQuestions();
  alert(`Imported ${qs.length} questions${errors.length ? ` (${errors.length} bad lines skipped)` : ""}.`);
};

$("importFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  $("bulk").value = await f.text();
  alert("File loaded into textarea — click Preview & Save.");
};

$("exportTxt").onclick = () => {
  const blob = new Blob([serializeQuestions(questions)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "focus-gate-questions.txt"; a.click();
};

$("resetSeed").onclick = async () => {
  const txt = await (await fetch(chrome.runtime.getURL("seed/questions-seed.txt"))).text();
  const { questions: qs } = parseSeedText(txt);
  questions = qs; renderQuestions(); await persistQuestions();
};

load();
