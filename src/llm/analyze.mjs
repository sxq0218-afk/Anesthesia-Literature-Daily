import {
  buildExtractionPrompt,
  buildQualityPrompt,
  buildSynthesisPrompt,
  buildTranslationPrompt,
  extractionSystemPrompt,
  qualitySystemPrompt,
  synthesisSystemPrompt,
  translationSystemPrompt,
} from "./prompts.mjs";
import { deepDiveChecks, deterministicChecks, qualityIssues, sanitizeUnsupportedNumericClaims, translationChecks } from "./quality-control.mjs";
import { statisticalMethodReferences } from "../literature/statistics.mjs";

function addUsage(total, usage) {
  if (!usage) return total;
  return {
    calls: Number(total.calls || 0) + 1,
    promptTokens: total.promptTokens + Number(usage.prompt_tokens || 0),
    completionTokens: total.completionTokens + Number(usage.completion_tokens || 0),
    totalTokens: total.totalTokens + Number(usage.total_tokens || 0),
  };
}

function sectionAwareExcerpt(fullText, budget) {
  const headings = ["methods", "methodology", "statistical analysis", "results", "discussion", "limitations", "conclusions"];
  const normalized = String(fullText);
  const positions = [];
  for (const heading of headings) {
    const pattern = new RegExp(`(?:^|\\n)\\s*${heading.replaceAll(" ", "\\\\s+")}\\s*(?:\\n|:)`, "i");
    const match = pattern.exec(normalized);
    if (match && !positions.some(position => Math.abs(position - match.index) < 500)) positions.push(match.index);
  }
  if (positions.length < 2) return null;
  positions.sort((a, b) => a - b);
  const chunkBudget = Math.max(1200, Math.floor((budget - 600) / positions.length));
  const chunks = positions.map((position, index) => {
    const end = Math.min(normalized.length, position + chunkBudget);
    return `[全文重点章节节选 ${index + 1}/${positions.length}]\n${normalized.slice(position, end).trim()}`;
  });
  return chunks.join("\n\n");
}

export function prepareAnalysisSource(record, fullText, maxInputChars = 60000) {
  const abstract = String(record.abstract || "").trim();
  if (!fullText) return { basis: "摘要分析", analysisText: abstract, truncated: false };

  const prefix = `摘要：${abstract}\n\n开放全文：`;
  const sourceBudget = Math.max(8000, Math.min(30000, Number(maxInputChars || 60000) - 24000));
  const availableForFullText = Math.max(1000, sourceBudget - prefix.length);
  const normalizedFullText = String(fullText).trim();
  if (normalizedFullText.length <= availableForFullText) {
    return { basis: "摘要+开放全文分析", analysisText: `${prefix}${normalizedFullText}`, truncated: false };
  }

  const prioritizedExcerpt = sectionAwareExcerpt(normalizedFullText, availableForFullText);
  if (prioritizedExcerpt) {
    return {
      basis: "摘要+开放全文重点章节节选分析",
      analysisText: `${prefix}${prioritizedExcerpt}`,
      truncated: true,
    };
  }

  const marker = "\n\n[开放全文过长，以下为自动截取的末段；分析未覆盖全文全部内容]\n\n";
  const excerptBudget = Math.max(500, availableForFullText - marker.length);
  const headLength = Math.ceil(excerptBudget * 0.65);
  const tailLength = excerptBudget - headLength;
  const excerpt = `${normalizedFullText.slice(0, headLength)}${marker}${normalizedFullText.slice(-tailLength)}`;
  return {
    basis: "摘要+开放全文节选分析",
    analysisText: `${prefix}${excerpt}`,
    truncated: true,
  };
}

export async function analyzeArticle({ record, fullText, generateAI, maxInputChars = 60000 }) {
  const source = prepareAnalysisSource(record, fullText, maxInputChars);
  const { basis, analysisText } = source;
  let usage = { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };

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

  let translationResponse = await generateAI({
    system: translationSystemPrompt,
    user: buildTranslationPrompt(record),
    maxTokens: 4000,
    task: "abstract-translation",
  });
  usage = addUsage(usage, translationResponse.usage);
  let translationValidation = translationChecks(record, translationResponse.data);
  let translationRetried = false;
  if (!translationValidation.pass) {
    translationRetried = true;
    translationResponse = await generateAI({
      system: translationSystemPrompt,
      user: buildTranslationPrompt(record, translationValidation.issues),
      maxTokens: 4000,
      task: "abstract-translation-regeneration",
    });
    usage = addUsage(usage, translationResponse.usage);
    translationValidation = translationChecks(record, translationResponse.data);
  }
  if (!translationValidation.pass) throw new Error(`Abstract translation failed deterministic checks: ${translationValidation.issues.join("; ")}`);

  const statisticalReferences = statisticalMethodReferences(analysisText);
  let synthesisResponse = await generateAI({
    system: synthesisSystemPrompt,
    user: buildSynthesisPrompt(record, extractionResponse.data, basis, statisticalReferences),
    maxTokens: 7000,
    task: "literature-synthesis",
  });
  usage = addUsage(usage, synthesisResponse.usage);
  let deepValidation = deepDiveChecks(record, synthesisResponse.data, basis);

  let qualityResponse = await generateAI({
    system: qualitySystemPrompt,
    user: buildQualityPrompt(record, extractionResponse.data, translationResponse.data, synthesisResponse.data, analysisText, basis),
    maxTokens: 3500,
    task: "quality-control",
  });
  usage = addUsage(usage, qualityResponse.usage);
  let issues = [...deepValidation.issues, ...qualityIssues(qualityResponse.data)];
  let regenerated = extractionRetried || translationRetried;

  if (!qualityResponse.data.overall_pass || issues.length) {
    regenerated = true;
    if (issues.some(issue => /translation|翻译/i.test(issue))) {
      translationResponse = await generateAI({
        system: translationSystemPrompt,
        user: buildTranslationPrompt(record, issues),
        maxTokens: 4000,
        task: "abstract-translation-regeneration",
      });
      usage = addUsage(usage, translationResponse.usage);
      translationValidation = translationChecks(record, translationResponse.data);
      if (!translationValidation.pass) throw new Error(`Abstract translation failed after regeneration: ${translationValidation.issues.join("; ")}`);
    }
    synthesisResponse = await generateAI({
      system: synthesisSystemPrompt,
      user: buildSynthesisPrompt(record, extractionResponse.data, basis, statisticalReferences, issues),
      maxTokens: 7000,
      task: "literature-regeneration",
    });
    usage = addUsage(usage, synthesisResponse.usage);
    deepValidation = deepDiveChecks(record, synthesisResponse.data, basis);
    qualityResponse = await generateAI({
      system: qualitySystemPrompt,
      user: buildQualityPrompt(record, extractionResponse.data, translationResponse.data, synthesisResponse.data, analysisText, basis),
      maxTokens: 3500,
      task: "quality-control",
    });
    usage = addUsage(usage, qualityResponse.usage);
    issues = [...deepValidation.issues, ...qualityIssues(qualityResponse.data)];
  }

  if (!qualityResponse.data.overall_pass || issues.length) {
    throw new Error(`AI quality control failed after regeneration: ${issues.join("; ")}`);
  }

  return {
    basis,
    extracted: extractionResponse.data,
    abstractTranslation: translationResponse.data,
    synthesis: synthesisResponse.data,
    quality: qualityResponse.data,
    extractionRetried,
    extractionSanitized,
    translationRetried,
    sourceTruncated: source.truncated,
    regenerated,
    usage,
    model: synthesisResponse.model,
  };
}
