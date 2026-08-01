const BASIC_TERMS = [
  "animal", "animals", "mice", "mouse", "murine", "rat", "rats", "rabbit", "rabbits", "swine", "porcine",
  "in vitro", "ex vivo", "cell culture", "cells", "organoid", "tissue", "molecular", "receptor", "pathway",
  "mechanism", "neurotoxicity", "nociception", "knockout", "gene expression",
];

const CLINICAL_TYPES = [
  "Randomized Controlled Trial", "Clinical Trial", "Multicenter Study", "Observational Study", "Comparative Study",
  "Controlled Clinical Trial", "Pragmatic Clinical Trial", "Clinical Study", "Cohort Study", "Case-Control Study",
];

const BASIC_TYPES = ["Preclinical Study", "In Vitro", "Animal Study"];
const CLINICAL_EVIDENCE_TYPES = [
  "Systematic Review", "Meta-Analysis", "Guideline", "Practice Guideline",
  "Consensus Development Conference",
];
const NON_PRIMARY_TYPES = [
  "Review", "Editorial", "Comment", "Letter", "News", "Biography", "Historical Article",
];
const ANIMAL_MODEL_PATTERN = /\b(mice|mouse|murine|rats?|rabbits?|swine|porcine|canine|dogs?|nonhuman primates?|zebrafish)\b/i;
const CLINICAL_DESIGN_PATTERN = /\b(randomi[sz]ed|clinical trial|controlled trial|cohort|case-control|prospective|retrospective|multicent(?:er|re)|patients?|participants?|volunteers?|adults?|children|infants?|neonates?)\b/i;

export function classifyResearchCategory(record) {
  const types = record.publicationTypes || [];
  const mesh = (record.meshTerms || []).join(" ").toLowerCase();
  const text = `${record.title} ${record.abstract}`.toLowerCase();
  const hasHumans = /(^|\W)humans?(\W|$)/i.test(mesh);
  const hasAnimals = /(^|\W)animals?(\W|$)/i.test(mesh);
  const basicSignals = BASIC_TERMS.filter(term => text.includes(term) || mesh.includes(term)).length;
  const clinicalType = types.some(type => CLINICAL_TYPES.some(value => type.toLowerCase().includes(value.toLowerCase())));
  const clinicalEvidenceType = types.some(type => CLINICAL_EVIDENCE_TYPES.some(value => type.toLowerCase() === value.toLowerCase()));
  const basicType = types.some(type => BASIC_TYPES.some(value => type.toLowerCase().includes(value.toLowerCase())));
  const nonPrimaryType = types.some(type => NON_PRIMARY_TYPES.some(value => type.toLowerCase() === value.toLowerCase()));
  const patientSignal = /\b(patient|patients|participants|volunteers|subjects|cohort)\b/i.test(text);
  const explicitAnimalModel = ANIMAL_MODEL_PATTERN.test(text);
  const clinicalDesignSignal = CLINICAL_DESIGN_PATTERN.test(text);
  const isProtocol = /\b(protocol|study protocol)\b/i.test(record.title) || types.some(type => /protocol/i.test(type));

  if (isProtocol) return { id: "other", label: "综述/方法/其他", reason: "protocol" };
  if (basicType || (hasAnimals && !hasHumans) || (explicitAnimalModel && !hasHumans && !patientSignal)) {
    return { id: "basic", label: "基础研究", reason: basicType ? "publication-type" : "non-human-model" };
  }
  if (clinicalEvidenceType) return { id: "clinical", label: "临床证据", reason: "clinical-evidence-publication-type" };
  if (basicSignals >= 2 && !hasHumans && !clinicalType && !clinicalDesignSignal && !patientSignal) {
    return { id: "basic", label: "基础研究", reason: "mechanistic-non-human-signals" };
  }
  if (nonPrimaryType && !clinicalType) return { id: "other", label: "综述/方法/其他", reason: "non-primary-publication-type" };
  if (clinicalType || clinicalDesignSignal || hasHumans) {
    return { id: "clinical", label: "临床证据", reason: hasHumans ? "human-study" : "clinical-design" };
  }
  return { id: "other", label: "综述/方法/其他", reason: "insufficient-category-evidence" };
}

