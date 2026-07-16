import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../src/lib/env.mjs";
import { fetchPubMedRecords } from "../src/literature/pubmed.mjs";
import { readJson, writeJsonAtomic } from "../src/literature/storage.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dailyFile = path.join(rootDir, "data/generated/daily.json");
const daily = await readJson(dailyFile);
if (daily.mode !== "production") throw new Error("Only a production edition can be repaired.");
const records = await fetchPubMedRecords({ ids: daily.articles.map(article => article.pmid), env: loadEnv(rootDir) });
const byPmid = new Map(records.map(record => [record.pmid, record]));
const changes = [];
for (const article of daily.articles) {
  const source = byPmid.get(article.pmid);
  if (source?.publicationDate && source.publicationDate !== article.publishedDate) {
    changes.push({ pmid: article.pmid, from: article.publishedDate, to: source.publicationDate, electronicPublicationDate: source.electronicPublicationDate });
    article.publishedDate = source.publicationDate;
    article.year = source.publicationDate.slice(0, 4);
    article.electronicPublicationDate = source.electronicPublicationDate;
  }
}
const actualModels = [...new Set(daily.articles.map(article => article.aiModel).filter(Boolean))];
if (actualModels.length === 1 && daily.llm?.model !== actualModels[0]) {
  daily.llm.configuredModel = daily.llm.model;
  daily.llm.model = actualModels[0];
  changes.push({ field: "llm.model", from: daily.llm.configuredModel, to: daily.llm.model });
}
daily.metadataRepairedAt = new Date().toISOString();
await writeJsonAtomic(dailyFile, daily);
const runFile = path.join(rootDir, "data/runs", `${daily.generatedAt.replaceAll(":", "-")}.json`);
const run = await readJson(runFile, null);
if (run) {
  run.articles = daily.articles;
  run.metadataRepairedAt = daily.metadataRepairedAt;
  await writeJsonAtomic(runFile, run);
}
console.log(JSON.stringify({ repaired: changes.length, changes }, null, 2));
