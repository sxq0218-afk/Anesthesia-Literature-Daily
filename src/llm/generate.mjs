import { callModel } from "./adapters.mjs";
import { loadAISettings, providerCatalog, publicAISettings, saveAISettings } from "./config-store.mjs";
import { assertWithinDailyLimits, estimateCost, getUsageStats, priceFor, recordAIError, recordAIUsage } from "./usage-store.mjs";

function providerConfiguration(settings, rootDir) {
  const preset = providerCatalog(rootDir).find(item => item.id === settings.provider);
  if (!preset) throw Object.assign(new Error("当前AI服务商配置无效"), { code: "UNSUPPORTED_PROVIDER" });
  return { ...settings, format: preset.format };
}

export function friendlyAIError(error) {
  const messages = {
    MISSING_API_KEY: "尚未配置API Key",
    AUTH_ERROR: "API Key无效或无权访问该模型",
    INSUFFICIENT_BALANCE: "AI账户余额不足",
    RATE_LIMIT: "AI服务请求过于频繁，请稍后再试",
    NETWORK_TIMEOUT: "连接AI服务超时",
    NETWORK_ERROR: "无法连接AI服务，请检查网络和Base URL",
    INVALID_RESPONSE: "AI返回格式错误",
    EMPTY_RESPONSE: "AI未返回内容",
    DAILY_CALL_LIMIT: "已达到每日AI调用次数上限",
    DAILY_TOKEN_LIMIT: "已达到每日Token上限",
  };
  return messages[error.code] || error.message || "AI调用失败";
}

export function createAIService({ rootDir = process.cwd(), env, settings: suppliedSettings } = {}) {
  const settings = suppliedSettings || loadAISettings(rootDir, env);
  const config = providerConfiguration(settings, rootDir);

  async function generateAI({ system, user, temperature = config.temperature ?? 0.1, maxTokens = config.maxTokens ?? 5000, task = "general" }) {
    const startedAt = Date.now();
    try {
      if (!config.apiKey) throw Object.assign(new Error("API Key is not configured"), { code: "MISSING_API_KEY" });
      if (String(user || "").length > (config.maxInputChars || 60000)) throw Object.assign(new Error("单次AI输入超过安全长度上限"), { code: "INPUT_TOO_LARGE" });
      maxTokens = Math.min(Number(maxTokens), Number(config.maxTokens || maxTokens));
      assertWithinDailyLimits(config, rootDir, maxTokens);
      const result = await callModel(config, { system, user, temperature, maxTokens });
      const promptTokens = Number(result.usage?.prompt_tokens || 0);
      const completionTokens = Number(result.usage?.completion_tokens || 0);
      const totalTokens = Number(result.usage?.total_tokens || promptTokens + completionTokens);
      const estimatedCostCny = estimateCost({ provider: config.provider, model: result.model || config.model, promptTokens, completionTokens }, rootDir);
      recordAIUsage({ provider: config.provider, model: result.model || config.model, task, status: "success", promptTokens, completionTokens, totalTokens, estimatedCostCny, latencyMs: Date.now() - startedAt }, rootDir);
      return { ...result, usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens }, latencyMs: Date.now() - startedAt };
    } catch (error) {
      const safeMessage = friendlyAIError(error);
      recordAIUsage({ provider: config.provider, model: config.model, task, status: "error", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCny: 0, latencyMs: Date.now() - startedAt, errorCode: error.code || "UNKNOWN" }, rootDir);
      recordAIError({ provider: config.provider, model: config.model, task, code: error.code || "UNKNOWN", message: safeMessage }, rootDir);
      throw Object.assign(new Error(safeMessage), { code: error.code || "AI_ERROR" });
    }
  }

  return { config, generateAI };
}

export async function testAIConnection(options = {}) {
  const service = createAIService(options);
  const response = await service.generateAI({
    system: "You are a connectivity test. Return JSON only.",
    user: "Return exactly this JSON object: {\"status\":\"ok\"}",
    temperature: 0,
    maxTokens: 64,
    task: "connection-test",
  });
  return {
    success: response.data?.status === "ok",
    provider: service.config.provider,
    model: response.model || service.config.model,
    latencyMs: response.latencyMs,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      exact: Boolean(response.usage?.total_tokens),
    },
  };
}

export function getAIAdminSnapshot(rootDir = process.cwd(), env) {
  const settings = loadAISettings(rootDir, env);
  return {
    settings: publicAISettings(settings),
    providers: providerCatalog(rootDir),
    usage: getUsageStats(rootDir),
    pricing: priceFor(settings, rootDir),
  };
}

export { loadAISettings, publicAISettings, saveAISettings };