function publicationTime(record) {
  const value = Date.parse(record.publicationDate || record.electronicPublicationDate || "");
  return Number.isFinite(value) ? value : 0;
}

export function compareCandidates(left, right) {
  const impactFactorDifference = Number(right.journalMetric?.impactFactor || 0) - Number(left.journalMetric?.impactFactor || 0);
  if (impactFactorDifference) return impactFactorDifference;
  const scoreDifference = Number(right.score || 0) - Number(left.score || 0);
  if (scoreDifference) return scoreDifference;
  const evidenceDifference = Number(right.scoreBreakdown?.evidenceQuality || 0) - Number(left.scoreBreakdown?.evidenceQuality || 0);
  if (evidenceDifference) return evidenceDifference;
  const dateDifference = publicationTime(right) - publicationTime(left);
  if (dateDifference) return dateDifference;
  return String(left.pmid || "").localeCompare(String(right.pmid || ""));
}

export function selectDailyArticles(records, scoringConfig) {
  const policy = scoringConfig.selectionPolicy || {};
  const ranked = records
    .map(record => ({ ...record, researchCategory: classifyResearchCategory(record) }))
    .sort(compareCandidates);
  const selected = [];
  const selectedPmids = new Set();

  const take = (category, target) => {
    for (const record of ranked) {
      if (selected.filter(item => item.researchCategory.id === category).length >= target) break;
      if (record.researchCategory.id === category && !selectedPmids.has(record.pmid)) {
        selected.push(record);
        selectedPmids.add(record.pmid);
      }
    }
  };

  take("clinical", policy.clinicalTarget ?? 4);
  take("basic", policy.basicTarget ?? 1);

  selected.sort(compareCandidates);
  const summary = {
    clinical: selected.filter(record => record.researchCategory.id === "clinical").length,
    basic: selected.filter(record => record.researchCategory.id === "basic").length,
    other: selected.filter(record => record.researchCategory.id === "other").length,
    priorityJournals: selected.filter(record => (record.journalTier?.priorityRank || 0) > 0).length,
  };
  const candidatePool = {
    total: ranked.length,
    clinical: ranked.filter(record => record.researchCategory.id === "clinical").length,
    basic: ranked.filter(record => record.researchCategory.id === "basic").length,
    other: ranked.filter(record => record.researchCategory.id === "other").length,
  };
  const compositionSatisfied = selected.length >= scoringConfig.dailyLimit
    && summary.clinical >= (policy.clinicalTarget ?? 4)
    && summary.basic >= (policy.basicTarget ?? 1);

  return { selected: selected.slice(0, scoringConfig.dailyLimit), ranked, summary, candidatePool, compositionSatisfied };
}

export async function fillSelectedSlotsWithCategoryFallback({ selected, ranked, processCandidate }) {
  if (typeof processCandidate !== "function") throw new TypeError("processCandidate must be a function");
  const reservedPmids = new Set(selected.map(record => record.pmid));
  const fallbackQueues = new Map();
  for (const record of ranked) {
    const category = record.researchCategory?.id;
    if (!category || reservedPmids.has(record.pmid)) continue;
    if (!fallbackQueues.has(category)) fallbackQueues.set(category, []);
    fallbackQueues.get(category).push(record);
  }

  const results = [];
  const attempts = [];
  for (const primary of selected) {
    const category = primary.researchCategory?.id;
    let candidate = primary;
    let completed = false;
    while (candidate) {
      const isFallback = candidate.pmid !== primary.pmid;
      try {
        const value = await processCandidate(candidate, { primary, category, isFallback });
        attempts.push({ pmid: candidate.pmid, primaryPmid: primary.pmid, category, isFallback, status: "success" });
        results.push({ primary, candidate, value, isFallback });
        completed = true;
        break;
      } catch (error) {
        attempts.push({ pmid: candidate.pmid, primaryPmid: primary.pmid, category, isFallback, status: "failed", error: error.message });
        candidate = fallbackQueues.get(category)?.shift() || null;
      }
    }
    if (!completed) results.push({ primary, candidate: null, value: null, isFallback: false });
  }

  return {
    results,
    attempts,
    complete: results.every(result => result.candidate && result.value !== null),
    successful: results.filter(result => result.candidate && result.value !== null),
  };
}
