import { fetchJson } from "../lib/http.mjs";

export async function enrichPmc(records, env) {
  if (!records.length) return records;
  const params = new URLSearchParams({
    ids: records.map(record => record.pmid).join(","),
    idtype: "pmid",
    format: "json",
    tool: env.NCBI_TOOL || "anesthesia_literature_daily",
  });
  if (env.NCBI_EMAIL) params.set("email", env.NCBI_EMAIL);

  try {
    const data = await fetchJson(`https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?${params}`);
    const byPmid = new Map((data.records || []).map(item => [String(item.pmid || ""), item]));
    return records.map(record => {
      const pmc = byPmid.get(String(record.pmid));
      const isLive = Boolean(pmc?.pmcid && pmc.live !== "false" && !pmc["release-date"]);
      return {
        ...record,
        pmcid: pmc?.pmcid || record.pmcid || null,
        pmcLive: Boolean(isLive),
        openAccessUrl: isLive ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmc.pmcid}/` : null,
        pmcReleaseDate: pmc?.["release-date"] || null,
      };
    });
  } catch (error) {
    return records.map(record => ({ ...record, pmcLive: false, openAccessUrl: null, pmcError: error.message }));
  }
}
