function includesAny(text, terms) {
  const haystack = text.toLowerCase();
  return terms.filter(term => haystack.includes(term.toLowerCase()));
}

function scoreRelevance(record, topicConfig, maxScore) {
  const text = `${record.title} ${record.abstract} ${(record.meshTerms || []).join(" ")}`;
  let weightedMatches = 0;
  const matchedGroups = [];
  for (const group of topicConfig.groups) {
    const matches = includesAny(text, group.terms);
    if (matches.length) {
      weightedMatches += Math.min(matches.length, 3) * group.weight;
      matchedGroups.push({ id: group.id, label: group.label, matches });
    }
  }
  const score = Math.min(maxScore, Math.round(8 + weightedMatches * 5));
  return { score: matchedGroups.length ? score : 0, matchedGroups };
}

function scoreEvidence(record, scoringConfig, maxScore) {
  const types = record.publicationTypes || [];
  const configured = types.map(type => scoringConfig.evidenceTypeScores[type] || 0);
  const base = Math.max(8, ...configured);
  const abstract = record.abstract.toLowerCase();
  const sampleMatch = abstract.match(/(?:n\s*=\s*|included\s+|enrolled\s+)([\d,]{2,})/i);
  const sampleBonus = sampleMatch && Number(sampleMatch[1].replaceAll(",", "")) >= 500 ? 2 : 0;
  return Math.min(maxScore, base + sampleBonus);
}

function scoreClinicalImpact(record, maxScore) {
  const text = `${record.title} ${record.abstract}`.toLowerCase();
  const impactSignals = ["mortality", "delirium", "complication", "pain", "safety", "guideline", "randomized", "multicenter", "intubation", "hemodynamic"];
  return Math.min(maxScore, 7 + includesAny(text, impactSignals).length * 2);
}

function scoreJournal(record, journalConfig, maxScore) {
  const normalizeJournal = value => value.toLowerCase().replace(/[.&]/g, "").replace(/\s+/g, " ").trim();
  const normalized = normalizeJournal(record.journal);
  for (let index = 0; index < journalConfig.tiers.length; index += 1) {
    const tier = journalConfig.tiers[index];
    if (tier.journals.some(journal => normalized === normalizeJournal(journal))) {
      return { score: Math.min(maxScore, tier.score), tierId: tier.id, tierLabel: tier.label, priorityRank: journalConfig.tiers.length - index };
    }
  }
  return { score: Math.min(maxScore, journalConfig.defaultScore), tierId: "other", tierLabel: "其他同行评议期刊", priorityRank: 0 };
}

function scoreNovelty(record, maxScore) {
  const text = `${record.title} ${record.abstract}`.toLowerCase();
  const signals = ["first", "novel", "pragmatic", "multicenter", "artificial intelligence", "machine learning", "new"];
  return Math.min(maxScore, 4 + includesAny(text, signals).length * 2);
}

export function scoreArticle(record, configs) {
  const { topicConfig, journalConfig, scoringConfig } = configs;
  const weights = scoringConfig.weights;
  const relevance = scoreRelevance(record, topicConfig, weights.relevance);
  const journal = scoreJournal(record, journalConfig, weights.journalQuality);
  const breakdown = {
    relevance: relevance.score,
    evidenceQuality: scoreEvidence(record, scoringConfig, weights.evidenceQuality),
    clinicalImpact: scoreClinicalImpact(record, weights.clinicalImpact),
    journalQuality: journal.score,
    novelty: scoreNovelty(record, weights.novelty),
  };
  return {
    ...record,
    matchedGroups: relevance.matchedGroups,
    journalTier: { id: journal.tierId, label: journal.tierLabel, priorityRank: journal.priorityRank },
    scoreBreakdown: breakdown,
    score: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
  };
}
