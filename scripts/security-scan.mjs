import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = ["out", "public", "data/generated", "data/state", "data/usage", "data/logs/latest-public-summary.json"];
const allowedExtensions = new Set([".html", ".js", ".css", ".json", ".xml", ".txt", ".map"]);
const patterns = [
  { name: "authorization-header", regex: /authorization\s*[:=]\s*["']?(?:bearer|basic)\s+[a-z0-9._~+\/-]{12,}/i },
  { name: "bearer-token", regex: /bearer\s+[a-z0-9._~+\/-]{24,}/i },
  { name: "secret-key-prefix", regex: /\b(?:sk-[a-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{24,})\b/i },
  { name: "private-env", regex: /(?:AI_API_KEY|NCBI_API_KEY|AI_CONFIG_MASTER_KEY|BUTTONDOWN_API_KEY|TENCENT_SECRET_ID|TENCENT_SECRET_KEY|SUBSCRIBER_ENCRYPTION_KEY|SUBSCRIPTION_INBOX_PASSWORD)\s*=\s*[^\s"']+/i },
];
const forbiddenHosts = ["fonts.googleapis.com", "fonts.gstatic.com", "google-analytics.com", "googletagmanager.com", "unpkg.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "raw.githubusercontent.com"];

async function walk(target) {
  try {
    const stat = await fs.stat(target);
    if (stat.isFile()) return [target];
    const entries = await fs.readdir(target, { withFileTypes: true });
    return (await Promise.all(entries.map(entry => walk(path.join(target, entry.name))))).flat();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const files = (await Promise.all(targets.map(target => walk(path.join(root, target))))).flat();
const findings = [];
for (const file of files) {
  if (!allowedExtensions.has(path.extname(file))) continue;
  const text = await fs.readFile(file, "utf8");
  for (const pattern of patterns) if (pattern.regex.test(text)) findings.push({ file: path.relative(root, file), type: pattern.name });
  for (const host of forbiddenHosts) if (text.includes(host)) findings.push({ file: path.relative(root, file), type: `forbidden-host:${host}` });
}
if (findings.length) {
  console.error(JSON.stringify({ status: "failed", findings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "passed", scannedFiles: files.length, findings: 0 }, null, 2));
