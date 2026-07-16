function normalizeDoi(value) {
  return (value || "").toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim();
}

function normalizeTitle(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value) {
  const compact = normalizeTitle(value).replaceAll(" ", "");
  const result = new Set();
  for (let index = 0; index < compact.length - 1; index += 1) result.add(compact.slice(index, index + 2));
  return result;
}

export function titleSimilarity(left, right) {
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.size || !b.size) return normalizeTitle(left) === normalizeTitle(right) ? 1 : 0;
  const intersection = [...a].filter(value => b.has(value)).length;
  return (2 * intersection) / (a.size + b.size);
}

export function deduplicate(records, pushedRecords = [], threshold = 0.88) {
  const accepted = [];
  const removed = [];
  const prior = pushedRecords.map(item => ({ pmid: String(item.pmid || ""), doi: normalizeDoi(item.doi), title: item.title || "" }));

  for (const record of records) {
    const candidates = [...prior, ...accepted];
    const duplicate = candidates.find(item =>
      (item.pmid && item.pmid === String(record.pmid))
      || (item.doi && item.doi === normalizeDoi(record.doi))
      || titleSimilarity(item.title, record.title) >= threshold,
    );
    if (duplicate) removed.push({ record, duplicate });
    else accepted.push(record);
  }
  return { accepted, removed };
}
