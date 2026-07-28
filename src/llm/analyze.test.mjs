import assert from "node:assert/strict";
import test from "node:test";
import { analyzeArticle, prepareAnalysisSource } from "./analyze.mjs";

const record = {
  title: "Test anesthesia study",
  journal: "Anesthesiology",
  publicationDate: "2026-07-22",
  doi: "10.1000/test",
  pmid: "12345678",
  publicationTypes: ["Journal Article"],
  abstract: "This abstract reports no sample size.",
};

const baseExtraction = {
  title: record.title,
  journal: record.journal,
  date: record.publicationDate,
  doi: record.doi,
  pmid: record.pmid,
  study_type: "Journal Article",
  population: null,
  sample_size: null,
  intervention: null,
  comparison: null,
  primary_outcome: null,
  secondary_outcome: [],
  results: null,
  effect_size: [],
  confidence_interval: [],
  p_value: [],
  adverse_events: null,
  limitation: [],
};

const synthesis = {
  chineseTitle: "测试麻醉研究",
  oneSentenceConclusion: "当前可获取内容未提供该数据。",
  whyItMatters: "用于验证流程。",
  background: "当前可获取内容未提供该数据。",
  pico: { population: "当前可获取内容未提供该数据。", intervention: "当前可获取内容未提供该数据。", comparison: "当前可获取内容未提供该数据。", outcome: "当前可获取内容未提供该数据。" },
  studyDesign: "Journal Article",
  mainResults: "当前可获取内容未提供该数据。",
  anesthesiaImplications: [],
  limitations: [],
  aiAssessment: { support: "信息有限", overinterpretationRisk: "需避免推断" },
  keyPoints: [],
  deepDive: {
    sourceCoverage: { level: "abstract", limitations: ["仅有摘要"] },
    methodology: {
      researchQuestion: "当前可获取内容未提供该数据。", designFit: "无法评价", eligibility: "未报告",
      randomization: "不适用或未报告", allocationConcealment: "不适用或未报告", blinding: "不适用或未报告",
      sampleSizePlanning: "未报告", followUp: "未报告", analysisPopulation: "未报告", missingData: "未报告",
      strengths: ["当前可获取内容不足以确认方法学优势。"], concerns: ["信息有限"],
    },
    statistics: {
      methods: [{ referenceId: null, name: "未报告", purposeInStudy: "未报告", reportedResult: "未报告", interpretation: "无法评价", cautions: ["当前可获取内容未提供统计方法。"] }],
      adjustedVariables: "未报告", multiplicity: "未报告", subgroupAnalysis: "未报告", clinicalVsStatisticalSignificance: "无法评价",
    },
    outcomeAnalysis: { primary: "未报告", secondary: ["当前可获取内容未提供次要结局。"], safety: "未报告", absoluteVsRelative: "无法评价", subgroupAndInteraction: "未报告", sensitivity: "未报告" },
    criticalAppraisal: { strengths: ["当前可获取内容不足以确认研究优势。"], limitations: ["信息有限"], biasRisks: ["无法评价"], certainty: "信息有限", conclusionAlignment: "无法评价", causalBoundary: "不得作因果推断" },
    clinicalTranslation: {
      applicability: ["当前材料不足以确定适用人群。"], nonApplicability: ["当前材料不足以确定不适用人群。"],
      practiceChange: "不足以改变实践", canDoNow: ["继续关注后续完整报告。"], cannotConclude: ["不能得出临床结论"],
      evidenceGaps: ["需要完整研究报告"], directClinicalRecommendation: false,
    },
  },
};

const translation = {
  sections: [{ heading: null, text: "该摘要未报告样本量。" }],
  fullText: "该摘要未报告样本量。",
  translatorNote: "AI辅助翻译，请以英文原摘要为准。",
};

test("runs extraction, synthesis and second-round quality control", async () => {
  const replies = [baseExtraction, translation, synthesis, { overall_pass: true, checks: {}, issues: [] }];
  const generateAI = async () => ({
    data: replies.shift(),
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    model: "mock",
  });
  const result = await analyzeArticle({ record, fullText: null, generateAI });
  assert.equal(result.quality.overall_pass, true);
  assert.equal(result.extractionRetried, false);
  assert.equal(result.usage.totalTokens, 60);
  assert.equal(result.abstractTranslation.fullText, translation.fullText);
  assert.equal(replies.length, 0);
});

