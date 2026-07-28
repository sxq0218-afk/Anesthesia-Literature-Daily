export const extractionSystemPrompt = `你是医学文献数据抽取器。只根据提供的原文材料提取信息，输出一个JSON对象。
必须遵守：
1. 不推断原文未报告的数字；缺失信息使用null或空数组。
2. 样本量、效应量、置信区间、P值逐字忠实于材料。
3. 观察性研究不得写成因果关系。
4. title、journal、date、doi、pmid必须与给定元数据完全一致。
5. JSON必须包含全部指定字段，不要输出解释性文字。`;

export function buildExtractionPrompt(record, analysisText, basis, correctionIssues = []) {
  return `请提取下列文献。分析依据：${basis}。

固定元数据：
title: ${record.title}
journal: ${record.journal}
date: ${record.publicationDate}
doi: ${record.doi || "null"}
pmid: ${record.pmid}
publication_types: ${(record.publicationTypes || []).join("; ") || "unknown"}

原文材料：
${analysisText}

${correctionIssues.length ? `上一版结构化抽取未通过确定性校验，必须修正：${correctionIssues.join("；")}。无法由原文逐字支持的数字请改为null或从对应数组中删除。` : ""}

输出JSON字段：
{
  "title": string,
  "journal": string,
  "date": string,
  "doi": string|null,
  "pmid": string,
  "study_type": string|null,
  "population": string|null,
  "sample_size": string|null,
  "intervention": string|null,
  "comparison": string|null,
  "primary_outcome": string|null,
  "secondary_outcome": string[]|null,
  "results": string|null,
  "effect_size": string[]|null,
  "confidence_interval": string[]|null,
  "p_value": string[]|null,
  "adverse_events": string|null,
  "limitation": string[]
}`;
}

export const translationSystemPrompt = `你是严谨的医学摘要翻译员。把给定英文摘要完整、忠实地翻译为中文并输出JSON。
必须遵守：
1. 不遗漏任何句子，不增加原文没有的信息，不进行解释或总结。
2. 样本量、剂量、时间、效应量、百分比、置信区间、P值、正负号和组别方向必须与英文一致。
3. 保留BACKGROUND、METHODS、RESULTS、CONCLUSIONS等结构；没有标题时按原段落翻译。
4. 不把关联写成因果，不强化may、suggest、potential等谨慎措辞。
5. 专业缩写首次出现时尽量给出规范中文名称，随后保留缩写。
6. 只输出有效JSON。`;

export function buildTranslationPrompt(record, correctionIssues = []) {
  return `固定元数据：${JSON.stringify({ title: record.title, journal: record.journal, pmid: record.pmid })}
英文摘要：
${record.abstract}

${correctionIssues.length ? `上一版翻译存在以下问题，必须逐项修正：${correctionIssues.join("；")}` : ""}

输出JSON字段：
{
  "sections": [{"heading": string|null, "text": string}],
  "fullText": string,
  "translatorNote": "AI辅助翻译，请以英文原摘要为准。"
}`;
}

export const synthesisSystemPrompt = `你是严谨的麻醉学文献编辑。只能根据结构化抽取结果和给定原文材料生成中文精读，并输出JSON。
要求：
1. 不补写材料中没有的信息；缺失数据必须明确写“当前可获取内容未提供该数据。”。
2. 主要结果尽量包含样本量、主要终点、效应量、95%CI和P值；缺什么就明确指出缺什么。
3. 区分统计学差异与临床获益，避免把观察性关联写成因果。
4. 亚组结果必须标记为亚组，不得外推。
5. 标题翻译准确、克制，不使用夸张措辞。
6. 动物、细胞或机制研究不得直接提出临床用药、监测或治疗建议；必须说明距临床转化仍需哪些证据。
7. 明确区分原文报告、基于研究设计的编辑判断以及当前材料无法评价的内容。
8. 所有数组字段至少包含一项；如果材料没有报告，必须用“当前可获取内容未提供……”作为该项，不得返回空数组。
9. statistics.methods至少包含一项；未识别到具体方法时，用name“未报告”并说明无法评价，不得猜测。
10. 输出有效JSON，不要输出其他文字。`;

