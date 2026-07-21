import { buildExtractionPrompt, buildQualityPrompt, buildSynthesisPrompt, extractionSystemPrompt, qualitySystemPrompt, synthesisSystemPrompt } from "./prompts.mjs";
import { deterministicChecks, qualityIssues, sanitizeUnsupportedNumericClaims } from "./quality-control.mjs";

function addUsage(total, usage) {
  if (!usage) return total;
  return {
    promptTokens: total.promptTokens + Number(usage.prompt_tokens || 0),
    completionTokens: total.completionTokens + Number(usage.completion_tokens || 0),
    totalTokens: total.totalTokens + Number(usage.total_tokens || 0),
  };
}

export async function analyzeArticle({ record, fullText, generateAI }) {
  const basis = fullText ? "摘要+开放全文分析" : "摘要分析";
  const analysisText = fullText ? `摘要：${record.abstract}\n\n开放全文：${fullText}` : record.abstract;
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  let extractionResponse = await generateAI({
    system: extractionSystemPrompt,
    user: buildExtractionPrompt(record, analysisText, basis),
    maxTokens: 4500,
    task: "literature-extraction",
  });
  usage = addUsage(usage, extractionResponse.usage);
  let deterministic = deterministicChecks(record, extractionResponse.data, analysisText);
  let extractionRetried = false;
  let extractionSanitized = false;
  if (!deterministic.pass) {
    extractionRetried = true;
    extractionResponse = await generateAI({
      system: extractionSystemPrompt,
      user: buildExtractionPrompt(record, analysisText, basis, deterministic.issues),
      maxTokens: 4500,
      task: "literature-extraction-regeneration",
    });
    usage = addUsage(usage, extractionResponse.usage);
    deterministic = deterministicChecks(record, extractionResponse.data, analysisText);
  }
  if (!deterministic.pass && deterministic.issues.every(issue => issue.startsWith("原文材料中未找到数字："))) {
    extractionResponse.data = sanitizeUnsupportedNumericClaims(record, extractionResponse.data, analysisText);
    extractionSanitized = true;
    deterministic = deterministicChecks(record, extractionResponse.data, analysisText);
  }
  if (!deterministic.pass) throw new Error(`Structured extraction failed deterministic checks: ${deterministic.issues.join("; ")}`);

  let synthesisResponse = await generateAI({
    system: synthesisSystemPrompt,
    user: buildSynthesisPrompt(record, extractionResponse.data, basis),
    maxTokens: 5000,
    task: "literature-synthesis",
  });
  usage = addUsage(usage, synthesisResponse.usage);

  let qualityResponse = await generateAI({
    system: qualitySystemPrompt,
    user: buildQualityPrompt(record, extractionResponse.data, synthesisResponse.data, analysisText, basis),
    maxTokens: 3500,
    task: "quality-control",
  });
  usage = addUsage(usage, qualityResponse.usage);
  let issues = qualityIssues(qualityResponse.data);
  let regenerated = extractionRetried;

  if (!qualityResponse.data.overall_pass || issues.length) {
    regenerated = true;
    synthesisResponse = await generateAI({
      system: synthesisSystemPrompt,
      user: buildSynthesisPrompt(record, extractionResponse.data, basis, issues),
      maxTokens: 5000,
      task: "literature-regeneration",
    });
    usage = addUsage(usage, synthesisResponse.usage);
    qualityResponse = await generateAI({
      system: qualitySystemPrompt,
      user: buildQualityPrompt(record, extractionResponse.data, synthesisResponse.data, analysisText, basis),
      maxTokens: 3500,
      task: "quality-control",
    });
    usage = addUsage(usage, qualityResponse.usage);
    issues = qualityIssues(qualityResponse.data);
  }

  if (!qualityResponse.data.overall_pass || issues.length) {
    throw new Error(`AI quality control failed after regeneration: ${issues.join("; ")}`);
  }

  return {
    basis,
    extracted: extractionResponse.data,
    synthesis: synthesisResponse.data,
    quality: qualityResponse.data,
    extractionRetried,
    extractionSanitized,
    regenerated,
    usage,
    model: synthesisResponse.model,
  };
}
