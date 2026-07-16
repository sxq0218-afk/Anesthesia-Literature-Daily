import { fetchJson, fetchText } from "../lib/http.mjs";

const BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

function paramsWithIdentity(params, env) {
  const next = new URLSearchParams(params);
  next.set("tool", env.NCBI_TOOL || "anesthesia_literature_daily");
  if (env.NCBI_EMAIL) next.set("email", env.NCBI_EMAIL);
  if (env.NCBI_API_KEY) next.set("api_key", env.NCBI_API_KEY);
  return next;
}

export function buildPubMedQuery(topicConfig) {
  const terms = topicConfig.groups.flatMap(group => group.terms);
  const topicExpression = terms
    .map(term => `\"${term.replaceAll('"', '')}\"[Title/Abstract]`)
    .join(" OR ");
  return `(${topicExpression}) AND hasabstract[text]`;
}

export function buildPriorityJournalQuery(topicConfig, journalConfig) {
  const journals = journalConfig.tiers.flatMap(tier => tier.journals);
  const journalExpression = [...new Set(journals)]
    .map(journal => `"${journal.replaceAll('"', '')}"[Journal]`)
    .join(" OR ");
  return `${buildPubMedQuery(topicConfig)} AND (${journalExpression})`;
}

async function searchOnce({ term, days, limit, env }) {
  const params = paramsWithIdentity({
    db: "pubmed",
    retmode: "json",
    retmax: String(limit),
    sort: "pub date",
    datetype: "pdat",
    reldate: String(days),
    term,
  }, env);
  const data = await fetchJson(`${BASE_URL}/esearch.fcgi?${params}`);
  return {
    ids: data.esearchresult?.idlist || [],
    count: Number(data.esearchresult?.count || 0),
    queryTranslation: data.esearchresult?.querytranslation || "",
  };
}

export async function searchPubMed({ topicConfig, journalConfig, days, limit, env }) {
  const baseQuery = buildPubMedQuery(topicConfig);
  const priorityQuery = journalConfig ? buildPriorityJournalQuery(topicConfig, journalConfig) : null;
  const priorityLimit = Math.min(60, limit);
  const [base, priority] = await Promise.all([
    searchOnce({ term: baseQuery, days, limit, env }),
    priorityQuery ? searchOnce({ term: priorityQuery, days, limit: priorityLimit, env }) : Promise.resolve({ ids: [], count: 0, queryTranslation: "" }),
  ]);
  return {
    ids: [...new Set([...priority.ids, ...base.ids])].slice(0, limit),
    count: base.count,
    priorityCount: priority.count,
    queryTranslation: base.queryTranslation,
    priorityQueryTranslation: priority.queryTranslation,
  };
}

function decodeEntities(value = "") {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function normalizePublicationDate(value = "") {
  const compact = value.trim();
  if (/^\d{8}$/.test(compact)) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  if (/^\d{6}$/.test(compact)) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}`;
  const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  const match = compact.match(/^(\d{4})\s+([A-Z][a-z]{2})(?:\s+(\d{1,2}))?/);
  if (match && months[match[2]]) return `${match[1]}-${months[match[2]]}${match[3] ? `-${match[3].padStart(2, "0")}` : ""}`;
  return compact;
}

function effectivePublicationDate(issueDate, electronicDate) {
  if (!issueDate) return electronicDate;
  if (!electronicDate) return issueDate;
  const issueComparable = issueDate.length === 4 ? `${issueDate}-12-31` : issueDate.length === 7 ? `${issueDate}-01` : issueDate;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return issueComparable > tomorrow ? electronicDate : issueDate;
}

export function parseMedline(text) {
  const records = [];
  let current = null;
  let activeField = null;

  const pushCurrent = () => {
    if (!current?.PMID?.[0]) return;
    records.push(current);
  };

  for (const rawLine of text.replaceAll("\r", "").split("\n")) {
    const fieldMatch = rawLine.match(/^([A-Z0-9]{2,4})\s*-\s(.*)$/);
    if (fieldMatch) {
      const [, field, rawValue] = fieldMatch;
      if (field === "PMID") {
        pushCurrent();
        current = {};
      }
      if (!current) continue;
      activeField = field;
      current[field] ||= [];
      current[field].push(decodeEntities(rawValue.trim()));
      continue;
    }
    if (current && activeField && /^\s{6}/.test(rawLine) && rawLine.trim()) {
      const values = current[activeField];
      values[values.length - 1] += ` ${decodeEntities(rawLine.trim())}`;
    }
  }
  pushCurrent();

  return records.map(fields => {
    const aids = fields.AID || [];
    const doi = aids.find(value => /\[doi\]$/i.test(value))?.replace(/\s*\[doi\]$/i, "")
      || fields.LID?.find(value => /\[doi\]$/i.test(value))?.replace(/\s*\[doi\]$/i, "")
      || null;
    const publicationTypes = fields.PT || [];
    const issuePublicationDate = normalizePublicationDate(fields.DP?.[0] || "");
    const electronicPublicationDate = fields.DEP?.[0] ? normalizePublicationDate(fields.DEP[0]) : null;
    return {
      pmid: fields.PMID[0],
      title: fields.TI?.join(" ") || "",
      abstract: fields.AB?.join(" ") || "",
      authors: fields.AU || fields.FAU || [],
      journal: fields.JT?.[0] || fields.TA?.[0] || "",
      journalAbbreviation: fields.TA?.[0] || "",
      publicationDate: effectivePublicationDate(issuePublicationDate, electronicPublicationDate),
      issuePublicationDate: issuePublicationDate || null,
      electronicPublicationDate,
      doi,
      pmcid: fields.PMC?.[0] || null,
      meshTerms: fields.MH || [],
      publicationTypes,
      language: fields.LA?.[0] || "",
      citation: fields.SO?.[0] || "",
      rawFields: fields,
    };
  });
}

export async function fetchPubMedRecords({ ids, env }) {
  if (!ids.length) return [];
  const params = paramsWithIdentity({
    db: "pubmed",
    id: ids.join(","),
    rettype: "medline",
    retmode: "text",
  }, env);
  return parseMedline(await fetchText(`${BASE_URL}/efetch.fcgi?${params}`));
}

export async function fetchPmcFullText({ pmcid, env }) {
  if (!pmcid) return null;
  const params = paramsWithIdentity({ db: "pmc", id: pmcid, retmode: "xml" }, env);
  const xml = await fetchText(`${BASE_URL}/efetch.fcgi?${params}`);
  const text = decodeEntities(xml
    .replace(/<xref[^>]*>[\s\S]*?<\/xref>/gi, " ")
    .replace(/<ref-list[\s\S]*?<\/ref-list>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
  return text.length > 500 ? text.slice(0, 60000) : null;
}

export const pubmedUrls = pmid => ({
  pubmed: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
});
