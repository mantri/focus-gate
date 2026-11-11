/* Focus Gate content script - classic script (no imports).
   Canonical logic lives in src/lib/*; this mirrors it to run without bundling. */
(() => {
  if (window.__fgActive) return;
  window.__fgActive = true;

  const MOTIVATIONS = [
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

  const PENDING_TTL_MS = 30 * 60 * 1000; // a prompt must be solved even if page reloads within 30 min
  const PRAISES = [
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
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

  function ruleMatches(pattern, url) {
    pattern = (pattern || "").trim().toLowerCase();
    if (!pattern) return false;
    const u = url.toLowerCase();
    let host = u;
    try { host = new URL(url).hostname.toLowerCase(); } catch {}
    if (pattern.includes("://")) {
      const rx = new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
      try { return rx.test(u); } catch { return false; }
    }
    if (pattern.includes("*")) {
      const rx = new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
      try { return rx.test(host) || rx.test(u); } catch { return false; }
    }
    return host.includes(pattern);
  }
  function isEnabled(url, rules, globalEnabled) {
    if (!globalEnabled) return false;
    let hit = false;
    for (const r of rules || []) {
      if (!ruleMatches(r.pattern, url)) continue;
      if (r.enabled === false) return false;
      hit = true;
    }
    return hit;
  }
  function genMath(level, rand = Math.random) {
    const pick = (n) => Math.floor(rand() * n);
    let a, b, t, ans;
    if (level <= 1) { a = 2 + pick(8); b = 2 + pick(8); t = `${a} + ${b}`; ans = String(a + b); }
    else if (level === 2) {
      const op = ["+", "-", "x"][pick(3)];
      if (op === "+") { a = 10 + pick(40); b = 10 + pick(40); t = `${a} + ${b}`; ans = String(a + b); }
      else if (op === "-") { a = 20 + pick(40); b = 5 + pick(20); t = `${a} - ${b}`; ans = String(a - b); }
      else { a = 3 + pick(10); b = 3 + pick(10); t = `${a} x ${b}`; ans = String(a * b); }
    } else {
      const op = ["x", "÷", "+", "-"][pick(4)];
      if (op === "x") { a = 6 + pick(14); b = 6 + pick(14); t = `${a} x ${b}`; ans = String(a * b); }
      else if (op === "÷") { b = 2 + pick(10); ans = String(2 + pick(12)); a = b * Number(ans); t = `${a} ÷ ${b}`; }
      else if (op === "+") { a = 50 + pick(100); b = 50 + pick(100); t = `${a} + ${b}`; ans = String(a + b); }
      else { a = 60 + pick(100); b = 10 + pick(60); t = `${a} - ${b}`; ans = String(a - b); }
    }
    return { id: "math-live", type: "math", question: `What is ${t}?`, answer: ans };
  }
  function checkAnswer(q, given) {
    const g = norm(given), w = norm(q.answer);
    if (!g) return false;
    const gn = Number(g), wn = Number(w);
    if (w !== "" && !Number.isNaN(gn) && !Number.isNaN(wn)) return gn === wn;
    return g === w;
  }
  function shuffle(arr, rand = Math.random) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  let timerId = null, currentUrl = location.href, prompting = false, solved = false, dismissCurrent = null;

  async function getState() {
    const sync = await chrome.storage.sync.get(null);
    const local = await chrome.storage.local.get(null);
    return {
      globalEnabled: sync.globalEnabled ?? true,
      rules: sync.rules ?? [],
      intervalMinutes: Number(sync.intervalMinutes ?? 15),
      quizMix: sync.quizMix ?? "mixed",
      mathLevel: Number(sync.mathLevel ?? 2),
      questions: sync.questions ?? [],
      overlayTitle: sync.overlayTitle ?? "Take a brain break",
      overlaySubtitle: sync.overlaySubtitle ?? "Answer the following to continue",
      accentColor: sync.accentColor ?? "#4a5a9e",
      questionsPerBreak: Math.min(20, Math.max(1, Number(sync.questionsPerBreak ?? 5) || 5)),
      mascotImage: local.mascotImage || null,
      unlockedUntil: local.unlockedUntil ?? 0,
      nextPromptAt: local.nextPromptAt ?? 0,
      pendingQuiz: local.pendingQuiz ?? null,
    };
  }

  function pauseMedia() {
    document.querySelectorAll("video, audio").forEach((m) => { try { m.pause(); } catch {} });
  }

  function pickQuiz(state) {
    const bank = state.questions || [];
    if (state.quizMix === "math-only" || (state.quizMix === "mixed" && bank.length && Math.random() < 0.5)) {
      return genMath(state.mathLevel);
    }
    if (state.quizMix !== "bank-only" && bank.length === 0) return genMath(state.mathLevel);
    if (!bank.length) return genMath(state.mathLevel);
    return bank[Math.floor(Math.random() * bank.length)];
  }

  async function showOverlay(state, onSolved) {
    const total = Math.min(20, Math.max(1, Number(state.questionsPerBreak) || 5));
    let done = 0;
    try {
      const p = state.pendingQuiz;
      if (p && typeof p.done === "number" && (Date.now() - p.startedAt < PENDING_TTL_MS)) {
        done = Math.min(Math.max(0, p.done), total - 1);
      }
    } catch {}
    let quiz = pickQuiz(state);
    let lastId = quiz.id || null;
    prompting = true; solved = false;
    // Persist pending prompt so refresh cannot dismiss it (includes streak progress)
    try {
      await chrome.storage.local.set({ pendingQuiz: { startedAt: Date.now(), url: location.href, done, total } });
    } catch {}
    document.getElementById("fg-overlay")?.remove();
    document.body.classList.add("fg-locked");
    pauseMedia();
    const ov = document.createElement("div");
    ov.id = "fg-overlay";
    ov.style.setProperty("--fg-accent", state.accentColor || "#4a5a9e");
    const motive = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    const mascotSrc = state.mascotImage || chrome.runtime.getURL("assets/mascot-default.png");
    ov.innerHTML = `<div class="fg-card">
      <img class="fg-mascot" alt="mascot" />
      <h2></h2>
      <p class="fg-sub"></p>
      <p class="fg-motive"></p>
      <div class="fg-progress" id="fg-progress"></div>
      <div class="fg-q"></div>
      <div id="fg-answer"></div>
      <div class="fg-err" id="fg-err"></div>
      <div class="fg-small">Parents: <button id="fg-unlock">unlock with password</button></div>
    </div>`;
    ov.querySelector("img").src = mascotSrc;
    ov.querySelector("h2").textContent = "⏸ " + (state.overlayTitle || "Take a brain break");
    ov.querySelector(".fg-sub").textContent = state.overlaySubtitle || "";
    ov.querySelector(".fg-motive").textContent = motive;
    document.documentElement.appendChild(ov);

    const err = ov.querySelector("#fg-err");
    const progressEl = ov.querySelector("#fg-progress");
    const answerEl = ov.querySelector("#fg-answer");
    let celebrating = false;
    function renderStep() {
      // Avoid immediate repeats from bank
      let next = pickQuiz(state);
      let guard = 0;
      while (lastId && next.id === lastId && guard++ < 5) next = pickQuiz(state);
      quiz = next; lastId = next.id || null;
      celebrating = false;
      progressEl.textContent = total > 1 ? `Question ${done + 1} of ${total}` : "";
      ov.querySelector(".fg-q").textContent = quiz.question;
      err.textContent = "";
      ov.querySelector(".fg-card").classList.remove("fg-success");
      ov.querySelectorAll(".fg-praise, .fg-stars, .fg-confetti").forEach((el) => el.remove());
      const isMcq = quiz.type === "mcq" && Array.isArray(quiz.choices) && quiz.choices.length >= 2;
      if (isMcq) {
        const choices = shuffle(quiz.choices);
        answerEl.innerHTML = `<div class="fg-choices">${choices.map((c) => `<button data-a="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
        answerEl.querySelectorAll("button").forEach((b) =>
          b.addEventListener("click", () => solve(b.dataset.a)));
      } else {
        answerEl.innerHTML = `<div class="fg-row"><input id="fg-input" placeholder="Your answer" autocomplete="off"/><button id="fg-go">Go</button></div>`;
        answerEl.querySelector("#fg-go").addEventListener("click", () =>
          solve(answerEl.querySelector("#fg-input").value));
        answerEl.querySelector("#fg-input").addEventListener("keydown", (e) => {
          if (e.key === "Enter") solve(e.target.value);
        });
        answerEl.querySelector("#fg-input")?.focus();
      }
    }
    const solve = (val) => {
      if (celebrating || solved) return;
      if (checkAnswer(quiz, val)) { celebrating = true; celebrate(); }
      else err.textContent = "Not quite — try again.";
    };
    async function celebrate() {
      const isFinal = done + 1 >= total;
      const praise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
      const card = ov.querySelector(".fg-card");
      card.classList.add("fg-success");
      answerEl.querySelectorAll("button, input").forEach((el) => { try { el.disabled = true; } catch {} });
      err.textContent = "";
      const stars = document.createElement("div");
      stars.className = "fg-stars";
      stars.textContent = isFinal ? "🏆🎉⭐🧠🚀🎊" : "⭐";
      const msg = document.createElement("div");
      msg.className = "fg-praise";
      msg.textContent = isFinal ? praise : `${praise} (${done + 1}/${total})`;
      card.appendChild(stars);
      card.appendChild(msg);
      launchConfetti(ov);
      done += 1;
      try {
        await chrome.storage.local.set({ pendingQuiz: { startedAt: Date.now(), url: location.href, done: Math.min(done, total - 1), total } });
      } catch {}
      setTimeout(async () => {
        if (isFinal) { await finishWrapped(true); onSolved(); }
        else renderStep();
      }, isFinal ? 2200 : 1200);
    }
    function launchConfetti(root) {
      const box = document.createElement("div");
      box.className = "fg-confetti";
      const colors = ["#ff5d5d", "#ffd93d", "#6bcb77", "#4d96ff", "#c780fa", "#ff9f45"];
      for (let i = 0; i < 42; i++) {
        const s = document.createElement("span");
        s.style.left = Math.random() * 100 + "%";
        s.style.background = colors[i % colors.length];
        s.style.animationDelay = (Math.random() * 0.4).toFixed(2) + "s";
        s.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
        box.appendChild(s);
      }
      root.appendChild(box);
    }
    async function finish(ok) {
      solved = ok; prompting = false;
      ov.remove();
      document.body.classList.remove("fg-locked");
      try {
        if (ok) await chrome.storage.local.remove(["pendingQuiz"]);
      } catch {}
    }
    renderStep();
    // Keep media paused behind overlay
    const p = setInterval(() => { if (!document.getElementById("fg-overlay")) clearInterval(p); else pauseMedia(); }, 2000);
    // If kid deletes overlay via devtools/refresh tricks, re-show (same quiz)
    const obs = new MutationObserver(() => {
      if (!solved && !document.getElementById("fg-overlay")) {
        try { document.documentElement.appendChild(ov); document.body.classList.add("fg-locked"); } catch {}
      }
    });
    try { obs.observe(document.documentElement, { childList: true }); } catch {}
    async function finishWrapped(ok) {
      try { obs.disconnect(); } catch {}
      clearInterval(p);
      dismissCurrent = null;
      await finish(ok);
    }
    dismissCurrent = finishWrapped;
    ov.querySelector("#fg-unlock").addEventListener("click", async () => {
      const pw = prompt("Parent password to snooze 15 min:");
      if (!pw) return;
      const sync = await chrome.storage.sync.get(["pwdHash", "pwdSalt", "pbkdfIterations"]);
      if (!sync.pwdHash) { alert("No password set yet. See extension Options."); return; }
      const ok = await verifyPw(pw, sync);
      if (ok) {
        await chrome.storage.local.set({ unlockedUntil: Date.now() + 15 * 60 * 1000 });
        await finishWrapped(true);
        schedule();
      } else alert("Wrong password.");
    });
  }

  async function b64d(b) { const s = atob(b); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
  async function verifyPw(pw, sync) {
    const it = sync.pbkdfIterations || 100000;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: await b64d(sync.pwdSalt), iterations: it, hash: "SHA-256" }, key, 256);
    const arr = new Uint8Array(bits);
    let s = ""; arr.forEach((x) => (s += String.fromCharCode(x)));
    return btoa(s) === sync.pwdHash;
  }

  async function triggerPrompt(state) {
    if (prompting) return;
    pauseMedia();
    showOverlay(state, async () => {
      const ms = Math.max(0.1, state.intervalMinutes) * 60 * 1000;
      const next = Date.now() + ms;
      await chrome.storage.local.set({ lastPromptAt: Date.now(), nextPromptAt: next });
      chrome.runtime.sendMessage({ type: "FG_SOLVED" }).catch(() => {});
      schedule();
    });
  }

  async function maybePrompt() {
    const st = await getState();
    if (Date.now() < st.unlockedUntil) { schedule(); return; }
    if (!isEnabled(location.href, st.rules, st.globalEnabled)) return;
    triggerPrompt(st);
  }

  async function schedule() {
    clearTimeout(timerId);
    const st = await getState();
    if (Date.now() < st.unlockedUntil) {
      timerId = setTimeout(schedule, Math.max(1000, st.unlockedUntil - Date.now() + 500));
      return;
    }
    if (!isEnabled(location.href, st.rules, st.globalEnabled)) {
      // re-check on navigation; poll lightly
      timerId = setTimeout(schedule, 5000);
      return;
    }
    const ms = Math.max(0.1, st.intervalMinutes) * 60 * 1000;
    let next = st.nextPromptAt;
    if (!next) {
      next = Date.now() + ms;
      try { await chrome.storage.local.set({ nextPromptAt: next }); } catch {}
    }
    const pendingFresh = st.pendingQuiz && (Date.now() - st.pendingQuiz.startedAt < PENDING_TTL_MS);
    const due = Date.now() >= next;
    if (pendingFresh || due) {
      // Prompt almost immediately so refresh cannot grant watch time
      pauseMedia();
      timerId = setTimeout(maybePrompt, 800);
      return;
    }
    timerId = setTimeout(maybePrompt, Math.max(1000, next - Date.now()));
  }

  setInterval(() => {
    if (location.href !== currentUrl) { currentUrl = location.href; schedule(); }
  }, 1000);

  // Cross-tab sync: one shared timer + lock state. Solving/snoozing in one
  // tab unlocks all tabs; a fresh pending prompt pulls all guarded tabs in.
  try {
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== "local" && area !== "sync") return;
      if (changes.unlockedUntil && changes.unlockedUntil.newValue > Date.now()) {
        if (prompting && dismissCurrent) { solved = true; try { await dismissCurrent(true); } catch {} }
        schedule();
        return;
      }
      if (changes.pendingQuiz) {
        if (!changes.pendingQuiz.newValue && prompting && dismissCurrent) {
          // Solved or unlocked in another tab: dismiss here, no re-solve needed
          solved = true;
          try { await dismissCurrent(true); } catch {}
          schedule();
          return;
        }
        if (changes.pendingQuiz.newValue && !prompting) {
          schedule();
          return;
        }
      }
      if (changes.nextPromptAt || changes.intervalMinutes || changes.globalEnabled || changes.rules || changes.questionsPerBreak) {
        schedule();
      }
    });
  } catch {}

  schedule();
})();
