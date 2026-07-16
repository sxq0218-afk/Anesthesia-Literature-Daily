import fs from "node:fs";
import path from "node:path";

function readPricing(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "config/model-pricing.json"), "utf8"));
}

export function priceFor({ provider, model }, rootDir = process.cwd()) {
  const config = readPricing(rootDir);
  const exact = config.models.find(item => item.provider === provider && item.model.toLowerCase() === model.toLowerCase());
  const providerFallback = config.models.find(item => item.provider === provider);
  return { ...(exact || providerFallback || config.fallback), currency: config.currency, notice: config.notice };
}

export function estimateCost({ provider, model, promptTokens = 0, completionTokens = 0 }, rootDir = process.cwd()) {
  const price = priceFor({ provider, model }, rootDir);
  return Number((((promptTokens * price.input) + (completionTokens * price.output)) / 1000000).toFixed(6));
}

function appendJsonLine(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(payload)}\n`, "utf8");
}

function localDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function monthKey(value = new Date()) {
  return localDateKey(value).slice(0, 7);
}

export function recordAIUsage(entry, rootDir = process.cwd()) {
  const timestamp = entry.timestamp || new Date().toISOString();
  appendJsonLine(path.join(rootDir, `data/ai/usage/${monthKey(new Date(timestamp))}.jsonl`), { ...entry, timestamp });
}

export function recordAIError(entry, rootDir = process.cwd()) {
  appendJsonLine(path.join(rootDir, "data/logs/ai-errors.jsonl"), { ...entry, timestamp: entry.timestamp || new Date().toISOString() });
}

function readMonthEntries(rootDir, month) {
  const file = path.join(rootDir, `data/ai/usage/${month}.jsonl`);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function summarize(entries, rootDir) {
  return entries.reduce((total, item) => ({
    calls: total.calls + 1,
    successfulCalls: total.successfulCalls + (item.status === "success" ? 1 : 0),
    failedCalls: total.failedCalls + (item.status === "error" ? 1 : 0),
    promptTokens: total.promptTokens + Number(item.promptTokens || 0),
    completionTokens: total.completionTokens + Number(item.completionTokens || 0),
    totalTokens: total.totalTokens + Number(item.totalTokens || 0),
    estimatedCostCny: Number((total.estimatedCostCny + (Number(item.estimatedCostCny || 0) || estimateCost({ provider: item.provider, model: item.model, promptTokens: item.promptTokens, completionTokens: item.completionTokens }, rootDir))).toFixed(6)),
  }), { calls: 0, successfulCalls: 0, failedCalls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCny: 0 });
}

export function getUsageStats(rootDir = process.cwd(), now = new Date()) {
  const month = monthKey(now);
  const todayKey = localDateKey(now);
  const entries = readMonthEntries(rootDir, month);
  return {
    generatedAt: new Date().toISOString(),
    today: summarize(entries.filter(item => item.timestamp && localDateKey(new Date(item.timestamp)) === todayKey), rootDir),
    month: summarize(entries, rootDir),
    recent: entries.slice(-20).reverse(),
  };
}

export function assertWithinDailyLimits(settings, rootDir = process.cwd(), requestedMaxTokens = 0) {
  const today = getUsageStats(rootDir).today;
  if (today.calls >= settings.dailyCallLimit) throw Object.assign(new Error("已达到每日AI调用次数上限"), { code: "DAILY_CALL_LIMIT" });
  if (today.totalTokens >= settings.dailyTokenLimit || today.totalTokens + requestedMaxTokens > settings.dailyTokenLimit) {
    throw Object.assign(new Error("已达到或即将超过每日Token上限"), { code: "DAILY_TOKEN_LIMIT" });
  }
  return today;
}
