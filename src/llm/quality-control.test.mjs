import assert from "node:assert/strict";
import test from "node:test";
import { deepDiveChecks, deterministicChecks, translationChecks } from "./quality-control.mjs";

test("deterministic validation treats PubMed journal and date as fixed metadata", () => {
  const record = {
    title: "Study",
    journal: "Nature Neuroscience",
    publicationDate: "2026-07",
    pmid: "42237031",
    doi: "10.1000/test",
    abstract: "No numeric results.",
  };
  const valid = deterministicChecks(record, {
    title: record.title,
    journal: record.journal,
    date: record.publicationDate,
    pmid: record.pmid,
    doi: record.doi,
  });
  assert.equal(valid.pass, true);

  const invalid = deterministicChecks(record, {
    title: record.title,
    journal: "Different Journal",
    date: "2025-01",
    pmid: record.pmid,
    doi: record.doi,
  });
  assert.match(invalid.issues.join(" "), /期刊与PubMed期刊不一致/);
  assert.match(invalid.issues.join(" "), /日期与PubMed日期不一致/);
});

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
