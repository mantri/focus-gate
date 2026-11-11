import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isEnabledForUrl, ruleMatches } from "../src/lib/rules.js";

describe("rules", () => {
  it("matches bare domains as substring", () => {
    assert.equal(ruleMatches({ pattern: "youtube.com" }, "https://www.youtube.com/watch?v=x"), true);
    assert.equal(ruleMatches({ pattern: "youtube.com" }, "https://www.google.com/"), false);
  });

  it("matches wildcard hostname globs", () => {
    assert.equal(ruleMatches({ pattern: "*.youtube.com" }, "https://www.youtube.com/"), true);
    assert.equal(ruleMatches({ pattern: "*.youtube.com" }, "https://youtube.com/"), false);
  });

  it("matches full-url globs", () => {
    assert.equal(
      ruleMatches({ pattern: "*://*.example.com/*" }, "https://sub.example.com/a"),
      true
    );
    assert.equal(
      ruleMatches({ pattern: "*://*.example.com/*" }, "https://other.com/a"),
      false
    );
  });

  it("disabled rules win over enabled ones", () => {
    const rules = [{ pattern: "youtube.com", enabled: true }, { pattern: "youtube.com", enabled: false }];
    assert.equal(isEnabledForUrl("https://www.youtube.com/", rules, true), false);
  });

  it("returns false when globally disabled or no match", () => {
    assert.equal(isEnabledForUrl("https://www.youtube.com/", [{ pattern: "youtube.com", enabled: true }], false), false);
    assert.equal(isEnabledForUrl("https://www.google.com/", [{ pattern: "youtube.com", enabled: true }], true), false);
    assert.equal(isEnabledForUrl("https://www.youtube.com/", [], true), false);
  });

  it("guard-everything wildcard works", () => {
    assert.equal(isEnabledForUrl("https://anything.example/", [{ pattern: "*", enabled: true }], true), true);
  });
});
