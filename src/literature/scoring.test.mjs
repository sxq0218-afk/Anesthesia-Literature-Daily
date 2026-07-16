import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { scoreArticle } from "./scoring.mjs";

const topicConfig = JSON.parse(fs.readFileSync(new URL("../../config/topics.json", import.meta.url)));
const journalConfig = JSON.parse(fs.readFileSync(new URL("../../config/journals.json", import.meta.url)));
const scoringConfig = JSON.parse(fs.readFileSync(new URL("../../config/scoring.json", import.meta.url)));

test("scores a relevant randomized anesthesia trial", () => {
  const article = scoreArticle({
    title: "Randomized trial of regional anesthesia for postoperative pain",
    abstract: "A multicenter randomized trial enrolled 800 patients and evaluated pain and safety.",
    meshTerms: ["Anesthesia"], publicationTypes: ["Randomized Controlled Trial"], journal: "Anesthesiology",
  }, { topicConfig, journalConfig, scoringConfig });
  assert.ok(article.score >= 65);
  assert.equal(article.scoreBreakdown.journalQuality, 15);
  assert.ok(article.scoreBreakdown.evidenceQuality >= 22);
});

test("does not promote similarly named journals into a priority tier", () => {
  const article = scoreArticle({
    title: "A perioperative anesthesia study",
    abstract: "Patients received anesthesia.",
    meshTerms: ["Anesthesia"], publicationTypes: ["Journal Article"], journal: "BMC Anesthesiology",
  }, { topicConfig, journalConfig, scoringConfig });
  assert.equal(article.journalTier.id, "other");
  assert.equal(article.scoreBreakdown.journalQuality, journalConfig.defaultScore);
});
