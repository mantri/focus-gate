import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MOTIVATIONS, getMotivation } from "../src/lib/motivation.js";
import { PRAISES, getPraise } from "../src/lib/praise.js";

describe("motivation + praise", () => {
  it("ships non-empty kid-friendly collections", () => {
    assert.ok(MOTIVATIONS.length >= 10);
    assert.ok(PRAISES.length >= 10);
  });

  it("pickers return members of their collections", () => {
    assert.ok(MOTIVATIONS.includes(getMotivation(() => 0.05)));
    assert.ok(PRAISES.includes(getPraise(() => 0.05)));
  });
});
