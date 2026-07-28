import { fetchJson, fetchText } from "../lib/http.mjs";
import { eligibleJournalEntries } from "./journal-metrics.mjs";

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

function journalQuery(topicConfig, journals) {
  const journalExpression = [...new Set(journals)]
    .map(journal => `"${journal.replaceAll('"', '')}"[Journal]`)
    .join(" OR ");
  return `${buildPubMedQuery(topicConfig)} AND (${journalExpression})`;
}

export function buildEligibleJournalQuery(topicConfig, journalMetricConfig) {
  const journals = eligibleJournalEntries(journalMetricConfig)
    .flatMap(entry => [entry.name, ...(entry.aliases || [])]);
  if (!journals.length) throw new Error("No current Journal Impact Factor >5 journals are configured.");
  return journalQuery(topicConfig, journals);
}

async function searchOnce({ term, days, limit, offset = 0, env }) {
  const params = paramsWithIdentity({
    db: "pubmed",
    retmode: "json",
    retmax: String(limit),
    retstart: String(offset),
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

async function searchAll({ term, days, limit, pageSize, env }) {
  const ids = [];
  let count = 0;
  let queryTranslation = "";
  const size = Math.max(1, Math.min(Number(pageSize) || 200, 500));

  while (ids.length < limit) {
    const page = await searchOnce({
      term,
      days,
      limit: Math.min(size, limit - ids.length),
      offset: ids.length,
      env,
    });
    count = page.count;
    queryTranslation ||= page.queryTranslation;
    ids.push(...page.ids);
    if (!page.ids.length || ids.length >= count) break;
    await new Promise(resolve => setTimeout(resolve, env.NCBI_API_KEY ? 120 : 350));
  }

  return {
    ids: [...new Set(ids)],
    count,
    queryTranslation,
    complete: ids.length >= count,
    truncatedCount: Math.max(0, count - ids.length),
  };
}

export async function searchPubMed({
  topicConfig,
  journalMetricConfig,
  days,
  limit,
  pageSize = 200,
  auditLimit = 300,
  env,
}) {
  const baseQuery = buildPubMedQuery(topicConfig);
  const eligibleQuery = buildEligibleJournalQuery(topicConfig, journalMetricConfig);
  const [discovery, eligible] = await Promise.all([
    searchOnce({ term: baseQuery, days, limit: auditLimit, env }),
    searchAll({ term: eligibleQuery, days, limit, pageSize, env }),
  ]);
  return {
    ids: eligible.ids,
    auditIds: discovery.ids,
    count: discovery.count,
    priorityCount: eligible.count,
    retrievedCount: eligible.ids.length,
    complete: eligible.complete,
    truncatedCount: eligible.truncatedCount,
    queryTranslation: discovery.queryTranslation,
    priorityQueryTranslation: eligible.queryTranslation,
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

export async function fetchPubMedRecords({ ids, env, batchSize = 150 }) {
  if (!ids.length) return [];
  const records = [];
  const size = Math.max(1, Math.min(Number(batchSize) || 150, 200));
  for (let offset = 0; offset < ids.length; offset += size) {
    const params = paramsWithIdentity({
      db: "pubmed",
      id: ids.slice(offset, offset + size).join(","),
      rettype: "medline",
      retmode: "text",
    }, env);
    records.push(...parseMedline(await fetchText(`${BASE_URL}/efetch.fcgi?${params}`)));
    if (offset + size < ids.length) {
      await new Promise(resolve => setTimeout(resolve, env.NCBI_API_KEY ? 120 : 350));
    }
  }
  return records;
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
