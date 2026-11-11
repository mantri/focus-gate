import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateMathQuiz, checkAnswer, pickQuestion } from "../src/lib/quiz.js";

describe("quiz", () => {
  it("generates solvable math at each level", () => {
    for (const level of [1, 2, 3]) {
      const q = generateMathQuiz(level, () => 0.5);
      assert.match(q.question, /^What is /);
      assert.equal(checkAnswer(q, q.answer), true);
      assert.equal(checkAnswer(q, "definitely-wrong-answer"), false);
    }
  });

  it("compares numerically and case-insensitively", () => {
    assert.equal(checkAnswer({ answer: "56" }, "56.0"), true);
    assert.equal(checkAnswer({ answer: "Paris" }, "  paris "), true);
    assert.equal(checkAnswer({ answer: "Paris" }, ""), false);
  });

  it("picks from bank in bank-only mode", () => {
    const bank = [{ id: "a", type: "text", question: "Q?", answer: "A" }];
    const q = pickQuestion(bank, null, () => 0.99, "bank-only", 2);
    assert.equal(q, bank[0]);
  });

  it("generates math in math-only mode even with a bank", () => {
    const bank = [{ id: "a", type: "text", question: "Q?", answer: "A" }];
    const q = pickQuestion(bank, null, Math.random, "math-only", 2);
    assert.match(q.question, /^What is /);
  });

  it("avoids immediate repeats when possible", () => {
    const bank = [
      { id: "a", type: "text", question: "QA?", answer: "A" },
      { id: "b", type: "text", question: "QB?", answer: "B" },
    ];
    const q = pickQuestion(bank, "a", () => 0.0, "bank-only", 2);
    assert.equal(q.id, "b");
  });
});
