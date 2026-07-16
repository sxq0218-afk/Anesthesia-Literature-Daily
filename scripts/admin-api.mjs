import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../src/lib/env.mjs";
import { friendlyAIError, getAIAdminSnapshot, publicAISettings, saveAISettings, testAIConnection } from "../src/llm/index.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = loadEnv(rootDir);
const port = Number(env.AI_ADMIN_API_PORT || 4317);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch { return false; }
}

function send(response, status, payload, origin) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : "http://localhost:3000",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100000) throw new Error("请求内容过大");
  }
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (!isAllowedOrigin(origin)) return send(response, 403, { success: false, error: "管理接口仅允许本机页面访问" }, origin);
  if (request.method === "OPTIONS") return send(response, 204, {}, origin);

  try {
    if (request.method === "GET" && request.url === "/health") return send(response, 200, { status: "ok" }, origin);
    if (request.method === "GET" && request.url === "/api/ai/settings") return send(response, 200, getAIAdminSnapshot(rootDir, env), origin);
    if (request.method === "GET" && request.url === "/api/ai/usage") {
      const snapshot = getAIAdminSnapshot(rootDir, env);
      return send(response, 200, { usage: snapshot.usage, pricing: snapshot.pricing, settings: snapshot.settings }, origin);
    }
    if (request.method === "PUT" && request.url === "/api/ai/settings") {
      const saved = saveAISettings(await readBody(request), rootDir, env);
      return send(response, 200, { success: true, settings: publicAISettings(saved) }, origin);
    }
    if (request.method === "POST" && request.url === "/api/ai/test") {
      try {
        const result = await testAIConnection({ rootDir, env });
        return send(response, 200, result, origin);
      } catch (error) {
        return send(response, 400, { success: false, code: error.code || "AI_ERROR", error: friendlyAIError(error) }, origin);
      }
    }
    return send(response, 404, { success: false, error: "接口不存在" }, origin);
  } catch (error) {
    return send(response, 400, { success: false, error: error.message || "请求处理失败" }, origin);
  }
});

server.listen(port, "127.0.0.1", () => console.log(`AI admin API: http://127.0.0.1:${port}`));
