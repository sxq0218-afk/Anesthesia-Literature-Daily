import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../src/lib/env.mjs";
import { loadSubscriberState, saveSubscriberState } from "../src/email/crypto-store.mjs";
import { readSubscriptionMessages } from "../src/email/imap-inbox.mjs";
import { applySubscriptionMessage } from "../src/email/subscriptions.mjs";
import { createTencentSesClient, sesConfigFromEnv } from "../src/email/tencent-ses.mjs";
import { noticeTemplateData } from "../src/email/template-data.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = loadEnv(rootDir);
const stateFile = path.join(rootDir, "data/email/subscribers.enc.json");
const secret = env.SUBSCRIBER_ENCRYPTION_KEY;
if (!secret) throw new Error("SUBSCRIBER_ENCRYPTION_KEY is required to process subscriptions.");

const inbox = {
  host: env.SUBSCRIPTION_INBOX_IMAP_HOST,
  port: Number(env.SUBSCRIPTION_INBOX_IMAP_PORT || 993),
  secure: env.SUBSCRIPTION_INBOX_IMAP_SECURE !== "false",
  user: env.SUBSCRIPTION_INBOX_USER,
  pass: env.SUBSCRIPTION_INBOX_PASSWORD,
  mailbox: env.SUBSCRIPTION_INBOX_MAILBOX || "INBOX",
};
const ses = createTencentSesClient(sesConfigFromEnv(env));
const state = await loadSubscriberState(stateFile, secret);
const messages = await readSubscriptionMessages(inbox, state.lastInboxUid);
const results = [];

async function sendNotice({ to, subject, kind, data, unsubscribe }) {
  return ses.sendTemplate({
    to,
    subject,
    templateId: env.TENCENT_SES_NOTICE_TEMPLATE_ID,
    templateData: noticeTemplateData({ kind, data, inboxAddress: inbox.user }),
    unsubscribe,
  });
}

for (const message of messages) {
  try {
    const result = await applySubscriptionMessage({ state, message, secret, sendNotice });
    results.push({ uid: message.uid, status: result.status, fingerprint: result.fingerprint || null });
    state.lastInboxUid = Math.max(state.lastInboxUid, message.uid);
    await saveSubscriberState(stateFile, state, secret);
  } catch (error) {
    results.push({ uid: message.uid, status: "failed", error: error.code || error.message });
    break;
  }
}

const active = state.subscribers.filter(item => item.status === "active").length;
console.log(JSON.stringify({ processed: results.length, activeSubscribers: active, results }, null, 2));
if (results.some(item => item.status === "failed")) process.exitCode = 1;
