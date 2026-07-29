function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function numericEvidence(sourceText) {
  const source = String(sourceText || "").replaceAll(",", "").toLowerCase();
  const sourceNumbers = (source.match(/(?:\d+\.\d+|\.\d+|\d+)/g) || []).map(value => Number(value));
  return { source, sourceNumbers };
}

function unsupportedNumbers(value, evidence) {
  const values = String(value || "").replaceAll(",", "").match(/\d+(?:\.\d+)?/g) || [];
  return values.filter(item => {
    if (evidence.source.includes(item.toLowerCase())) return false;
    const numericValue = Number(item);
    return !Number.isFinite(numericValue) || !evidence.sourceNumbers.some(sourceValue => Math.abs(sourceValue - numericValue) < 1e-12);
  });
}

export function sanitizeUnsupportedNumericClaims(record, extracted, sourceText = record.abstract) {
  const evidence = numericEvidence(`${record.title} ${sourceText}`);
  const keepSupported = value => !unsupportedNumbers(value, evidence).length;
  return {
    ...extracted,
    sample_size: keepSupported(extracted.sample_size) ? extracted.sample_size : null,
    effect_size: (extracted.effect_size || []).filter(keepSupported),
    confidence_interval: (extracted.confidence_interval || []).filter(keepSupported),
    p_value: (extracted.p_value || []).filter(keepSupported),
  };
}

export function deterministicChecks(record, extracted, sourceText = record.abstract) {
  const issues = [];
  if (normalize(extracted.title) !== normalize(record.title)) issues.push("结构化标题与PubMed标题不一致");
  if (normalize(extracted.journal) !== normalize(record.journal)) issues.push("结构化期刊与PubMed期刊不一致");
  if (normalize(extracted.date) !== normalize(record.publicationDate)) issues.push("结构化日期与PubMed日期不一致");
  if (normalize(extracted.pmid) !== normalize(record.pmid)) issues.push("结构化PMID与PubMed不一致");
  if (normalize(extracted.doi) !== normalize(record.doi)) issues.push("结构化DOI与PubMed不一致");

  const evidence = numericEvidence(`${record.title} ${sourceText}`);
  const numericFields = [extracted.sample_size, ...(extracted.effect_size || []), ...(extracted.confidence_interval || []), ...(extracted.p_value || [])]
    .filter(Boolean)
    .flatMap(value => String(value).replaceAll(",", "").match(/\d+(?:\.\d+)?/g) || []);
  const unsupported = numericFields.filter(value => unsupportedNumbers(value, evidence).length);
  if (unsupported.length) issues.push(`原文材料中未找到数字：${[...new Set(unsupported)].slice(0, 8).join(", ")}`);
  return { pass: issues.length === 0, issues };
}

export function translationChecks(record, translation) {
  const issues = [];
  const translated = String(translation?.fullText || "").trim();
  if (!translated) return { pass: false, issues: ["摘要中文翻译为空"] };
  if (!Array.isArray(translation?.sections) || !translation.sections.length) issues.push("摘要翻译缺少段落结构");
  const sourceNumbers = [...new Set((String(record.abstract || "").replaceAll(",", "").match(/\d+(?:\.\d+)?/g) || []))];
  const normalizedTranslation = translated.replaceAll(",", "");
  const missingNumbers = sourceNumbers.filter(number => !normalizedTranslation.includes(number));
  if (missingNumbers.length) issues.push(`摘要翻译遗漏原文数字：${missingNumbers.slice(0, 10).join(", ")}`);
  if (translation?.translatorNote !== "AI辅助翻译，请以英文原摘要为准。") issues.push("摘要翻译缺少固定的AI辅助翻译提示");
  return { pass: issues.length === 0, issues };
}

function hasContent(value) {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined;
}

function requireFields(issues, object, moduleName, fields) {
  for (const field of fields) {
    if (!hasContent(object?.[field])) issues.push(`精读V2的${moduleName}缺少字段：${field}`);
  }
}

export function deepDiveChecks(record, synthesis, basis = "") {
  const issues = [];
  const deepDive = synthesis?.deepDive;
  if (!deepDive) return { pass: false, issues: ["精读V2结构缺失"] };
  for (const key of ["sourceCoverage", "methodology", "statistics", "outcomeAnalysis", "criticalAppraisal", "clinicalTranslation"]) {
    if (!deepDive[key]) issues.push(`精读V2缺少模块：${key}`);
  }

  const expectedCoverage = basis === "摘要分析"
    ? "abstract"
    : basis.includes("节选")
      ? "full_text_excerpt"
      : basis.includes("开放全文")
        ? "full_text"
        : null;
  if (expectedCoverage && deepDive.sourceCoverage?.level !== expectedCoverage) {
    issues.push(`精读V2材料覆盖级别应为${expectedCoverage}`);
  }

  requireFields(issues, deepDive.sourceCoverage, "材料覆盖", ["level", "limitations"]);
  requireFields(issues, deepDive.methodology, "研究方法", [
    "researchQuestion", "designFit", "eligibility", "randomization", "allocationConcealment",
    "blinding", "sampleSizePlanning", "followUp", "analysisPopulation", "missingData", "strengths", "concerns",
  ]);
  requireFields(issues, deepDive.statistics, "统计方法", [
    "methods", "adjustedVariables", "multiplicity", "subgroupAnalysis", "clinicalVsStatisticalSignificance",
  ]);
  requireFields(issues, deepDive.outcomeAnalysis, "结果分析", [
    "primary", "secondary", "safety", "absoluteVsRelative", "subgroupAndInteraction", "sensitivity",
  ]);
  requireFields(issues, deepDive.criticalAppraisal, "批判性评价", [
    "strengths", "limitations", "biasRisks", "certainty", "conclusionAlignment", "causalBoundary",
  ]);
  requireFields(issues, deepDive.clinicalTranslation, "临床转化", [
    "applicability", "nonApplicability", "practiceChange", "canDoNow", "cannotConclude", "evidenceGaps",
  ]);

  const translation = deepDive.clinicalTranslation;
  if (record.researchCategory?.id === "basic") {
    if (translation?.directClinicalRecommendation !== false) issues.push("基础研究不得给出直接临床建议");
    if (!translation?.cannotConclude?.length) issues.push("基础研究必须明确当前不能得出的临床结论");
  }
  return { pass: issues.length === 0, issues };
}

export function qualityIssues(qualityResult) {
  if (!qualityResult) return ["质量检查无返回"];
  const explicit = qualityResult.issues || [];
  const failed = Object.entries(qualityResult.checks || {})
    .filter(([, value]) => !value?.pass)
    .map(([key, value]) => `${key}: ${value?.reason || "未通过"}`);
  return [...new Set([...explicit, ...failed])];
}
