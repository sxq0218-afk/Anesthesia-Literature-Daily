import test from "node:test";
import assert from "node:assert/strict";
import { analyzeArticle } from "./analyze.mjs";

const record = {
  title: "Randomized anesthesia trial",
  journal: "Anesthesiology",
  publicationDate: "2026-07-15",
  doi: "10.1000/test",
  pmid: "12345678",
  publicationTypes: ["Randomized Controlled Trial"],
  abstract: "A randomized trial evaluated postoperative pain. The primary outcome was pain at 24 hours.",
};

const extraction = {
  title: record.title, journal: record.journal, date: record.publicationDate, doi: record.doi, pmid: record.pmid,
  study_type: "Randomized Controlled Trial", population: "Adults", sample_size: null, intervention: "Intervention",
  comparison: "Control", primary_outcome: "Pain at 24 hours", secondary_outcome: [], results: "Reported in abstract",
  effect_size: [], confidence_interval: [], p_value: [], adverse_events: null, limitation: [],
};
const synthesis = {
  chineseTitle: "麻醉随机试验", oneSentenceConclusion: "摘要报告了主要结局。", whyItMatters: "关注术后疼痛。",
  background: "研究术后疼痛。", pico: { population: "成人", intervention: "干预", comparison: "对照", outcome: "24小时疼痛" },
  studyDesign: "随机对照试验", mainResults: "摘要未报告具体效应量。", anesthesiaImplications: ["需阅读全文"], limitations: ["摘要信息有限"],
  aiAssessment: { support: "结论与摘要一致", overinterpretationRisk: "低" }, keyPoints: ["随机试验"],
};
const checks = Object.fromEntries(["title_match","pmid_match","doi_match","sample_size","primary_outcome","effect_direction","confidence_interval","p_value","causality","clinical_vs_statistical","subgroup_interpretation","unsupported_information"].map(key => [key, { pass: true, reason: "ok" }]));

test("runs extraction, synthesis and second-round quality control", async () => {
  const replies = [extraction, synthesis, { overall_pass: true, checks, issues: [] }];
  const generateAI = async () => ({ data: replies.shift(), usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, model: "mock" });
  const result = await analyzeArticle({ record, fullText: null, generateAI });
  assert.equal(result.quality.overall_pass, true);
  assert.equal(result.usage.totalTokens, 45);
  assert.equal(replies.length, 0);
});
