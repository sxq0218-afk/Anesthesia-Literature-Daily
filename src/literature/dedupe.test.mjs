import test from "node:test";
import assert from "node:assert/strict";
import { deduplicate, titleSimilarity } from "./dedupe.mjs";

test("deduplicates by PMID", () => {
  const result = deduplicate([{ pmid: "1", doi: "", title: "A trial" }], [{ pmid: "1", title: "Different", doi: "" }]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.removed.length, 1);
});

test("deduplicates DOI case-insensitively", () => {
  const result = deduplicate([{ pmid: "2", doi: "10.1000/ABC", title: "A" }], [{ pmid: "1", doi: "https://doi.org/10.1000/abc", title: "B" }]);
  assert.equal(result.accepted.length, 0);
});

test("deduplicates highly similar titles", () => {
  const similarity = titleSimilarity("Regional anesthesia for hip surgery: a randomized trial", "Regional anaesthesia for hip surgery - a randomised trial");
  assert.ok(similarity > 0.8);
  const result = deduplicate([
    { pmid: "2", doi: "", title: "Regional anesthesia for hip surgery: a randomized trial" },
    { pmid: "3", doi: "", title: "Regional anesthesia for hip surgery a randomized trial" },
  ], [], 0.88);
  assert.equal(result.accepted.length, 1);
});
