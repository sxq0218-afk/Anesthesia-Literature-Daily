function stripCodeFence(value = "") {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function parseJsonContent(content, provider) {
  if (!content) throw Object.assign(new Error(`${provider} 返回了空内容`), { code: "EMPTY_RESPONSE" });
  try { return JSON.parse(stripCodeFence(content)); } catch {
    throw Object.assign(new Error(`${provider} 返回格式错误，未得到有效JSON`), { code: "INVALID_RESPONSE" });
  }
}

async function requestJson(url, options, { attempts = 2, timeoutMs = 90000, validateBody } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const text = await response.text();
      let body;
      try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 300) }; }
      if (!response.ok) {
        const message = body?.error?.message || body?.message || body?.raw || `HTTP ${response.status}`;
        const code = response.status === 401 || response.status === 403 ? "AUTH_ERROR"
          : response.status === 402 ? "INSUFFICIENT_BALANCE"
            : response.status === 429 ? "RATE_LIMIT" : response.status >= 500 ? "PROVIDER_ERROR" : "REQUEST_ERROR";
        throw Object.assign(new Error(message), { code, status: response.status, retryable: response.status === 429 || response.status >= 500 });
      }
      return validateBody ? validateBody(body) : body;
    } catch (error) {
      lastError = error.name === "AbortError" ? Object.assign(new Error("AI服务请求超时"), { code: "NETWORK_TIMEOUT", retryable: true }) : error;
      if (attempt < attempts && (lastError.retryable || !lastError.status)) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      else break;
    } finally { clearTimeout(timer); }
  }
  if (!lastError.code) lastError.code = "NETWORK_ERROR";
  throw lastError;
}

function endpoint(baseUrl, suffix) {
  return `${baseUrl.replace(/\/$/, "")}${suffix}`;
}

async function openAICompatible(config, request) {
  const { body, data } = await requestJson(endpoint(config.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }],
      response_format: { type: "json_object" },
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false,
    }),
  }, {
    attempts: Number(config.retryCount ?? 1) + 1,
    timeoutMs: Number(config.timeoutMs || 90000),
    validateBody: body => ({ body, data: parseJsonContent(body.choices?.[0]?.message?.content, config.provider) }),
  });
  return {
    data,
    usage: { prompt_tokens: body.usage?.prompt_tokens || 0, completion_tokens: body.usage?.completion_tokens || 0, total_tokens: body.usage?.total_tokens || 0 },
    model: body.model || config.model,
  };
}

async function anthropic(config, request) {
  const { body, data } = await requestJson(endpoint(config.baseUrl, "/v1/messages"), {
    method: "POST",
    headers: { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      system: `${request.system}\n只输出有效JSON，不要使用Markdown代码块。`,
      messages: [{ role: "user", content: request.user }],
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    }),
  }, {
    attempts: Number(config.retryCount ?? 1) + 1,
    timeoutMs: Number(config.timeoutMs || 90000),
    validateBody: body => ({ body, data: parseJsonContent(body.content?.find(item => item.type === "text")?.text, "Claude") }),
  });
  const promptTokens = body.usage?.input_tokens || 0;
  const completionTokens = body.usage?.output_tokens || 0;
  return { data, usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }, model: body.model || config.model };
}

async function gemini(config, request) {
  const url = endpoint(config.baseUrl, `/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`);
  const { body, data } = await requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: "user", parts: [{ text: request.user }] }],
      generationConfig: { temperature: request.temperature, maxOutputTokens: request.maxTokens, responseMimeType: "application/json" },
    }),
  }, {
    attempts: Number(config.retryCount ?? 1) + 1,
    timeoutMs: Number(config.timeoutMs || 90000),
    validateBody: body => ({
      body,
      data: parseJsonContent(body.candidates?.[0]?.content?.parts?.map(item => item.text || "").join(""), "Gemini"),
    }),
  });
  const usage = body.usageMetadata || {};
  return {
    data,
    usage: { prompt_tokens: usage.promptTokenCount || 0, completion_tokens: usage.candidatesTokenCount || 0, total_tokens: usage.totalTokenCount || 0 },
    model: config.model,
  };
}

export async function callModel(config, request) {
  if (config.format === "anthropic") return anthropic(config, request);
  if (config.format === "gemini") return gemini(config, request);
  return openAICompatible(config, request);
}
