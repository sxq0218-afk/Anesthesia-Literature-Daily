import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildEligibleJournalQuery, buildPubMedQuery } from "./pubmed.mjs";

const topicConfig = JSON.parse(fs.readFileSync(new URL("../../config/topics.json", import.meta.url)));
const journalMetricConfig = JSON.parse(fs.readFileSync(new URL("../../config/journal-metrics.json", import.meta.url)));

test("builds a broad topic discovery query with abstracts required", () => {
  const query = buildPubMedQuery(topicConfig);
  assert.match(query, /anesthesia/);
  assert.match(query, /hasabstract/);
});

test("eligible-journal query includes current JIF >5 journals and excludes stale or low metrics", () => {
  const query = buildEligibleJournalQuery(topicConfig, journalMetricConfig);
  assert.match(query, /British Journal of Anaesthesia/);
  assert.match(query, /Critical Care/);
  assert.doesNotMatch(query, /Regional Anesthesia and Pain Medicine/);
  assert.doesNotMatch(query, /Anesthesia & Analgesia/);
});
