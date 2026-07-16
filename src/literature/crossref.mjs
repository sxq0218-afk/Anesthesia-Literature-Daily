import { fetchJson } from "../lib/http.mjs";

export async function enrichFromCrossref(record, env) {
  if (!record.doi) return { ...record, publisherUrl: null, crossrefVerified: false };
  const mailto = env.CROSSREF_MAILTO || env.NCBI_EMAIL;
  const suffix = mailto ? `?mailto=${encodeURIComponent(mailto)}` : "";
  try {
    const data = await fetchJson(`https://api.crossref.org/works/${encodeURIComponent(record.doi)}${suffix}`, {
      headers: { "User-Agent": `AnesthesiaLiteratureDaily/1.0${mailto ? ` (mailto:${mailto})` : ""}` },
    });
    const item = data.message || {};
    const publishedParts = item.published?.["date-parts"]?.[0] || item.created?.["date-parts"]?.[0];
    const crossrefDate = publishedParts?.filter(Boolean).join("-") || null;
    return {
      ...record,
      doi: item.DOI || record.doi,
      journal: record.journal || item["container-title"]?.[0] || "",
      publicationDate: record.publicationDate || crossrefDate || "",
      publisher: item.publisher || null,
      publisherUrl: item.URL || `https://doi.org/${record.doi}`,
      crossrefVerified: String(item.DOI || "").toLowerCase() === record.doi.toLowerCase(),
      crossrefDate,
    };
  } catch (error) {
    return { ...record, publisherUrl: `https://doi.org/${record.doi}`, crossrefVerified: false, crossrefError: error.message };
  }
}
