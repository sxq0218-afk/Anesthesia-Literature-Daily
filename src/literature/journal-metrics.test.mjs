import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { eligibleJournalEntries, evaluateJournalImpactFactor, screenByJournalImpactFactor, summarizeJournalAudit } from "./journal-metrics.mjs";

const config = JSON.parse(fs.readFileSync(new URL("../../config/journal-metrics.json", import.meta.url)));

test("accepts a configured journal with impact factor strictly above 5", () => {
  const result = evaluateJournalImpactFactor({ journal: "British Journal of Anaesthesia" }, config);
  assert.equal(result.eligible, true);
  assert.equal(result.journalMetric.impactFactor, 10.3);
  assert.equal(result.journalMetric.threshold, 5);
  assert.equal(result.journalMetric.rankingComparable, true);
});

test("rejects a journal at or below the threshold", () => {
  const result = evaluateJournalImpactFactor({ journal: "Regional Anesthesia & Pain Medicine" }, config);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "below-or-equal-threshold");
});

test("rejects unknown and unconfigured journals instead of guessing", () => {
  const unknownMetric = evaluateJournalImpactFactor({ journal: "The Journal of Pain" }, config);
  const unconfigured = evaluateJournalImpactFactor({ journal: "Example Journal of Anaesthesia" }, config);
  assert.equal(unknownMetric.reason, "impact-factor-unknown");
  assert.equal(unconfigured.reason, "journal-not-configured");
});

test("rejects impact factors that are too old for cross-journal ranking", () => {
  const result = evaluateJournalImpactFactor({ journal: "Anesthesia and Analgesia" }, config);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "impact-factor-stale");
  assert.equal(result.journalMetric.rankingComparable, false);
});

test("reports impact factor exclusion counts", () => {
  const result = screenByJournalImpactFactor([
    { journal: "JAMA" },
    { journal: "Pain Medicine" },
    { journal: "Unknown Journal" },
  ], config);
  assert.equal(result.summary.eligibleCount, 1);
  assert.equal(result.summary.excludedCount, 2);
  assert.deepEqual(result.summary.excludedByReason, {
    "below-or-equal-threshold": 1,
    "journal-not-configured": 1,
  });
});

test("builds the current strict JIF >5 journal allowlist", () => {
  const names = eligibleJournalEntries(config).map(entry => entry.name);
  assert.ok(names.includes("British Journal of Anaesthesia"));
  assert.ok(!names.includes("Anesthesia & Analgesia"));
  assert.ok(!names.includes("Regional Anesthesia and Pain Medicine"));
});

test("reports unresolved journal names without treating them as eligible", () => {
  const result = summarizeJournalAudit([
    { journal: "Unknown Journal" },
    { journal: "Unknown Journal" },
    { journal: "The Journal of Pain" },
  ], config);
  assert.equal(result.eligibleCount, 0);
  assert.equal(result.unresolvedCount, 3);
  assert.deepEqual(result.unresolvedJournals[0], {
    journal: "Unknown Journal",
    reason: "journal-not-configured",
    count: 2,
  });
});
