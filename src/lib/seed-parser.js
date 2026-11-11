// Seed text parser. Pure, no chrome APIs.
// Line format: type | question | answer | choices
// type: math | mcq | text (default text). choices: comma or | separated (mcq only).
export function parseSeedText(text) {
  const questions = [];
  const errors = [];
  const lines = String(text ?? "").split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length < 3) {
      errors.push({ line: lineNo, message: "expected: type | question | answer | choices(optional)" });
      return;
    }
    let [type, question, answer, ...rest] = parts;
    const choicesRaw = rest.join("|").trim();
    type = (type || "text").toLowerCase();
    if (!["math", "mcq", "text"].includes(type)) {
      errors.push({ line: lineNo, message: `unknown type '${type}'` });
      return;
    }
    if (!question || !answer) {
      errors.push({ line: lineNo, message: "question and answer are required" });
      return;
    }
    let choices = [];
    if (choicesRaw) {
      choices = choicesRaw.split(/[|,]/).map((s) => s.trim()).filter(Boolean);
    }
    if (type === "mcq" && choices.length < 2) {
      errors.push({ line: lineNo, message: "mcq needs at least 2 choices" });
      return;
    }
    questions.push({
      id: `seed-${lineNo}-${hashStr(question).toString(36)}`,
      type, question, answer,
      ...(choices.length ? { choices } : {}),
    });
  });
  return { questions, errors };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}

export function serializeQuestions(questions) {
  const head = "# type | question | answer | choices\n";
  return head + (questions || []).map((q) =>
    `${q.type || "text"} | ${q.question} | ${q.answer} | ${(q.choices || []).join(",")}`
  ).join("\n") + "\n";
}
