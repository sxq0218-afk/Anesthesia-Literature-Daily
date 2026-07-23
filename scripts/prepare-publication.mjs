import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../src/lib/env.mjs";
import { readJson, writeJsonAtomic } from "../src/literature/storage.mjs";
import { estimateCost } from "../src/llm/usage-store.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = loadEnv(rootDir);
const generatedDir = path.join(rootDir, "data/generated");
const publicDataDir = path.join(rootDir, "public/data");

function shanghaiDate(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function withoutPrivateBuildFields(edition) {
  const search = { ...edition.search };
  delete search.queryTranslation;
  delete search.priorityQueryTranslation;
  return {
    ...edition,
    search,
    articles: edition.articles.map(article => {
      const clean = { ...article };
      delete clean.abstract;
      delete clean.meshTerms;
      return clean;
    }),
  };
}

function assertPublishable(edition) {
  if (edition?.mode !== "production") throw new Error("Only a real production edition can be published.");
  if (!edition.generatedAt || !edition.articles?.length) throw new Error("Production edition is incomplete.");
  if (edition.articles.length > 5) throw new Error("A public edition cannot contain more than five articles.");
  if (edition.articles.some(article => article.analysisStatus !== "ai_complete" || !article.qualityPassed || article.sourceType !== "real")) {
    throw new Error("Every public article must be real, AI-complete and quality validated.");
  }
}

function xml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function normalizeSiteUrl(value) {
  return String(value || "http://localhost:3000").replace(/\/$/, "");
}

function buildRss(editions, siteUrl) {
  const items = editions.map(edition => {
    const date = shanghaiDate(edition.generatedAt);
    const articleLines = edition.articles.map(article => `${article.title}：${article.conclusion}`).join("\n");
    return `<item>
      <title>${xml(`${date} 每日麻醉文献精读（${edition.articles.length}篇）`)}</title>
      <link>${xml(`${siteUrl}/archive/${date}/`)}</link>
      <guid isPermaLink="true">${xml(`${siteUrl}/archive/${date}/`)}</guid>
      <pubDate>${new Date(edition.generatedAt).toUTCString()}</pubDate>
      <description>${xml(articleLines)}</description>
    </item>`;
  }).join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>每日麻醉文献精读</title>
    <link>${xml(siteUrl)}</link>
    <description>每天精选最多5篇真实麻醉学相关文献，提供结构化中文精读。</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date(editions[0].generatedAt).toUTCString()}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${xml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>
`;
}

const daily = await readJson(path.join(generatedDir, "daily.json"), null);
assertPublishable(daily);
const publicEdition = withoutPrivateBuildFields(daily);
const date = shanghaiDate(daily.generatedAt);
await writeJsonAtomic(path.join(generatedDir, `${date}.json`), publicEdition);

const files = (await fs.readdir(generatedDir)).filter(file => /^\d{4}-\d{2}-\d{2}\.json$/.test(file));
const editions = [];
for (const file of files) {
  const edition = await readJson(path.join(generatedDir, file), null);
  if (edition?.mode === "production") editions.push(withoutPrivateBuildFields(edition));
}
editions.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

// Keep publication output deterministic for same-edition retries. Otherwise a
// manual rerun changes updatedAt and creates a needless deployment commit.
const editionBundle = { version: 1, updatedAt: editions[0]?.generatedAt || daily.generatedAt, editions };
await writeJsonAtomic(path.join(generatedDir, "editions.json"), editionBundle);
await writeJsonAtomic(path.join(rootDir, "data/state/latest.json"), { version: 1, date, generatedAt: daily.generatedAt, path: `/archive/${date}/`, articleCount: daily.articles.length });

const byMonth = new Map();
for (const edition of editions) {
  const day = shanghaiDate(edition.generatedAt);
  const month = day.slice(0, 7);
  const usage = edition.llm?.usage || { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const callsAvailable = Number.isFinite(Number(usage.calls)) && Number(usage.calls) > 0;
  const calls = callsAvailable ? Number(usage.calls) : 0;
  const cost = estimateCost({ provider: edition.llm?.provider, model: edition.llm?.model, ...usage }, rootDir);
  const current = byMonth.get(month) || { version: 1, month, calls: 0, callsComplete: true, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCny: 0, days: [] };
  current.calls += calls;
  current.callsComplete &&= callsAvailable;
  current.promptTokens += usage.promptTokens || 0;
  current.completionTokens += usage.completionTokens || 0;
  current.totalTokens += usage.totalTokens || 0;
  current.estimatedCostCny = Number((current.estimatedCostCny + cost).toFixed(6));
  current.days.push({ date: day, model: edition.llm?.model || null, calls: callsAvailable ? calls : null, callCountSource: callsAvailable ? "api-call-records" : "unavailable", promptTokens: usage.promptTokens || 0, completionTokens: usage.completionTokens || 0, totalTokens: usage.totalTokens || 0, estimatedCostCny: cost, tokenSource: "api-exact", costSource: "configured-estimate" });
  byMonth.set(month, current);
}
for (const [month, summary] of byMonth) await writeJsonAtomic(path.join(rootDir, `data/usage/${month}.json`), summary);

await fs.mkdir(publicDataDir, { recursive: true });
await writeJsonAtomic(path.join(publicDataDir, "latest.json"), publicEdition);
await writeJsonAtomic(path.join(publicDataDir, "archive.json"), { version: 1, updatedAt: editionBundle.updatedAt, editions: editions.map(edition => ({ generatedAt: edition.generatedAt, search: edition.search, articles: edition.articles.map(article => ({ slug: article.slug, title: article.title, originalTitle: article.originalTitle, journal: article.journal, conclusion: article.conclusion, pmid: article.pmid })) })) });
for (const edition of editions) await writeJsonAtomic(path.join(publicDataDir, `${shanghaiDate(edition.generatedAt)}.json`), edition);

const siteUrl = normalizeSiteUrl(env.SITE_URL);
if (env.DEPLOY_ENV === "production" && (!env.SITE_URL || !/^https:\/\//.test(env.SITE_URL))) throw new Error("Production publication requires an HTTPS SITE_URL.");
await fs.writeFile(path.join(rootDir, "public/rss.xml"), buildRss(editions, siteUrl), "utf8");
await writeJsonAtomic(path.join(rootDir, "data/logs/latest-public-summary.json"), {
  generatedAt: daily.generatedAt,
  date,
  status: "ready-for-deployment",
  articleCount: daily.articles.length,
  candidateCount: daily.search.candidateCount,
  expanded: daily.search.expanded,
  actualDays: daily.search.actualDays,
  model: daily.llm?.model || null,
  totalTokens: daily.llm?.usage?.totalTokens || 0,
  tokenSource: "api-exact",
  costSource: "configured-estimate",
  rss: `${siteUrl}/rss.xml`,
});

console.log(JSON.stringify({ status: "prepared", date, editions: editions.length, articles: daily.articles.length, rss: `${siteUrl}/rss.xml` }, null, 2));
