import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../src/lib/env.mjs";
import { searchPubMed, fetchPubMedRecords, fetchPmcFullText } from "../src/literature/pubmed.mjs";
import { enrichPmc } from "../src/literature/pmc.mjs";
import { enrichFromCrossref } from "../src/literature/crossref.mjs";
import { deduplicate, formalPublicationHistory } from "../src/literature/dedupe.mjs";
import { scoreArticle } from "../src/literature/scoring.mjs";
import { screenByJournalImpactFactor } from "../src/literature/journal-metrics.mjs";
import { selectDailyArticles } from "../src/literature/selection.mjs";
import { metadataOnlyAnalysis, toWebArticle } from "../src/literature/transform.mjs";
import { readJson, writeJsonAtomic } from "../src/literature/storage.mjs";
import { createAIService, loadAISettings } from "../src/llm/index.mjs";
import { analyzeArticle } from "../src/llm/analyze.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const metadataOnly = args.has("--metadata-only");
const ignoreHistory = args.has("--ignore-history");
const force = args.has("--force");
const env = loadEnv(rootDir);

const files = {
  topics: path.join(rootDir, "config/topics.json"),
  journals: path.join(rootDir, "config/journals.json"),
  journalMetrics: path.join(rootDir, "config/journal-metrics.json"),
  scoring: path.join(rootDir, "config/scoring.json"),
  pushed: path.join(rootDir, "data/state/pushed.json"),
  publicationStatus: path.join(rootDir, "data/state/publication-status.json"),
  daily: path.join(rootDir, "data/generated/daily.json"),
  preview: path.join(rootDir, "data/generated/preview.json"),
  runs: path.join(rootDir, "data/runs"),
};

const [topicConfig, journalConfig, journalMetricConfig, storedScoringConfig, pushedState, publicationState, existingDaily] = await Promise.all([
  readJson(files.topics), readJson(files.journals), readJson(files.journalMetrics), readJson(files.scoring), readJson(files.pushed, { version: 2, records: [] }),
  readJson(files.publicationStatus, { version: 1, records: [] }),
  readJson(files.daily, null),
]);
const scoringConfig = {
  ...storedScoringConfig,
  candidateLimit: Number(env.DAILY_CANDIDATE_LIMIT || storedScoringConfig.candidateLimit),
  dailyLimit: Math.min(5, Number(env.DAILY_ARTICLE_COUNT || storedScoringConfig.dailyLimit)),
};

