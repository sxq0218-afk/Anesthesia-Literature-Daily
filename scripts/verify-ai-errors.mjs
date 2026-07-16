import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAIService, loadAISettings } from "../src/llm/index.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const current = loadAISettings(rootDir);

async function verify(label, settings) {
  try {
    const service = createAIService({ rootDir, settings });
    await service.generateAI({ system: "Return JSON only.", user: "Return {\"status\":\"ok\"}", maxTokens: 32, task: `acceptance-${label}` });
    return { test: label, passed: false, error: "Unexpected success" };
  } catch (error) {
    return { test: label, passed: true, code: error.code, error: error.message };
  }
}

const results = [];
results.push(await verify("invalid-key", { ...current, apiKey: "acceptance-test-invalid-key" }));
results.push(await verify("invalid-model", { ...current, model: `invalid-model-${Date.now()}` }));
console.log(JSON.stringify(results, null, 2));
