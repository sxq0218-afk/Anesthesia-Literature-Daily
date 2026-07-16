const BASIC_TERMS = [
  "animal", "animals", "mice", "mouse", "murine", "rat", "rats", "rabbit", "rabbits", "swine", "porcine",
  "in vitro", "cell culture", "cells", "molecular", "receptor", "pathway", "mechanism", "neurotoxicity", "nociception",
];

const CLINICAL_TYPES = [
  "Randomized Controlled Trial", "Clinical Trial", "Multicenter Study", "Observational Study", "Comparative Study",
  "Controlled Clinical Trial", "Pragmatic Clinical Trial", "Clinical Study", "Cohort Study", "Case-Control Study",
];

const BASIC_TYPES = ["Preclinical Study", "In Vitro", "Animal Study"];
const NON_PRIMARY_TYPES = [
  "Review", "Systematic Review", "Meta-Analysis", "Editorial", "Comment", "Letter", "Guideline",
  "Practice Guideline", "Consensus Development Conference", "News", "Biography", "Historical Article",
];
const BASIC_FOCUS_TERMS = [
  "anesthesia", "anaesthesia", "anesthetic", "anaesthetic", "propofol", "sevoflurane", "isoflurane",
  "desflurane", "ketamine", "dexmedetomidine", "local anesthetic", "local anaesthetic", "nociception",
  "pain mechanism", "analgesia", "analgesic",
];

export function classifyResearchCategory(record) {
  const types = record.publicationTypes || [];
  const mesh = (record.meshTerms || []).join(" ").toLowerCase();
  const text = `${record.title} ${record.abstract}`.toLowerCase();
  const hasHumans = /(^|\W)humans?(\W|$)/i.test(mesh);
  const hasAnimals = /(^|\W)animals?(\W|$)/i.test(mesh);
  const basicSignals = BASIC_TERMS.filter(term => text.includes(term) || mesh.includes(term)).length;
  const clinicalType = types.some(type => CLINICAL_TYPES.some(value => type.toLowerCase().includes(value.toLowerCase())));
  const basicType = types.some(type => BASIC_TYPES.some(value => type.toLowerCase().includes(value.toLowerCase())));
  const nonPrimaryType = types.some(type => NON_PRIMARY_TYPES.some(value => type.toLowerCase() === value.toLowerCase()));
  const patientSignal = /\b(patient|patients|participants|volunteers|subjects|cohort)\b/i.test(text);
  const isProtocol = /\b(protocol|study protocol)\b/i.test(record.title) || types.some(type => /protocol/i.test(type));

  if (basicType || (hasAnimals && !hasHumans) || (basicSignals >= 2 && !clinicalType && !patientSignal)) {
    return { id: "basic", label: "基础研究" };
  }
  if (isProtocol) return { id: "other", label: "综述/方法/其他" };
  if (nonPrimaryType && !clinicalType) return { id: "other", label: "综述/方法/其他" };
  if (clinicalType || (hasHumans && patientSignal)) return { id: "clinical", label: "临床研究" };
  return { id: "other", label: "综述/方法/其他" };
}

function compareCandidates(left, right, priorityFirst) {
  if (priorityFirst) {
    const priorityDifference = (right.journalTier?.priorityRank || 0) - (left.journalTier?.priorityRank || 0);
    if (priorityDifference) return priorityDifference;
  }
  return right.score - left.score;
}

export function selectDailyArticles(records, scoringConfig) {
  const policy = scoringConfig.selectionPolicy || {};
  const priorityFirst = policy.priorityJournalFirst !== false;
  const ranked = records
    .map(record => ({ ...record, researchCategory: classifyResearchCategory(record) }))
    .filter(record => record.researchCategory.id !== "basic" || BASIC_FOCUS_TERMS.some(term => record.title.toLowerCase().includes(term)))
    .sort((a, b) => compareCandidates(a, b, priorityFirst));
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

  if (policy.allowBackfill !== false) {
    for (const record of ranked) {
      if (selected.length >= scoringConfig.dailyLimit) break;
      if (!selectedPmids.has(record.pmid)) {
        selected.push(record);
        selectedPmids.add(record.pmid);
      }
    }
  }

  selected.sort((a, b) => compareCandidates(a, b, priorityFirst));
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