function shanghaiDate(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

if (!metadataOnly && !force && existingDaily?.mode === "production" && shanghaiDate(existingDaily.generatedAt) === shanghaiDate(new Date())) {
  console.log(JSON.stringify({ status: "already-published", generatedAt: existingDaily.generatedAt, articles: existingDaily.articles?.length || 0, message: "Today's production edition already exists; no API calls were made." }, null, 2));
  process.exit(0);
}

const aiSettings = loadAISettings(rootDir, env);
if (!metadataOnly && !aiSettings.apiKey) {
  throw new Error("Production analysis requires an API Key configured on the AI model settings page. Use --metadata-only for a real-source connectivity run.");
}

const history = ignoreHistory ? [] : formalPublicationHistory(pushedState.records || []);
async function retrieve(days) {
  const search = await searchPubMed({ topicConfig, journalConfig, days, limit: scoringConfig.candidateLimit, env });
  const records = await fetchPubMedRecords({ ids: search.ids, env });
  const unique = deduplicate(records, history, scoringConfig.titleSimilarityThreshold);
  return { search, records, unique };
}

console.log(`[1/6] Searching PubMed for the preferred ${scoringConfig.initialWindowDays}-day window...`);
let retrieval = await retrieve(scoringConfig.initialWindowDays);
const preferredWindowPmids = new Set(retrieval.unique.accepted.map(record => record.pmid));
let actualDays = scoringConfig.initialWindowDays;
let expanded = false;
function prepareSelection(currentRetrieval, preferredPmids = null) {
  const impactFactorScreening = screenByJournalImpactFactor(currentRetrieval.unique.accepted, journalMetricConfig);
  const scoredCandidates = impactFactorScreening.accepted
    .map(record => ({ ...record, preferredWindow: preferredPmids ? preferredPmids.has(record.pmid) : true }))
    .map(record => scoreArticle(record, { topicConfig, journalConfig, scoringConfig }))
    .filter(record => record.scoreBreakdown.relevance > 0 && record.score >= (scoringConfig.minimumSelectionScore || 0));
  return {
    ...selectDailyArticles(scoredCandidates, scoringConfig),
    journalImpactFactor: impactFactorScreening.summary,
  };
}

let selection = prepareSelection(retrieval);
const shouldExpandForComposition = scoringConfig.selectionPolicy?.expandForCompositionShortfall && !selection.compositionSatisfied;
const priorityJournalTarget = scoringConfig.selectionPolicy?.priorityJournalTarget ?? 0;
const shouldExpandForPriority = selection.summary.priorityJournals < priorityJournalTarget;
let expansionReason = null;
if (selection.journalImpactFactor.eligibleCount < scoringConfig.dailyLimit || shouldExpandForComposition || shouldExpandForPriority) {
  expanded = true;
  actualDays = scoringConfig.expandedWindowDays;
  expansionReason = shouldExpandForComposition
    ? "composition-shortfall"
    : shouldExpandForPriority ? "priority-journal-shortfall" : "article-count-shortfall";
  console.log(`[2/6] The preferred ${scoringConfig.initialWindowDays}-day set does not meet the configured count, composition, or priority-journal target; expanding to ${actualDays} days...`);
  retrieval = await retrieve(actualDays);
  selection = prepareSelection(retrieval, preferredWindowPmids);
} else {
  console.log(`[2/6] ${retrieval.unique.accepted.length} unseen articles satisfy the configured composition; no date expansion needed.`);
}

console.log("[3/6] Deduplicating and scoring candidates...");
const scored = selection.selected;

if (!scored.length) throw new Error(`No eligible PubMed articles found after deduplication, Journal Impact Factor > ${journalMetricConfig.minimumImpactFactor} screening, and scoring.`);

console.log(`[4/6] Enriching ${scored.length} articles with PMC and Crossref metadata...`);
let enriched = await enrichPmc(scored, env);
const crossrefEnriched = [];
for (const record of enriched) {
  crossrefEnriched.push(await enrichFromCrossref(record, env));
  await new Promise(resolve => setTimeout(resolve, 120));
}
enriched = crossrefEnriched;

const aiService = metadataOnly ? null : createAIService({ rootDir, env, settings: aiSettings });
const outputArticles = [];
const runDiagnostics = [];
const lifecycle = enriched.map(record => ({
  pmid: record.pmid,
  doi: record.doi,
  status: "candidate",
  transitions: [{ status: "candidate", at: new Date().toISOString() }],
}));
let totalUsage = { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };

function transition(pmid, status, detail = {}) {
  const item = lifecycle.find(record => record.pmid === pmid);
  if (!item) return;
  item.status = status;
  item.transitions.push({ status, at: new Date().toISOString(), ...detail });
}

function validateGeneratedArticle(article) {
  const required = [article.pmid, article.originalTitle, article.title, article.journal, article.conclusion, article.whyItMatters, article.studyType, article.analysisBasis, article.urls?.pubmed];
  if (required.some(value => !value)) throw new Error(`PMID ${article.pmid || "unknown"} generated page data is incomplete`);
  if (aiService && (article.analysisStatus !== "ai_complete" || !article.qualityPassed)) throw new Error(`PMID ${article.pmid} has not passed AI validation`);
  return article;
}

console.log(aiService ? `[5/6] Running ${aiService.config.provider}/${aiService.config.model} extraction, synthesis and quality control...` : "[5/6] AI key unavailable: producing a clearly marked metadata-only live preview...");
for (let index = 0; index < enriched.length; index += 1) {
  const record = enriched[index];
  try {
    const fullText = aiService && record.pmcLive ? await fetchPmcFullText({ pmcid: record.pmcid, env }) : null;
    const analysis = aiService
      ? await analyzeArticle({
          record,
          fullText,
          generateAI: aiService.generateAI,
          maxInputChars: aiService.config.maxInputChars,
        })
      : metadataOnlyAnalysis(record);
    if (aiService) transition(record.pmid, "analyzed", { model: analysis.model, basis: analysis.basis });
    totalUsage = {
      calls: totalUsage.calls + Number(analysis.usage.calls || 0),
      promptTokens: totalUsage.promptTokens + analysis.usage.promptTokens,
      completionTokens: totalUsage.completionTokens + analysis.usage.completionTokens,
      totalTokens: totalUsage.totalTokens + analysis.usage.totalTokens,
    };
    const webArticle = validateGeneratedArticle(toWebArticle(record, analysis, outputArticles.length));
    outputArticles.push(webArticle);
    if (aiService) transition(record.pmid, "validated", { qualityPassed: true });
    runDiagnostics.push({ pmid: record.pmid, status: "ok", model: analysis.model, basis: analysis.basis, qualityPassed: analysis.quality?.overall_pass ?? false });
  } catch (error) {
    transition(record.pmid, "failed", { error: error.message });
    runDiagnostics.push({ pmid: record.pmid, status: "failed", error: error.message });
    console.error(`  PMID ${record.pmid} failed: ${error.message}`);
    if (aiService) break;
  }
}

const now = new Date();
const to = now.toISOString();
const from = new Date(now.getTime() - actualDays * 86400000).toISOString();
const runId = to.replaceAll(":", "-");
const runFile = path.join(files.runs, `${runId}.json`);
const searchSummary = {
  initialDays: scoringConfig.initialWindowDays,
  actualDays,
  expanded,
  expansionReason,
  from,
  to,
  candidateCount: retrieval.records.length,
  unseenCount: retrieval.unique.accepted.length,
  duplicateCount: retrieval.unique.removed.length,
  queryTranslation: retrieval.search.queryTranslation,
  priorityQueryTranslation: retrieval.search.priorityQueryTranslation,
  priorityCandidateCount: retrieval.search.priorityCount,
  journalImpactFactor: selection.journalImpactFactor,
  selectionPolicy: scoringConfig.selectionPolicy,
  selectionSummary: selection.summary,
  compositionSatisfied: selection.compositionSatisfied,
};

async function saveLifecycle(records) {
  await writeJsonAtomic(files.publicationStatus, {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: [...(publicationState.records || []), ...records.map(record => ({ ...record, runId }))],
  });
}

if (aiService && (runDiagnostics.some(item => item.status === "failed") || outputArticles.length !== enriched.length)) {
  await writeJsonAtomic(runFile, {
    generatedAt: to,
    mode: "failed",
    search: searchSummary,
    llm: { provider: aiService.config.provider, model: aiService.config.model, usage: totalUsage },
    articles: outputArticles,
    diagnostics: runDiagnostics,
    lifecycle,
    published: false,
  });
  await saveLifecycle(lifecycle);
  throw new Error("Production run failed AI analysis or validation; previous published edition was preserved.");
}

if (!outputArticles.length) throw new Error("No selected article completed processing.");

const daily = {
  generatedAt: to,
  mode: aiService ? "production" : "live-metadata-preview",
  search: searchSummary,
  llm: {
    provider: aiService ? aiService.config.provider : null,
    model: aiService ? ([...new Set(outputArticles.map(article => article.aiModel).filter(Boolean))][0] || aiService.config.model) : null,
    configuredModel: aiService ? aiService.config.model : null,
    usage: totalUsage,
  },
  articles: outputArticles,
};

if (!aiService) {
  console.log("[6/6] Writing a metadata preview without changing formal publication history...");
  await writeJsonAtomic(files.preview, daily);
  await writeJsonAtomic(runFile, { ...daily, diagnostics: runDiagnostics, lifecycle, published: false });
} else {
  console.log("[6/6] Publishing the validated edition and formal delivery history...");
  const oldDaily = existingDaily;
  const oldPushed = pushedState;
  const oldPublicationState = publicationState;
  const nextRecords = [...(pushedState.records || [])];
  for (const article of outputArticles) {
    if (!nextRecords.some(item => item.pmid === article.pmid)) {
      nextRecords.push({ pmid: article.pmid, doi: article.doi, title: article.originalTitle, status: "published", runId, firstPublishedAt: to });
    }
  }
  lifecycle.forEach(item => transition(item.pmid, "published", { runId }));
  try {
    await writeJsonAtomic(files.daily, daily);
    const verification = await readJson(files.daily, null);
    if (verification?.mode !== "production" || verification.articles?.length !== outputArticles.length || verification.articles.some(article => !article.qualityPassed)) {
      throw new Error("Published page data verification failed");
    }
    await writeJsonAtomic(files.pushed, { version: 2, updatedAt: to, records: nextRecords });
    await writeJsonAtomic(files.publicationStatus, { version: 1, updatedAt: to, records: [...(oldPublicationState.records || []), ...lifecycle.map(record => ({ ...record, runId }))] });
    await writeJsonAtomic(runFile, { ...daily, diagnostics: runDiagnostics, lifecycle, published: true });
  } catch (error) {
    if (oldDaily) await writeJsonAtomic(files.daily, oldDaily);
    await writeJsonAtomic(files.pushed, oldPushed);
    await writeJsonAtomic(files.publicationStatus, oldPublicationState);
    throw new Error(`Publication transaction failed and was rolled back: ${error.message}`);
  }
}

console.log(JSON.stringify({
  status: aiService ? "published" : "preview",
  generatedAt: to,
  mode: daily.mode,
  actualDays,
  expanded,
  candidates: retrieval.records.length,
  duplicatesRemoved: retrieval.unique.removed.length,
  composition: selection.summary,
  compositionSatisfied: selection.compositionSatisfied,
  articles: outputArticles.map(article => ({ pmid: article.pmid, doi: article.doi, score: article.score, impactFactor: article.journalMetric?.impactFactor, researchCategory: article.researchCategory, journalTier: article.journalTier, title: article.originalTitle })),
  llm: daily.llm,
  lifecycle: lifecycle.map(item => ({ pmid: item.pmid, status: item.status })),
  runFile,
}, null, 2));
