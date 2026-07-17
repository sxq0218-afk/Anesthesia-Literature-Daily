import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../src/lib/env.mjs";
import { readJson, writeJsonAtomic } from "../src/literature/storage.mjs";
import { createButtondownClient, buttondownConfigFromEnv } from "../src/email/buttondown.mjs";
import { buildButtondownEmail } from "../src/email/buttondown-body.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = loadEnv(rootDir);
const edition = await readJson(path.join(rootDir, "data/generated/daily.json"), null);
if (edition?.mode !== "production" || !edition.articles?.length || edition.articles.some(article => !article.qualityPassed)) {
  throw new Error("A fully validated production edition is required before Buttondown delivery.");
}

const client = createButtondownClient(buttondownConfigFromEnv(env));
const email = buildButtondownEmail(edition, { siteUrl: env.SITE_URL });
const summaryFile = path.join(rootDir, "data/logs/latest-email-summary.json");
const existing = await client.findEmailBySubject(email.subject);
if (existing && ["about_to_send", "scheduled", "sent"].includes(existing.status)) {
  await writeJsonAtomic(summaryFile, {
    version: 1,
    provider: "buttondown",
    editionId: email.editionId,
    status: "already-sent",
    remoteEmailId: existing.id,
    remoteStatus: existing.status,
    updatedAt: new Date().toISOString(),
  });
  console.log(JSON.stringify({ status: "already-sent", editionId: email.editionId, remoteStatus: existing.status }, null, 2));
  process.exit(0);
}
if (existing && existing.status !== "draft") {
  throw new Error(`A Buttondown email already exists for ${email.editionId} with status ${existing.status}. Manual review is required; no second email was created.`);
}

const activeSubscribers = await client.activeSubscriberCount();
const subscriberLimit = Number(env.BUTTONDOWN_SUBSCRIBER_LIMIT || 100);
if (activeSubscribers > subscriberLimit) {
  throw new Error(`Buttondown active subscriber count ${activeSubscribers} exceeds BUTTONDOWN_SUBSCRIBER_LIMIT ${subscriberLimit}. No email was queued.`);
}

let draft = existing;
if (draft?.status === "draft") {
  draft = await client.updateDraft(draft.id, { body: email.body, description: email.description, canonical_url: env.SITE_URL || "", slug: email.slug });
} else {
  draft = await client.createDraft({ ...email, canonicalUrl: env.SITE_URL || "", metadata: { edition_id: email.editionId, source: "anesthesia-literature-daily" } });
}
const queued = await client.queueDraft(draft.id);
await writeJsonAtomic(summaryFile, {
  version: 1,
  provider: "buttondown",
  editionId: email.editionId,
  status: "queued",
  activeSubscribers,
  remoteEmailId: queued?.id || draft.id,
  remoteStatus: queued?.status || "about_to_send",
  estimatedCostCny: 0,
  costSource: activeSubscribers <= 100 ? "buttondown-free-tier-current-policy" : "unknown",
  updatedAt: new Date().toISOString(),
});
console.log(JSON.stringify({ status: "queued", provider: "buttondown", editionId: email.editionId, activeSubscribers }, null, 2));
