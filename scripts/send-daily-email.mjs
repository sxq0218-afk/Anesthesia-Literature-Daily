import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../src/lib/env.mjs";
import { readJson, writeJsonAtomic } from "../src/literature/storage.mjs";
import { emailFingerprint, loadSubscriberState, saveSubscriberState } from "../src/email/crypto-store.mjs";
import { createTencentSesClient, sesConfigFromEnv } from "../src/email/tencent-ses.mjs";
import { editionTemplateData } from "../src/email/template-data.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = loadEnv(rootDir);
const stateFile = path.join(rootDir, "data/email/subscribers.enc.json");
const summaryFile = path.join(rootDir, "data/logs/latest-email-summary.json");
const secret = env.SUBSCRIBER_ENCRYPTION_KEY;
if (!secret) throw new Error("SUBSCRIBER_ENCRYPTION_KEY is required to send email.");

const edition = await readJson(path.join(rootDir, "data/generated/daily.json"), null);
if (edition?.mode !== "production" || !edition.articles?.length || edition.articles.some(article => !article.qualityPassed)) {
  throw new Error("A fully validated production edition is required before email delivery.");
}
const editionId = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(edition.generatedAt));
const state = await loadSubscriberState(stateFile, secret);
const alreadyComplete = state.dispatches.some(item => item.editionId === editionId && item.status === "completed");
if (alreadyComplete) {
  console.log(JSON.stringify({ status: "already-sent", editionId, sent: 0 }, null, 2));
  process.exit(0);
}

const active = state.subscribers.filter(item => item.status === "active" && item.lastSentEdition !== editionId);
const sendLimit = Number(env.EMAIL_DAILY_SEND_LIMIT || 120);
if (active.length > sendLimit) throw new Error(`Active recipient count ${active.length} exceeds EMAIL_DAILY_SEND_LIMIT ${sendLimit}. No email was sent.`);
const ses = createTencentSesClient(sesConfigFromEnv(env));
const dispatch = { editionId, status: "started", startedAt: new Date().toISOString(), completedAt: null, sent: 0, failed: 0 };
state.dispatches = [...state.dispatches.filter(item => item.editionId !== editionId), dispatch].slice(-60);
await saveSubscriberState(stateFile, state, secret);

const price = await readJson(path.join(rootDir, "config/email-pricing.json"), { pricePerEmailCny: 0.0019 });
const month = editionId.slice(0, 7);
const monthSent = state.dispatches.filter(item => item.editionId?.startsWith(month)).reduce((total, item) => total + Number(item.sent || 0), 0);
const monthlyCostLimit = Number(env.EMAIL_MONTHLY_COST_LIMIT_CNY || 20);
const projectedMonthlyCost = (monthSent + active.length) * Number(price.pricePerEmailCny || 0);
if (projectedMonthlyCost > monthlyCostLimit) {
  dispatch.status = "failed";
  await saveSubscriberState(stateFile, state, secret);
  throw new Error(`Projected monthly email cost exceeds EMAIL_MONTHLY_COST_LIMIT_CNY ${monthlyCostLimit}. No email was sent.`);
}
const templateData = editionTemplateData(edition, { siteUrl: env.SITE_URL });
const failures = [];
for (const subscriber of active) {
  try {
    await ses.sendTemplate({
      to: subscriber.email,
      subject: `${editionId} 每日麻醉文献精读（${edition.articles.length}篇）`,
      templateId: env.TENCENT_SES_DAILY_TEMPLATE_ID,
      templateData,
      unsubscribe: true,
    });
    subscriber.lastSentEdition = editionId;
    subscriber.lastSentAt = new Date().toISOString();
    dispatch.sent += 1;
    await saveSubscriberState(stateFile, state, secret);
    const delay = Number(env.EMAIL_SEND_DELAY_MS || 150);
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  } catch (error) {
    dispatch.failed += 1;
    failures.push({ fingerprint: emailFingerprint(subscriber.email, secret), error: error.code || error.message });
    break;
  }
}

dispatch.status = failures.length ? "failed" : "completed";
dispatch.completedAt = failures.length ? null : new Date().toISOString();
await saveSubscriberState(stateFile, state, secret);
const estimatedCostCny = Number((dispatch.sent * Number(price.pricePerEmailCny || 0)).toFixed(6));
await writeJsonAtomic(summaryFile, {
  version: 1,
  editionId,
  status: dispatch.status,
  activeSubscribers: state.subscribers.filter(item => item.status === "active").length,
  sent: dispatch.sent,
  failed: dispatch.failed,
  estimatedCostCny,
  costSource: "configured-estimate-before-free-quota",
  updatedAt: new Date().toISOString(),
  failures,
});
console.log(JSON.stringify({ status: dispatch.status, editionId, sent: dispatch.sent, failed: dispatch.failed, estimatedCostCny }, null, 2));
if (failures.length) process.exitCode = 1;
