function firstYear(value) {
  return String(value || "").match(/\b(19|20)\d{2}\b/)?.[0] || "";
}

function compactAbstract(value, max = 420) {
  if (!value) return "PubMed 当前未提供摘要。";
  return value.length > max ? `${value.slice(0, max).trim()}…` : value;
}

function evidenceLabel(score) {
  if (score >= 80) return "高";
  if (score >= 68) return "中等偏高";
  return "中等";
}

export function metadataOnlyAnalysis(record) {
  const studyType = record.publicationTypes?.[0] || "待AI判定";
  return {
    basis: "当前分析基于PubMed摘要（AI精读待生成）",
    extracted: {
      title: record.title,
      journal: record.journal,
      date: record.publicationDate,
      doi: record.doi,
      pmid: record.pmid,
      study_type: studyType,
      population: null,
      sample_size: null,
      intervention: null,
      comparison: null,
      primary_outcome: null,
      secondary_outcome: null,
      results: compactAbstract(record.abstract, 900),
      effect_size: null,
      confidence_interval: null,
      p_value: null,
      adverse_events: null,
      limitation: ["尚未配置AI API Key，本页仅展示PubMed真实元数据与原始摘要信息。"],
    },
    synthesis: {
      chineseTitle: record.title,
      oneSentenceConclusion: compactAbstract(record.abstract, 260),
      whyItMatters: "该文献通过专业相关性、证据类型、临床影响、期刊质量和新颖性自动评分后进入今日候选。",
      background: compactAbstract(record.abstract, 600),
      pico: {
        population: "原文摘要待AI结构化提取",
        intervention: "原文摘要待AI结构化提取",
        comparison: "原文摘要待AI结构化提取",
        outcome: "原文摘要待AI结构化提取",
      },
      studyDesign: studyType,
      mainResults: compactAbstract(record.abstract, 900),
      anesthesiaImplications: ["请结合PubMed摘要与原文判断临床适用性。", "AI结构化精读将在配置模型后自动生成。"],
      limitations: ["当前未调用AI，仅基于PubMed元数据与摘要展示。"],
      aiAssessment: {
        support: "待AI结构化分析与第二轮质量检查",
        overinterpretationRisk: "当前不提供超出PubMed摘要的解释。",
      },
      keyPoints: [studyType, record.journal, `PMID ${record.pmid}`],
    },
    quality: null,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    model: null,
  };
}

export function toWebArticle(record, analysis, index) {
  const extracted = analysis.extracted;
  const synthesis = analysis.synthesis;
  const doiUrl = record.doi ? `https://doi.org/${record.doi}` : null;
  const tags = [
    record.researchCategory?.label,
    record.journalTier?.priorityRank > 0 ? record.journalTier.label : null,
    ...(record.matchedGroups || []).map(group => group.label),
    ...(record.publicationTypes || []).slice(0, 2),
  ].filter(Boolean);
  const missingData = "当前可获取内容未提供该数据。";
  const sampleSize = extracted.sample_size || missingData;
  const mainOutcome = extracted.primary_outcome || missingData;
  const pico = {
    population: extracted.population || synthesis.pico?.population || missingData,
    intervention: extracted.intervention || synthesis.pico?.intervention || missingData,
    comparison: extracted.comparison || synthesis.pico?.comparison || missingData,
    outcome: extracted.primary_outcome || synthesis.pico?.outcome || missingData,
  };
  const deepDive = synthesis.deepDive
    ? {
        ...synthesis.deepDive,
        statistics: enrichStatisticalMethods(synthesis.deepDive.statistics, `${record.abstract}\n${extracted.results || ""}`),
      }
    : null;
  const expandedReadingLength = record.abstract.length
    + String(analysis.abstractTranslation?.fullText || "").length
    + JSON.stringify(deepDive || {}).length;

  return {
    analysisVersion: deepDive ? 2 : 1,
    slug: `pmid-${record.pmid}`,
    number: String(index + 1).padStart(2, "0"),
    category: record.matchedGroups?.[0]?.label || "麻醉学",
    journal: record.journal,
    year: firstYear(record.publicationDate),
    publishedDate: record.publicationDate,
    electronicPublicationDate: record.electronicPublicationDate,
    readingTime: `${Math.max(5, Math.min(25, Math.round((expandedReadingLength + 1800) / 600)))} 分钟`,
    title: synthesis.chineseTitle,
    originalTitle: record.title,
    abstract: record.abstract,
    abstractTranslation: analysis.abstractTranslation || null,
    authors: record.authors.slice(0, 8).join(", ") + (record.authors.length > 8 ? ", et al." : ""),
    citation: record.citation || `${record.journal}. ${record.publicationDate}.`,
    doi: record.doi,
    pmid: record.pmid,
    pmcid: record.pmcid,
    publicationTypes: record.publicationTypes,
    meshTerms: record.meshTerms,
    publisher: record.publisher,
    crossrefVerified: record.crossrefVerified,
    researchCategory: record.researchCategory,
    journalTier: record.journalTier,
    journalMetric: record.journalMetric,
    tags,
    question: synthesis.whyItMatters,
    conclusion: synthesis.oneSentenceConclusion,
    clinical: synthesis.anesthesiaImplications.join(" "),
    evidence: evidenceLabel(record.score),
    score: record.score,
    scoreBreakdown: record.scoreBreakdown,
    study: [
      { label: "研究设计", value: synthesis.studyDesign || extracted.study_type || "原文摘要未报告" },
      { label: "研究对象与样本", value: `${pico.population}；${sampleSize}` },
      { label: "干预与比较", value: `${pico.intervention}；对照：${pico.comparison}` },
      { label: "主要终点", value: pico.outcome || mainOutcome },
    ],
    keyPoints: synthesis.keyPoints.slice(0, 5),
    methods: synthesis.background,
    results: synthesis.mainResults,
    mainResults: synthesis.mainResults,
    limitations: synthesis.limitations,
    practice: synthesis.anesthesiaImplications,
    editor: `${synthesis.aiAssessment.support} 过度解读风险：${synthesis.aiAssessment.overinterpretationRisk}`,
    whyItMatters: synthesis.whyItMatters,
    background: synthesis.background,
    pico,
    studyType: synthesis.studyDesign || extracted.study_type,
    sampleSize,
    primaryOutcome: mainOutcome,
    effectSize: extracted.effect_size?.length ? extracted.effect_size : [missingData],
    confidenceInterval: extracted.confidence_interval?.length ? extracted.confidence_interval : [missingData],
    pValue: extracted.p_value?.length ? extracted.p_value : [missingData],
    adverseEvents: extracted.adverse_events,
    aiAssessment: synthesis.aiAssessment,
    deepDive,
    analysisBasis: analysis.basis,
    analysisStatus: analysis.model ? "ai_complete" : "metadata_only",
    aiModel: analysis.model,
    qualityPassed: analysis.quality?.overall_pass ?? false,
    sourceType: "real",
    urls: {
      pubmed: `https://pubmed.ncbi.nlm.nih.gov/${record.pmid}/`,
      doi: doiUrl,
      publisher: record.publisherUrl || doiUrl,
      openFullText: record.openAccessUrl || null,
    },
  };
}
import { enrichStatisticalMethods } from "./statistics.mjs";
