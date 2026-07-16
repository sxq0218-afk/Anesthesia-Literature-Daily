import assert from "node:assert/strict";
import test from "node:test";
import { decryptSubscriberState, encryptSubscriberState } from "../src/email/crypto-store.mjs";
import { applySubscriptionMessage } from "../src/email/subscriptions.mjs";
import { signTencentRequest } from "../src/email/tencent-ses.mjs";

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