export function buildSynthesisPrompt(record, extracted, basis, statisticalReferences = [], correctionIssues = []) {
  return `固定元数据：${JSON.stringify({ title: record.title, journal: record.journal, date: record.publicationDate, doi: record.doi, pmid: record.pmid, basis })}
结构化抽取：${JSON.stringify(extracted)}
原始摘要：${record.abstract}
研究分类：${JSON.stringify(record.researchCategory || null)}
原文中自动识别到的统计方法参考词典：${JSON.stringify(statisticalReferences)}
${correctionIssues.length ? `上一版质量问题，必须修正：${correctionIssues.join("；")}` : ""}

输出JSON字段：
{
  "chineseTitle": string,
  "oneSentenceConclusion": string,
  "whyItMatters": string,
  "background": string,
  "pico": {"population": string, "intervention": string, "comparison": string, "outcome": string},
  "studyDesign": string,
  "mainResults": string,
  "anesthesiaImplications": string[],
  "limitations": string[],
  "aiAssessment": {"support": string, "overinterpretationRisk": string},
  "keyPoints": string[],
  "deepDive": {
    "sourceCoverage": {"level": "abstract"|"full_text"|"full_text_excerpt", "limitations": string[]},
    "methodology": {
      "researchQuestion": string,
      "designFit": string,
      "eligibility": string,
      "randomization": string,
      "allocationConcealment": string,
      "blinding": string,
      "sampleSizePlanning": string,
      "followUp": string,
      "analysisPopulation": string,
      "missingData": string,
      "strengths": string[],
      "concerns": string[]
    },
    "statistics": {
      "methods": [{"referenceId": string|null, "name": string, "purposeInStudy": string, "reportedResult": string, "interpretation": string, "cautions": string[]}],
      "adjustedVariables": string,
      "multiplicity": string,
      "subgroupAnalysis": string,
      "clinicalVsStatisticalSignificance": string
    },
    "outcomeAnalysis": {
      "primary": string,
      "secondary": string[],
      "safety": string,
      "absoluteVsRelative": string,
      "subgroupAndInteraction": string,
      "sensitivity": string
    },
    "criticalAppraisal": {
      "strengths": string[],
      "limitations": string[],
      "biasRisks": string[],
      "certainty": string,
      "conclusionAlignment": string,
      "causalBoundary": string
    },
    "clinicalTranslation": {
      "applicability": string[],
      "nonApplicability": string[],
      "practiceChange": string,
      "canDoNow": string[],
      "cannotConclude": string[],
      "evidenceGaps": string[],
      "directClinicalRecommendation": boolean
    }
  }
}`;
}

export const qualitySystemPrompt = `你是医学文献事实核查员。对照固定元数据、原始材料、结构化抽取和中文精读进行第二轮质量检查。输出JSON。
每个检查项必须给出pass布尔值和简短reason。只要存在无法由原文支持的具体事实，overall_pass必须为false。`;

export function buildQualityPrompt(record, extracted, translation, synthesis, sourceText = record.abstract, basis = "摘要分析") {
  return `固定元数据：${JSON.stringify({ title: record.title, pmid: record.pmid, doi: record.doi, publicationTypes: record.publicationTypes })}
分析依据：${basis}
用于事实核查的原始材料：${sourceText}
结构化抽取：${JSON.stringify(extracted)}
完整摘要中文翻译：${JSON.stringify(translation)}
中文精读：${JSON.stringify(synthesis)}

检查并输出：
{
  "overall_pass": boolean,
  "checks": {
    "title_match": {"pass": boolean, "reason": string},
    "pmid_match": {"pass": boolean, "reason": string},
    "doi_match": {"pass": boolean, "reason": string},
    "sample_size": {"pass": boolean, "reason": string},
    "primary_outcome": {"pass": boolean, "reason": string},
    "effect_direction": {"pass": boolean, "reason": string},
    "confidence_interval": {"pass": boolean, "reason": string},
    "p_value": {"pass": boolean, "reason": string},
    "causality": {"pass": boolean, "reason": string},
    "clinical_vs_statistical": {"pass": boolean, "reason": string},
    "subgroup_interpretation": {"pass": boolean, "reason": string},
    "abstract_translation_complete": {"pass": boolean, "reason": string},
    "abstract_translation_direction": {"pass": boolean, "reason": string},
    "statistical_methods": {"pass": boolean, "reason": string},
    "clinical_translation_boundary": {"pass": boolean, "reason": string},
    "unsupported_information": {"pass": boolean, "reason": string}
  },
  "issues": string[]
}`;
}
