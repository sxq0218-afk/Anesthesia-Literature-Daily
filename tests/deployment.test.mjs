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

test("production admin routes contain only the static not-found response", async () => {
  for (const file of ["out/admin/ai/index.html", "out/admin/ai-usage/index.html"]) {
    const html = await fs.readFile(path.join(root, file), "utf8");
    assert.match(html, /id="__next_error__"/);
    assert.match(html, /NEXT_HTTP_ERROR_FALLBACK;404/);
    assert.doesNotMatch(html, /API Base URL|每日成本限制|最近调用记录|deepseek/i);
  }
});

test("scheduled email workflow persists a validated edition before delivery", async () => {
  const workflow = await fs.readFile(path.join(root, ".github/workflows/daily-email.yml"), "utf8");
  const prepare = workflow.indexOf("npm run publication:prepare");
  const persist = workflow.indexOf("保存并推送已验证期次");
  const send = workflow.indexOf("npm run email:send-daily");
  assert.ok(prepare >= 0 && persist > prepare && send > persist);
  assert.match(workflow, /cron: "37 0 \* \* \*"/);
  assert.match(workflow, /concurrency:[\s\S]*cancel-in-progress: false/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
});

test("deep-reading preview is isolated and cannot deliver email or write repository content", async () => {
  const workflow = await fs.readFile(path.join(root, ".github/workflows/deep-reading-preview.yml"), "utf8");
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /LITERATURE_DATA_ROOT: data\/sandbox/);
  assert.match(workflow, /DAILY_MAX_CANDIDATES:.*2000/);
  assert.doesNotMatch(workflow, /DAILY_CANDIDATE_LIMIT/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /email:send-daily|git push|contents: write/);
});
