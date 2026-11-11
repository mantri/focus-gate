import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSeedText, serializeQuestions } from "../src/lib/seed-parser.js";

describe("seed-parser", () => {
  it("parses the bundled seed file shape", () => {
    const { questions, errors } = parseSeedText("math | 7 x 8 | 56 |\ntext | Capital? | Paris |\n");
    assert.equal(errors.length, 0);
    assert.equal(questions.length, 2);
    assert.equal(questions[0].type, "math");
  });

  it("ignores comments and blanks", () => {
    const { questions, errors } = parseSeedText("# hi\n\ntext | Q? | A |\n");
    assert.equal(errors.length, 0);
    assert.equal(questions.length, 1);
  });

  it("reports bad lines and unknown types", () => {
    assert.equal(parseSeedText("oops|only-two").errors.length, 1);
    assert.equal(parseSeedText("zzz | Q? | A |").errors.length, 1);
    assert.equal(parseSeedText("mcq | Q? | A | OnlyOne").errors.length, 1);
  });

  it("parses mcq choices on comma or pipe", () => {
    const { questions } = parseSeedText("mcq | Red planet? | Mars | Mars,Jupiter,Venus\nmcq | Water? | Water | Water | Juice\n");
    assert.deepEqual(questions[0].choices, ["Mars", "Jupiter", "Venus"]);
    assert.deepEqual(questions[1].choices, ["Water", "Juice"]);
  });

  it("serializes back to importable text", () => {
    const qs = [{ id: "x", type: "mcq", question: "Q?", answer: "A", choices: ["A", "B"] }];
    const { questions, errors } = parseSeedText(serializeQuestions(qs));
    assert.equal(errors.length, 0);
    assert.equal(questions.length, 1);
    assert.equal(questions[0].answer, "A");
  });
});
