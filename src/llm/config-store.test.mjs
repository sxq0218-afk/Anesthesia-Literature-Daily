import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAIService } from "./generate.mjs";
import { loadAISettings, publicAISettings, saveAISettings } from "./config-store.mjs";
import { getUsageStats } from "./usage-store.mjs";

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anesthesia-ai-"));
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  for (const file of ["ai-providers.json", "model-pricing.json"]) fs.copyFileSync(new URL(`../../config/${file}`, import.meta.url), path.join(root, "config", file));
  return root;
}

test("encrypts API keys at rest and exposes only a mask", () => {
  const root = fixtureRoot();
  const env = { AI_CONFIG_MASTER_KEY: "test-master-secret" };
  saveAISettings({ provider: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", apiKey: "sk-secret-1234abcd", dailyCallLimit: 20, dailyTokenLimit: 100000 }, root, env);
  const raw = fs.readFileSync(path.join(root, "data/private/ai-config.enc.json"), "utf8");
  assert.equal(raw.includes("sk-secret-1234abcd"), false);
  const loaded = loadAISettings(root, env);
  assert.equal(loaded.apiKey, "sk-secret-1234abcd");
  assert.equal(publicAISettings(loaded).maskedApiKey, "sk-s******abcd");
});

test("generateAI uses the configured adapter and records tokens and cost", async () => {
  const root = fixtureRoot();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ model: "deepseek-chat", choices: [{ message: { content: "{\"status\":\"ok\"}" } }], usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 } }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const service = createAIService({ rootDir: root, settings: { provider: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", apiKey: "test", dailyCallLimit: 5, dailyTokenLimit: 10000 } });
    const result = await service.generateAI({ system: "JSON", user: "test", maxTokens: 100, task: "unit-test" });
    assert.equal(result.data.status, "ok");
    const stats = getUsageStats(root);
    assert.equal(stats.today.calls, 1);
    assert.equal(stats.today.totalTokens, 16);
    assert.ok(stats.today.estimatedCostCny > 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("daily call limit stops additional AI requests without crashing", async () => {
  const root = fixtureRoot();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }), { status: 200 });
  try {
    const service = createAIService({ rootDir: root, settings: { provider: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", apiKey: "test", dailyCallLimit: 1, dailyTokenLimit: 10000 } });
    await service.generateAI({ system: "JSON", user: "one", maxTokens: 10 });
    await assert.rejects(() => service.generateAI({ system: "JSON", user: "two", maxTokens: 10 }), /每日AI调用次数上限/);
    assert.equal(getUsageStats(root).today.failedCalls, 1);
  } finally { globalThis.fetch = originalFetch; }
});
