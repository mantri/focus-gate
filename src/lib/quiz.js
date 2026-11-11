// Pure quiz helpers. No chrome APIs.
// Question shape: { id, type: 'math'|'mcq'|'text', question, answer, choices?: string[] }

export function generateMathQuiz(level = 2, rand = Math.random) {
  const pick = (n) => Math.floor(rand() * n);
  let a, b, op, answer, text;
  if (level <= 1) {
    a = 2 + pick(8); b = 2 + pick(8); op = "+";
    answer = String(a + b); text = `${a} + ${b}`;
  } else if (level === 2) {
    op = ["+", "-", "x"][pick(3)];
    if (op === "+") { a = 10 + pick(40); b = 10 + pick(40); answer = String(a + b); text = `${a} + ${b}`; }
    else if (op === "-") { a = 20 + pick(40); b = 5 + pick(20); answer = String(a - b); text = `${a} - ${b}`; }
    else { a = 3 + pick(10); b = 3 + pick(10); answer = String(a * b); text = `${a} x ${b}`; }
  } else {
    op = ["x", "÷", "+", "-"][pick(4)];
    if (op === "x") { a = 6 + pick(14); b = 6 + pick(14); answer = String(a * b); text = `${a} x ${b}`; }
    else if (op === "÷") { b = 2 + pick(10); answer = 2 + pick(12); a = b * Number(answer); answer = String(answer); text = `${a} ÷ ${b}`; }
    else if (op === "+") { a = 50 + pick(100); b = 50 + pick(100); answer = String(a + b); text = `${a} + ${b}`; }
    else { a = 60 + pick(100); b = 10 + pick(60); answer = String(a - b); text = `${a} - ${b}`; }
  }
  return { id: "math-" + Date.now() + "-" + pick(9999), type: "math", question: `What is ${text}?`, answer };
}

export function pickQuestion(bank, lastId = null, rand = Math.random, quizMix = "mixed", mathLevel = 2) {
  const list = Array.isArray(bank) ? bank.filter(Boolean) : [];
  const wantMath = quizMix === "math-only" || (quizMix === "mixed" && list.length > 0 && rand() < 0.5);
  if (wantMath && quizMix !== "bank-only") return generateMathQuiz(mathLevel, rand);
  if (list.length === 0) return generateMathQuiz(mathLevel, rand);
  const pool = list.length > 1 && lastId ? list.filter((q) => q.id !== lastId) : list;
  return pool[Math.floor(rand() * pool.length)];
}

export function checkAnswer(question, userInput) {
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const given = norm(userInput);
  const want = norm(question.answer);
  if (!given) return false;
  // numeric tolerance: "56.0" == "56"
  const gn = Number(given), wn = Number(want);
  if (want !== "" && !Number.isNaN(gn) && !Number.isNaN(wn)) return gn === wn;
  return given === want;
}
