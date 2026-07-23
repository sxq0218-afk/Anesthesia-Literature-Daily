import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the current anesthesia literature home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<meta[^>]*name="viewport"[^>]*width=device-width/i);
  assert.match(html, /<title>每日麻醉文献精读<\/title>/i);
  assert.match(html, /重要麻醉证据/);
  assert.match(html, /今日简报/);
  assert.match(html, /往期简报/);
  assert.match(html, /PubMed真实数据/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("does not retain the disposable starter preview", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /PubMed真实数据/);
  assert.match(page, /className="shell hero-grid"/);
  assert.match(layout, /lang="zh-CN"/);
  assert.doesNotMatch(`${page}\n${layout}\n${packageJson}`, /react-loading-skeleton|codex-preview|_sites-preview/i);
  const previewFiles = await readdir(new URL("app/_sites-preview", projectRoot)).catch(() => []);
  assert.deepEqual(previewFiles, []);
});
