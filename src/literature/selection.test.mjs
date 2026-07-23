import test from "node:test";
import assert from "node:assert/strict";
import { classifyResearchCategory, selectDailyArticles } from "./selection.mjs";

test("classifies animal mechanistic work as basic research", () => {
  const result = classifyResearchCategory({ title: "Sevoflurane receptor mechanism in mice", abstract: "Mice and neuronal cells were studied.", meshTerms: ["Animals", "Mice"], publicationTypes: ["Journal Article"] });
  assert.equal(result.id, "basic");
});

test("does not count a narrative review as a clinical study", () => {
  const result = classifyResearchCategory({
    title: "Current state of airway management knowledge",
    abstract: "This review discusses patients and clinical practice.",
    meshTerms: ["Humans"], publicationTypes: ["Journal Article", "Review"],
  });
  assert.equal(result.id, "other");
});

test("does not count a study protocol as a completed clinical study", () => {
  const result = classifyResearchCategory({
    title: "Protocol for a randomized anesthesia trial",
    abstract: "Patients will be randomized.",
    meshTerms: ["Humans"], publicationTypes: ["Journal Article"],
  });
  assert.equal(result.id, "other");
});

test("selects four clinical and one basic article while prioritizing configured journals", () => {
  const records = [
    ...Array.from({ length: 5 }, (_, index) => ({ pmid: `c${index}`, score: 90 - index, publicationTypes: ["Clinical Trial"], meshTerms: ["Humans"], title: "Clinical anesthesia trial", abstract: "Patients", journalTier: { priorityRank: index === 4 ? 2 : 0 } })),
    { pmid: "b1", score: 70, publicationTypes: ["Journal Article"], meshTerms: ["Animals", "Mice"], title: "Anesthetic mechanism in mice", abstract: "Molecular receptor pathway in mice", journalTier: { priorityRank: 1 } },
  ];
  const result = selectDailyArticles(records, { dailyLimit: 5, selectionPolicy: { clinicalTarget: 4, basicTarget: 1, priorityJournalFirst: true, allowBackfill: true } });
  assert.equal(result.summary.clinical, 4);
  assert.equal(result.summary.basic, 1);
  assert.equal(result.selected[0].pmid, "c4");
  assert.equal(result.compositionSatisfied, true);
});

test("keeps recent-window articles ahead after expanding the search window", () => {
  const records = [
    { pmid: "recent", preferredWindow: true, score: 60, publicationTypes: ["Clinical Trial"], meshTerms: ["Humans"], title: "Recent anesthesia trial", abstract: "Patients", journalTier: { priorityRank: 1 } },
    { pmid: "older", preferredWindow: false, score: 99, publicationTypes: ["Clinical Trial"], meshTerms: ["Humans"], title: "Older anesthesia trial", abstract: "Patients", journalTier: { priorityRank: 2 } },
  ];
  const result = selectDailyArticles(records, { dailyLimit: 2, selectionPolicy: { clinicalTarget: 2, basicTarget: 0, priorityJournalFirst: true, allowBackfill: true } });
  assert.equal(result.selected[0].pmid, "recent");
});
