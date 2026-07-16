import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJsonAtomic } from "../src/literature/storage.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pushedFile = path.join(rootDir, "data/state/pushed.json");
const legacyFile = path.join(rootDir, "data/state/legacy-metadata-only.json");
const runsDir = path.join(rootDir, "data/runs");
const pushed = await readJson(pushedFile, { version: 2, records: [] });
const runFiles = (await fs.readdir(runsDir)).filter(file => file.endsWith(".json"));
const runs = await Promise.all(runFiles.map(async file => ({ file, data: await readJson(path.join(runsDir, file), {}) })));

const published = [];
const metadataOnly = [];
for (const record of pushed.records || []) {
  const matchingRuns = runs.filter(run => run.data.articles?.some(article => article.pmid === record.pmid));
  const verifiedRun = matchingRuns.find(run => run.data.mode === "production" && run.data.diagnostics?.some(item => item.pmid === record.pmid && item.status === "ok" && item.qualityPassed));
  if (verifiedRun) published.push({ ...record, status: "published", runId: verifiedRun.file.replace(/\.json$/, "") });
  else metadataOnly.push({ ...record, status: "candidate", migratedAt: new Date().toISOString(), reason: "metadata-only run without completed AI validation", sourceRuns: matchingRuns.map(run => run.file) });
}

await writeJsonAtomic(legacyFile, { version: 1, migratedAt: new Date().toISOString(), records: metadataOnly });
await writeJsonAtomic(pushedFile, { version: 2, updatedAt: new Date().toISOString(), records: published });
console.log(JSON.stringify({ previous: pushed.records?.length || 0, retainedPublished: published.length, migratedCandidates: metadataOnly.length, legacyFile }, null, 2));
