import assert from "node:assert/strict";
import test from "node:test";
import { decryptSubscriberState, encryptSubscriberState } from "../src/email/crypto-store.mjs";
import { applySubscriptionMessage } from "../src/email/subscriptions.mjs";
import { signTencentRequest } from "../src/email/tencent-ses.mjs";
import { createButtondownClient } from "../src/email/buttondown.mjs";
import { buildButtondownEmail } from "../src/email/buttondown-body.mjs";

const secret = "test-only-secret-with-at-least-thirty-two-characters";

test("subscriber state is encrypted and round-trips", () => {
  const state = { version: 1, subscribers: [{ email: "reader@example.com", status: "active" }] };
  const envelope = encryptSubscriberState(state, secret);
  assert.equal(JSON.stringify(envelope).includes("reader@example.com"), false);
  assert.deepEqual(decryptSubscriberState(envelope, secret), state);
});

test("subscription requires confirmation and unsubscribe is immediate", async () => {
  const state = { version: 1, lastInboxUid: 0, subscribers: [], dispatches: [] };
  const notices = [];
  await applySubscriptionMessage({ state, message: { from: "Reader@Example.com", subject: "订阅每日麻醉文献精读" }, secret, sendNotice: async value => notices.push(value) });
  assert.equal(state.subscribers[0].status, "pending");
  assert.equal(notices.length, 1);
  const token = notices[0].data.confirmation_subject.split(" ")[1];
  await applySubscriptionMessage({ state, message: { from: "reader@example.com", subject: `确认订阅 ${token}` }, secret, sendNotice: async value => notices.push(value) });
  assert.equal(state.subscribers[0].status, "active");
  await applySubscriptionMessage({ state, message: { from: "reader@example.com", subject: "退订" }, secret, sendNotice: async value => notices.push(value) });
  assert.equal(state.subscribers[0].status, "unsubscribed");
});

test("Tencent request signature never exposes secret key", () => {
  const signed = signTencentRequest({ secretId: "AKIDEXAMPLE", secretKey: "secret-value-not-for-output", action: "SendEmail", region: "ap-guangzhou", body: { Subject: "test" }, timestamp: 1700000000 });
  assert.match(signed.authorization, /^TC3-HMAC-SHA256 Credential=AKIDEXAMPLE\//);
  assert.equal(signed.authorization.includes("secret-value-not-for-output"), false);
});

test("Buttondown client creates a draft and queues it without leaking its key", async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    if (options.method === "POST") return new Response(JSON.stringify({ id: "em_test", status: "draft" }), { status: 201, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ id: "em_test", status: "about_to_send" }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = createButtondownClient({ apiKey: "buttondown-test-secret", baseUrl: "https://api.buttondown.com/v1", timeoutMs: 1000 }, fakeFetch);
  const draft = await client.createDraft({ subject: "Test", slug: "test", body: "Body", description: "Description", metadata: {} });
  const queued = await client.queueDraft(draft.id);
  assert.equal(queued.status, "about_to_send");
  assert.equal(JSON.stringify(calls).includes("buttondown-test-secret"), true);
  assert.equal(JSON.stringify({ draft, queued }).includes("buttondown-test-secret"), false);
});

test("Buttondown email contains full article content and escapes unsafe HTML", () => {
  const edition = {
    generatedAt: "2026-07-17T00:30:00.000Z",
    search: { expanded: true, actualDays: 7 },
    articles: [{
      title: "标题<script>alert(1)</script>", originalTitle: "Original", category: "麻醉学", journal: "Journal", publishedDate: "2026-07-17", studyType: "RCT",
      conclusion: "结论", whyItMatters: "原因", pico: { population: "P", intervention: "I", comparison: "C", outcome: "O" }, sampleSize: "100", primaryOutcome: "终点", results: "结果", effectSize: ["RR 0.8"], confidenceInterval: ["0.7–0.9"], pValue: ["0.01"], clinical: "启示", limitations: ["局限"], analysisBasis: "摘要分析", urls: { pubmed: "https://pubmed.ncbi.nlm.nih.gov/1/" },
    }],
  };
  const email = buildButtondownEmail(edition, {});
  assert.match(email.body, /RR 0.8/);
  assert.match(email.body, /PubMed/);
  assert.equal(email.body.includes("<script>alert(1)</script>"), false);
  assert.match(email.body, /&lt;script&gt;/);
});
