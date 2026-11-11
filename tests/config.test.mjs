import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateConfig, DEFAULTS } from "../src/lib/config.js";

const base = () => ({ ...DEFAULTS, rules: [], questions: [] });

describe("config", () => {
  it("accepts defaults", () => {
    assert.deepEqual(validateConfig(base()), []);
  });

  it("rejects bad timing/quiz values", () => {
    assert.ok(validateConfig({ ...base(), intervalMinutes: 0 }).length > 0);
    assert.ok(validateConfig({ ...base(), quizMix: "nope" }).length > 0);
    assert.ok(validateConfig({ ...base(), mathLevel: 9 }).length > 0);
  });

  it("validates questionsPerBreak as int 1..20", () => {
    assert.deepEqual(validateConfig({ ...base(), questionsPerBreak: 5 }), []);
    for (const bad of [0, 21, 2.5, "x", null]) {
      const errs = validateConfig({ ...base(), questionsPerBreak: bad });
      assert.ok(errs.some((e) => e.includes("questionsPerBreak")), `expected questionsPerBreak error for ${bad}`);
    }
  });

  it("validates appearance fields", () => {
    assert.ok(validateConfig({ ...base(), accentColor: "red" }).length > 0);
    assert.ok(validateConfig({ ...base(), overlayTitle: "x".repeat(81) }).length > 0);
    assert.ok(validateConfig({ ...base(), overlaySubtitle: "x".repeat(141) }).length > 0);
  });
});
