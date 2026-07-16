function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

export function deterministicChecks(record, extracted, sourceText = record.abstract) {
  const issues = [];
  if (normalize(extracted.title) !== normalize(record.title)) issues.push("结构化标题与PubMed标题不一致");
  if (normalize(extracted.pmid) !== normalize(record.pmid)) issues.push("结构化PMID与PubMed不一致");
  if (normalize(extracted.doi) !== normalize(record.doi)) issues.push("结构化DOI与PubMed不一致");

  const source = `${record.title} ${sourceText}`.replaceAll(",", "").toLowerCase();
  const numericFields = [extracted.sample_size, ...(extracted.effect_size || []), ...(extracted.confidence_interval || []), ...(extracted.p_value || [])]
    .filter(Boolean)
    .flatMap(value => String(value).replaceAll(",", "").match(/\d+(?:\.\d+)?/g) || []);
  const sourceNumbers = (source.match(/(?:\d+\.\d+|\.\d+|\d+)/g) || []).map(value => Number(value));
  const unsupported = numericFields.filter(value => {
    if (source.includes(value.toLowerCase())) return false;
    const numericValue = Number(value);
    return !Number.isFinite(numericValue) || !sourceNumbers.some(sourceValue => Math.abs(sourceValue - numericValue) < 1e-12);
  });
  if (unsupported.length) issues.push(`原文材料中未找到数字：${[...new Set(unsupported)].slice(0, 8).join(", ")}`);
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