test("locks source coverage to the material actually supplied instead of trusting the model label", async () => {
  const mislabeledSynthesis = structuredClone(synthesis);
  mislabeledSynthesis.deepDive.sourceCoverage.level = "abstract";
  const replies = [baseExtraction, translation, mislabeledSynthesis, { overall_pass: true, checks: {}, issues: [] }];
  const generateAI = async () => ({
    data: replies.shift(),
    usage: {},
    model: "mock",
  });

  const result = await analyzeArticle({
    record,
    fullText: [
      "METHODS\nRandomized allocation and blinded outcome assessment.\n" + "A".repeat(25000),
      "RESULTS\nThe primary outcome was reported.\n" + "B".repeat(25000),
      "LIMITATIONS\nSingle-center design.\n" + "C".repeat(25000),
    ].join("\n"),
    generateAI,
  });

  assert.equal(result.basis, "摘要+开放全文重点章节节选分析");
  assert.equal(result.synthesis.deepDive.sourceCoverage.level, "full_text_excerpt");
  assert.equal(result.regenerated, false);
  assert.equal(replies.length, 0);
});

test("routes extraction findings from quality control back to structured extraction", async () => {
  const numericRecord = {
    ...record,
    abstract: "The study included 10 patients in one group and 20 in another group.",
  };
  const correctedExtraction = { ...baseExtraction, sample_size: "10 and 20" };
  const numericTranslation = {
    ...translation,
    sections: [{ heading: null, text: "该研究一组纳入10名患者，另一组纳入20名患者。" }],
    fullText: "该研究一组纳入10名患者，另一组纳入20名患者。",
  };
  const firstQuality = {
    overall_pass: false,
    checks: { sample_size: { pass: false, reason: "结构化抽取中sample_size为null，但摘要报告了分组样本数" } },
    issues: [],
  };
  const replies = [
    baseExtraction,
    numericTranslation,
    synthesis,
    firstQuality,
    correctedExtraction,
    synthesis,
    { overall_pass: true, checks: {}, issues: [] },
  ];
  const calls = [];
  const result = await analyzeArticle({
    record: numericRecord,
    fullText: null,
    generateAI: async request => {
      calls.push(request);
      return { data: replies.shift(), usage: {}, model: "mock" };
    },
  });

  assert.equal(result.extracted.sample_size, "10 and 20");
  assert.ok(calls.some(call => call.task === "literature-extraction-quality-regeneration"));
  assert.equal(result.regenerated, true);
  assert.equal(replies.length, 0);
});

test("removes unsupported novelty language before quality control", async () => {
  const noveltySynthesis = structuredClone(synthesis);
  noveltySynthesis.oneSentenceConclusion = "该研究首次定量比较两种策略。";
  const replies = [baseExtraction, translation, noveltySynthesis, { overall_pass: true, checks: {}, issues: [] }];
  const result = await analyzeArticle({
    record,
    fullText: null,
    generateAI: async () => ({ data: replies.shift(), usage: {}, model: "mock" }),
  });

  assert.equal(result.synthesis.oneSentenceConclusion, "该研究定量比较两种策略。");
  assert.equal(replies.length, 0);
});

test("retries structured extraction once after deterministic validation failure", async () => {
  const calls = [];
  const responses = [
    { data: { ...baseExtraction, sample_size: "79" }, usage: {} },
    { data: { ...baseExtraction, sample_size: "79" }, usage: {} },
    { data: translation, usage: {}, model: "test-model" },
    { data: synthesis, usage: {}, model: "test-model" },
    { data: { overall_pass: true, checks: {}, issues: [] }, usage: {} },
  ];
  const result = await analyzeArticle({
    record,
    fullText: null,
    generateAI: async request => {
      calls.push(request);
      return responses.shift();
    },
  });

  assert.equal(calls.length, 5);
  assert.equal(calls[1].task, "literature-extraction-regeneration");
  assert.match(calls[1].user, /原文材料中未找到数字：79/);
  assert.equal(result.extractionRetried, true);
  assert.equal(result.extractionSanitized, true);
  assert.equal(result.regenerated, true);
  assert.equal(result.extracted.sample_size, null);
});

test("keeps the abstract and safely excerpts an oversized open full text", () => {
  const source = prepareAnalysisSource(record, "A".repeat(90000), 60000);
  assert.equal(source.basis, "摘要+开放全文节选分析");
  assert.equal(source.truncated, true);
  assert.match(source.analysisText, new RegExp(record.abstract));
  assert.match(source.analysisText, /分析未覆盖全文全部内容/);
  assert.ok(source.analysisText.length <= 30000);
});

test("prioritizes methods, results and limitations when open full text is oversized", () => {
  const fullText = [
    "INTRODUCTION\n" + "A".repeat(25000),
    "METHODS\nRandomized allocation and blinded outcome assessment.\n" + "B".repeat(25000),
    "RESULTS\nThe primary outcome was reported.\n" + "C".repeat(25000),
    "LIMITATIONS\nSingle-center design limited generalizability.\n" + "D".repeat(25000),
  ].join("\n");
  const source = prepareAnalysisSource(record, fullText, 60000);
  assert.equal(source.basis, "摘要+开放全文重点章节节选分析");
  assert.match(source.analysisText, /Randomized allocation/);
  assert.match(source.analysisText, /The primary outcome/);
  assert.match(source.analysisText, /Single-center design/);
  assert.ok(source.analysisText.length <= 30000);
});
