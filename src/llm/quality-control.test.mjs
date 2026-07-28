import assert from "node:assert/strict";
import test from "node:test";
import { deepDiveChecks, translationChecks } from "./quality-control.mjs";

test("translation validation rejects omitted abstract numbers", () => {
  const record = { abstract: "A total of 120 patients had a risk ratio of 0.72 (95% CI 0.60 to 0.86)." };
  const result = translationChecks(record, {
    sections: [{ heading: null, text: "研究报告了风险下降。" }],
    fullText: "研究报告了风险下降。",
    translatorNote: "AI辅助翻译，请以英文原摘要为准。",
  });
  assert.equal(result.pass, false);
  assert.match(result.issues.join(" "), /120/);
  assert.match(result.issues.join(" "), /0.72/);
});

test("basic research cannot produce a direct clinical recommendation", () => {
  const result = deepDiveChecks({ researchCategory: { id: "basic" } }, {
    deepDive: {
      sourceCoverage: {},
      methodology: {},
      statistics: {},
      outcomeAnalysis: {},
      criticalAppraisal: {},
      clinicalTranslation: { directClinicalRecommendation: true, cannotConclude: [] },
    },
  });
  assert.equal(result.pass, false);
  assert.match(result.issues.join(" "), /不得给出直接临床建议/);
});

