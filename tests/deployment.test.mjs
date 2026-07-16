import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));

test("public edition contains only validated real articles", async () => {
  const latest = await readJson("public/data/latest.json");
  assert.equal(latest.mode, "production");
  assert.ok(latest.articles.length > 0 && latest.articles.length <= 5);
  assert.ok(latest.articles.every(article => article.sourceType === "real" && article.analysisStatus === "ai_complete" && article.qualityPassed));
  assert.ok(latest.articles.every(article => !Object.hasOwn(article, "abstract")));
});

test("archive, latest state and RSS agree on the edition", async () => {
  const latest = await readJson("data/state/latest.json");
  const archive = await readJson("data/generated/editions.json");
  const rss = await fs.readFile(path.join(root, "public/rss.xml"), "utf8");
  assert.equal(archive.editions[0].generatedAt, latest.generatedAt);
  assert.match(rss, /<rss version="2\.0">/);
  assert.match(rss, new RegExp(latest.date));
});

test("public pages use no overseas public CDN", async () => {
  const files = ["app/globals.css", "app/layout.tsx", "app/components.tsx"];
  const source = (await Promise.all(files.map(file => fs.readFile(path.join(root, file), "utf8")))).join("\n");
  for (const host of ["fonts.googleapis.com", "fonts.gstatic.com", "unpkg.com", "jsdelivr.net", "cdnjs.cloudflare.com", "google-analytics.com"]) assert.equal(source.includes(host), false);
});
