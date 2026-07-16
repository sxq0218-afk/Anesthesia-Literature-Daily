import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../lib/env.mjs";

const DEFAULT_LIMITS = { dailyCallLimit: 30, dailyTokenLimit: 500000, maxInputChars: 60000 };
const DEFAULT_MODEL_OPTIONS = { temperature: 0.1, maxTokens: 5000, timeoutMs: 90000, retryCount: 1 };

function ensurePrivateDirectory(rootDir) {
  const directory = path.join(rootDir, "data/private");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

function loadProviders(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "config/ai-providers.json"), "utf8"));
}

function masterSecret(rootDir, env) {
  if (env.AI_CONFIG_MASTER_KEY) return env.AI_CONFIG_MASTER_KEY;
  const file = path.join(ensurePrivateDirectory(rootDir), ".ai-master-key");
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString("base64url"), { mode: 0o600 });
  return fs.readFileSync(file, "utf8").trim();
}

function encryptionKey(rootDir, env) {
  return crypto.createHash("sha256").update(masterSecret(rootDir, env)).digest();
}

function encrypt(payload, rootDir, env) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(rootDir, env), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}

function decrypt(envelope, rootDir, env) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(rootDir, env), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8"));
}

function fallbackSettings(rootDir, env) {
  const catalog = loadProviders(rootDir);
  const providerId = (env.AI_PROVIDER || env.LLM_PROVIDER || "deepseek").toLowerCase();
  const preset = catalog.providers.find(item => item.id === providerId) || catalog.providers[0];
  const legacyKey = providerId === "deepseek" ? env.DEEPSEEK_API_KEY : null;
  const legacyBaseUrl = providerId === "deepseek" ? env.DEEPSEEK_BASE_URL : null;
  const legacyModel = providerId === "deepseek" ? env.DEEPSEEK_MODEL : null;
  return {
    provider: preset.id,
    baseUrl: env.AI_BASE_URL || legacyBaseUrl || preset.defaultBaseUrl,
    apiKey: env.AI_API_KEY || legacyKey || "",
    model: env.AI_MODEL || legacyModel || preset.defaultModel,
    dailyCallLimit: Number(env.DAILY_AI_CALL_LIMIT || DEFAULT_LIMITS.dailyCallLimit),
    dailyTokenLimit: Number(env.DAILY_TOKEN_LIMIT || DEFAULT_LIMITS.dailyTokenLimit),
    maxInputChars: Number(env.DAILY_MAX_INPUT_CHARS || DEFAULT_LIMITS.maxInputChars),
    temperature: Number(env.AI_TEMPERATURE || DEFAULT_MODEL_OPTIONS.temperature),
    maxTokens: Number(env.AI_MAX_TOKENS || DEFAULT_MODEL_OPTIONS.maxTokens),
    timeoutMs: Number(env.AI_TIMEOUT || DEFAULT_MODEL_OPTIONS.timeoutMs),
    retryCount: Number(env.AI_RETRY_COUNT || DEFAULT_MODEL_OPTIONS.retryCount),
    updatedAt: null,
  };
}

export function loadAISettings(rootDir = process.cwd(), suppliedEnv) {
  const env = suppliedEnv || loadEnv(rootDir);
  const file = path.join(rootDir, "data/private/ai-config.enc.json");
  if (!fs.existsSync(file)) return fallbackSettings(rootDir, env);
  try {
    return { ...fallbackSettings(rootDir, env), ...decrypt(JSON.parse(fs.readFileSync(file, "utf8")), rootDir, env) };
  } catch (error) {
    throw new Error(`AI配置无法解密：${error.message}`);
  }
}

export function saveAISettings(update, rootDir = process.cwd(), suppliedEnv) {
  const env = suppliedEnv || loadEnv(rootDir);
  const current = loadAISettings(rootDir, env);
  const catalog = loadProviders(rootDir);
  const preset = catalog.providers.find(item => item.id === update.provider);
  if (!preset) throw new Error("不支持的AI服务商");
  const baseUrl = String(update.baseUrl || preset.defaultBaseUrl).trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(baseUrl)) throw new Error("API Base URL 必须以 http:// 或 https:// 开头");
  const model = String(update.model || "").trim();
  if (!model) throw new Error("模型名称不能为空");
  const dailyCallLimit = Number(update.dailyCallLimit ?? current.dailyCallLimit);
  const dailyTokenLimit = Number(update.dailyTokenLimit ?? current.dailyTokenLimit);
  const temperature = Number(update.temperature ?? current.temperature);
  const maxTokens = Number(update.maxTokens ?? current.maxTokens);
  const timeoutMs = Number(update.timeoutMs ?? current.timeoutMs);
  const retryCount = Number(update.retryCount ?? current.retryCount);
  const maxInputChars = Number(update.maxInputChars ?? current.maxInputChars);
  if (!Number.isInteger(dailyCallLimit) || dailyCallLimit < 1) throw new Error("每日调用次数必须是大于0的整数");
  if (!Number.isInteger(dailyTokenLimit) || dailyTokenLimit < 1000) throw new Error("每日Token上限不能低于1000");
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) throw new Error("temperature 必须在0到2之间");
  if (!Number.isInteger(maxTokens) || maxTokens < 64) throw new Error("max tokens 不能低于64");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000) throw new Error("timeout 不能低于1000毫秒");
  if (!Number.isInteger(retryCount) || retryCount < 0 || retryCount > 5) throw new Error("重试次数必须在0到5之间");
  if (!Number.isInteger(maxInputChars) || maxInputChars < 1000) throw new Error("单次最大输入长度不能低于1000字符");
  const settings = {
    provider: preset.id,
    baseUrl,
    apiKey: String(update.apiKey || "").trim() || current.apiKey,
    model,
    dailyCallLimit,
    dailyTokenLimit,
    temperature,
    maxTokens,
    timeoutMs,
    retryCount,
    maxInputChars,
    updatedAt: new Date().toISOString(),
  };
  const file = path.join(ensurePrivateDirectory(rootDir), "ai-config.enc.json");
  fs.writeFileSync(file, `${JSON.stringify(encrypt(settings, rootDir, env), null, 2)}\n`, { mode: 0o600 });
  return settings;
}

export function maskApiKey(apiKey = "") {
  if (!apiKey) return "未配置";
  if (apiKey.length <= 8) return `${apiKey.slice(0, 2)}******`;
  return `${apiKey.slice(0, 4)}******${apiKey.slice(-4)}`;
}

export function publicAISettings(settings) {
  const { apiKey, ...safe } = settings;
  return { ...safe, hasApiKey: Boolean(apiKey), maskedApiKey: maskApiKey(apiKey) };
}

export function providerCatalog(rootDir = process.cwd()) {
  return loadProviders(rootDir).providers;
}
