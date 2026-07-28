export function normalizeJournalName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bthe\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metricIndex(config) {
  const index = new Map();
  for (const entry of config.journals || []) {
    for (const name of [entry.name, ...(entry.aliases || [])]) {
      const normalized = normalizeJournalName(name);
      if (normalized) index.set(normalized, entry);
    }
  }
  return index;
}

export function eligibleJournalEntries(config) {
  const threshold = Number(config.minimumImpactFactor);
  const comparison = config.comparison || "greater-than";
  const rankingMetricYear = Number(config.rankingPolicy?.metricYear || 0) || null;
  const maximumAgeYears = Number(config.rankingPolicy?.maximumAgeYears ?? 1);

  return (config.journals || []).filter(entry => {
    const impactFactor = Number(entry?.impactFactor);
    const metricYear = Number(entry?.metricYear);
    if (!Number.isFinite(impactFactor) || entry?.impactFactor === null) return false;
    if (rankingMetricYear && (!Number.isFinite(metricYear) || metricYear < rankingMetricYear - maximumAgeYears)) return false;
    return comparison === "greater-than-or-equal"
      ? impactFactor >= threshold
      : impactFactor > threshold;
  });
}

export function evaluateJournalImpactFactor(record, config) {
  const entry = metricIndex(config).get(normalizeJournalName(record.journal));
  const impactFactor = Number.isFinite(Number(entry?.impactFactor)) && entry?.impactFactor !== null
    ? Number(entry.impactFactor)
    : null;
  const threshold = Number(config.minimumImpactFactor);
  const comparison = config.comparison || "greater-than";
  const rankingMetricYear = Number(config.rankingPolicy?.metricYear || 0) || null;
  const maximumAgeYears = Number(config.rankingPolicy?.maximumAgeYears ?? 1);
  const metricYear = Number.isFinite(Number(entry?.metricYear)) ? Number(entry.metricYear) : null;
  const stale = impactFactor !== null && rankingMetricYear !== null
    && (metricYear === null || metricYear < rankingMetricYear - maximumAgeYears);
  const passesThreshold = impactFactor !== null
    && (comparison === "greater-than-or-equal" ? impactFactor >= threshold : impactFactor > threshold);
  const passes = passesThreshold && !stale;

  return {
    eligible: passes,
    reason: !entry
      ? "journal-not-configured"
      : impactFactor === null
        ? "impact-factor-unknown"
        : stale
          ? "impact-factor-stale"
          : passes ? "passed" : "below-or-equal-threshold",
    journalMetric: {
      metric: config.metric || "Journal Impact Factor",
      impactFactor,
      metricYear,
      rankingMetricYear,
      maximumAgeYears,
      rankingComparable: !stale && metricYear !== null,
      threshold,
      comparison,
      source: entry?.source ?? null,
      verifiedAt: config.verifiedAt ?? null,
      matchedJournal: entry?.name ?? null,
    },
  };
}

export function summarizeJournalAudit(records, config, sampleLimit = 20) {
  const screening = screenByJournalImpactFactor(records, config);
  const unresolved = screening.rejected.filter(record =>
    ["journal-not-configured", "impact-factor-unknown", "impact-factor-stale"].includes(record.journalMetricReason));
  const journalCounts = unresolved.reduce((counts, record) => {
    const journal = record.journal || "Unknown journal";
    const key = `${record.journalMetricReason}\u0000${journal}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());

  return {
    ...screening.summary,
    unresolvedCount: unresolved.length,
    unresolvedJournals: [...journalCounts.entries()]
      .map(([key, count]) => {
        const [reason, journal] = key.split("\u0000");
        return { journal, reason, count };
      })
      .sort((left, right) => right.count - left.count || left.journal.localeCompare(right.journal))
      .slice(0, sampleLimit),
  };
}

export function screenByJournalImpactFactor(records, config) {
  const accepted = [];
  const rejected = [];
  for (const record of records) {
    const evaluation = evaluateJournalImpactFactor(record, config);
    const evaluatedRecord = { ...record, journalMetric: evaluation.journalMetric };
    (evaluation.eligible ? accepted : rejected).push({ ...evaluatedRecord, journalMetricReason: evaluation.reason });
  }
  return {
    accepted,
    rejected,
    summary: {
      threshold: Number(config.minimumImpactFactor),
      comparison: config.comparison || "greater-than",
      candidateCount: records.length,
      eligibleCount: accepted.length,
      excludedCount: rejected.length,
      excludedByReason: rejected.reduce((summary, record) => {
        summary[record.journalMetricReason] = (summary[record.journalMetricReason] || 0) + 1;
        return summary;
      }, {}),
      rankingMetricYear: Number(config.rankingPolicy?.metricYear || 0) || null,
      eligibleMetricYears: [...new Set(accepted.map(record => record.journalMetric.metricYear).filter(Boolean))].sort(),
    },
  };
}
