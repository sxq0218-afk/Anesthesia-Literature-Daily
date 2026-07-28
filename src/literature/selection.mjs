const BASIC_TERMS = [
  "animal", "animals", "mice", "mouse", "murine", "rat", "rats", "rabbit", "rabbits", "swine", "porcine",
  "in vitro", "cell culture", "cells", "molecular", "receptor", "pathway", "mechanism", "neurotoxicity", "nociception",
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
const BASIC_FOCUS_TERMS = [
  "anesthesia", "anaesthesia", "anesthetic", "anaesthetic", "propofol", "sevoflurane", "isoflurane",
  "desflurane", "ketamine", "dexmedetomidine", "local anesthetic", "local anaesthetic", "nociception",
  "pain mechanism", "analgesia", "analgesic",
];
const ANIMAL_MODEL_PATTERN = /\b(mice|mouse|murine|rats?|rabbits?|swine|porcine|canine|dogs?|nonhuman primates?)\b/i;
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

  if (isProtocol) return { id: "other", label: "综述/方法/其他" };
  if (basicType || (hasAnimals && !hasHumans) || (explicitAnimalModel && !hasHumans && !patientSignal)) {
    return { id: "basic", label: "基础研究" };
  }
  if (clinicalEvidenceType) return { id: "clinical", label: "临床证据" };
  if (basicSignals >= 2 && !clinicalType && !patientSignal) return { id: "basic", label: "基础研究" };
  if (nonPrimaryType && !clinicalType) return { id: "other", label: "综述/方法/其他" };
  if (clinicalType || clinicalDesignSignal || (hasHumans && patientSignal)) return { id: "clinical", label: "临床证据" };
  return { id: "other", label: "综述/方法/其他" };
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
    .filter(record => record.researchCategory.id !== "basic" || BASIC_FOCUS_TERMS.some(term => record.title.toLowerCase().includes(term)))
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
  const compositionSatisfied = selected.length >= scoringConfig.dailyLimit
    && summary.clinical >= (policy.clinicalTarget ?? 4)
    && summary.basic >= (policy.basicTarget ?? 1);

  return { selected: selected.slice(0, scoringConfig.dailyLimit), ranked, summary, compositionSatisfied };
}
