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

test("Buttondown retries transient read failures but never retries a draft creation POST", async () => {
  let getCalls = 0;
  const retryingClient = createButtondownClient({ apiKey: "buttondown-test-secret", baseUrl: "https://api.buttondown.com/v1", timeoutMs: 1000, retryCount: 3 }, async () => {
    getCalls += 1;
    if (getCalls === 1) return new Response(JSON.stringify({ detail: "temporary" }), { status: 503, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ count: 2, results: [] }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.equal(await retryingClient.activeSubscriberCount(), 2);
  assert.equal(getCalls, 2);

  let postCalls = 0;
  const nonRetryingClient = createButtondownClient({ apiKey: "buttondown-test-secret", baseUrl: "https://api.buttondown.com/v1", timeoutMs: 1000, retryCount: 3 }, async () => {
    postCalls += 1;
    return new Response(JSON.stringify({ detail: "temporary" }), { status: 503, headers: { "content-type": "application/json" } });
  });
  await assert.rejects(() => nonRetryingClient.createDraft({ subject: "Test", slug: "test", body: "Body", description: "Description", metadata: {} }));
  assert.equal(postCalls, 1);
});

test("Buttondown email contains full article content and escapes unsafe HTML", () => {
  const edition = {
    generatedAt: "2026-07-17T00:30:00.000Z",
    search: { expanded: true, actualDays: 7 },
    articles: [{
      title: "标题<script>alert(1)</script>", originalTitle: "Original", category: "麻醉学", journal: "Journal", publishedDate: "2026-07-17", studyType: "RCT",
      conclusion: "结论", whyItMatters: "原因", pico: { population: "P", intervention: "I", comparison: "C", outcome: "O" }, sampleSize: "100", primaryOutcome: "终点", results: "结果", effectSize: ["RR 0.8"], confidenceInterval: ["0.7–0.9"], pValue: ["0.01"], clinical: "启示", limitations: ["局限"], analysisBasis: "摘要分析", urls: { pubmed: "https://pubmed.ncbi.nlm.nih.gov/1/" },
      abstract: "METHODS: One hundred patients were studied.",
      abstractTranslation: { sections: [{ heading: "方法", text: "研究纳入100例患者。" }], fullText: "方法：研究纳入100例患者。", translatorNote: "AI辅助翻译，请以英文原摘要为准。" },
      keyPoints: ["要点"],
      journalMetric: { impactFactor: 12.3, metricYear: 2025, verifiedAt: "2026-07-27", source: "https://example.com/metric" },
      deepDive: {
        methodology: { researchQuestion: "问题", designFit: "匹配", eligibility: "标准", randomization: "随机", allocationConcealment: "隐藏", blinding: "盲法", sampleSizePlanning: "规划", followUp: "随访", analysisPopulation: "ITT", missingData: "无", strengths: ["优势"], concerns: ["关注"] },
        statistics: { methods: [{ referenceId: "mixed-effects", name: "混合效应模型", standardExplanation: "处理重复测量。", purposeInStudy: "分析时间变化", reportedResult: "结果", interpretation: "解读", cautions: ["注意"] }], adjustedVariables: "变量", multiplicity: "多重比较", subgroupAnalysis: "亚组", clinicalVsStatisticalSignificance: "临床意义" },
        outcomeAnalysis: { primary: "主要结果", secondary: ["次要结果"], safety: "安全", absoluteVsRelative: "绝对与相对", subgroupAndInteraction: "交互", sensitivity: "敏感性" },
        criticalAppraisal: { strengths: ["优势"], limitations: ["局限"], biasRisks: ["偏倚"], certainty: "可信度", conclusionAlignment: "匹配", causalBoundary: "边界" },
        clinicalTranslation: { applicability: ["适用"], nonApplicability: ["不适用"], practiceChange: "是否改变实践", canDoNow: ["可以"], cannotConclude: ["不能"], evidenceGaps: ["缺口"], directClinicalRecommendation: false },
      },
    }],
  };
  const email = buildButtondownEmail(edition);
  assert.match(email.body, /RR 0.8/);
  assert.match(email.body, /PubMed/);
  assert.match(email.body, /05｜英文摘要全文中文翻译/);
  for (let index = 1; index <= 18; index += 1) {
    assert.match(email.body, new RegExp(`${String(index).padStart(2, "0")}｜`));
  }
  assert.match(email.body, /混合效应模型/);
  assert.match(email.body, /是否改变当前实践/);
  assert.match(email.body, /影响因子 12.3/);
  assert.equal(email.body.includes("查看网站版"), false);
  assert.equal(email.body.includes("<script>alert(1)</script>"), false);
  assert.match(email.body, /&lt;script&gt;/);
});
