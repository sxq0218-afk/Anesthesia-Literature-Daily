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
};

test("runs extraction, synthesis and second-round quality control", async () => {
  const replies = [baseExtraction, synthesis, { overall_pass: true, checks: {}, issues: [] }];
  const generateAI = async () => ({
    data: replies.shift(),
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    model: "mock",
  });
  const result = await analyzeArticle({ record, fullText: null, generateAI });
  assert.equal(result.quality.overall_pass, true);
  assert.equal(result.extractionRetried, false);
  assert.equal(result.usage.totalTokens, 45);
  assert.equal(replies.length, 0);
});

test("retries structured extraction once after deterministic validation failure", async () => {
  const calls = [];
  const responses = [
    { data: { ...baseExtraction, sample_size: "79" }, usage: {} },
    { data: { ...baseExtraction, sample_size: "79" }, usage: {} },
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

  assert.equal(calls.length, 4);
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
