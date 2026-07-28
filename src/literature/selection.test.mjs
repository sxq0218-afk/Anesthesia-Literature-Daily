import test from "node:test";
import assert from "node:assert/strict";
import { classifyResearchCategory, selectDailyArticles } from "./selection.mjs";

test("classifies animal mechanistic work as basic research", () => {
  const result = classifyResearchCategory({ title: "Sevoflurane receptor mechanism in mice", abstract: "Mice and neuronal cells were studied.", meshTerms: ["Animals", "Mice"], publicationTypes: ["Journal Article"] });
  assert.equal(result.id, "basic");
});

test("classifies an animal model from the title even when PubMed MeSH is incomplete", () => {
  const result = classifyResearchCategory({
    title: "Anesthesia and surgery induce sex-dependent Tau phosphorylation in aged mice",
    abstract: "The experiment measured postoperative behavior and brain biomarkers.",
    meshTerms: [],
    publicationTypes: ["Journal Article"],
  });
  assert.equal(result.id, "basic");
});

test("classifies a randomized adult surgical study from its title when publication type is incomplete", () => {
  const result = classifyResearchCategory({
    title: "A randomized controlled trial in adults undergoing shoulder surgery",
    abstract: "Anesthetic and vasopressor strategies were compared.",
    meshTerms: [],
    publicationTypes: ["Journal Article"],
  });
  assert.equal(result.id, "clinical");
});

test("does not count a narrative review as a clinical study", () => {
  const result = classifyResearchCategory({
    title: "Current state of airway management knowledge",
    abstract: "This review discusses patients and clinical practice.",
    meshTerms: ["Humans"], publicationTypes: ["Journal Article", "Review"],
  });
  assert.equal(result.id, "other");
});

test("counts systematic reviews, meta-analyses, guidelines and consensus as clinical evidence", () => {
  for (const publicationType of ["Systematic Review", "Meta-Analysis", "Guideline", "Practice Guideline", "Consensus Development Conference"]) {
    const result = classifyResearchCategory({
      title: "Perioperative clinical evidence",
      abstract: "This work informs care for surgical patients.",
      meshTerms: ["Humans"],
      publicationTypes: ["Journal Article", publicationType],
    });
    assert.equal(result.id, "clinical", publicationType);
    assert.equal(result.label, "临床证据");
  }
});

test("does not count a study protocol as a completed clinical study", () => {
  const result = classifyResearchCategory({
    title: "Protocol for a randomized anesthesia trial",
    abstract: "Patients will be randomized.",
    meshTerms: ["Humans"], publicationTypes: ["Journal Article"],
  });
  assert.equal(result.id, "other");
});

test("counts human mechanistic research as clinical rather than basic", () => {
  const result = classifyResearchCategory({
    title: "Propofol receptor mechanism in healthy adults",
    abstract: "Molecular pathway analysis in healthy volunteers.",
    meshTerms: ["Humans", "Adult"],
    publicationTypes: ["Journal Article"],
  });
  assert.equal(result.id, "clinical");
  assert.equal(result.reason, "human-study");
});

test("keeps a relevant basic study when the anesthesia term appears in the abstract instead of the title", () => {
  const records = [{
    pmid: "basic-abstract",
    score: 60,
    scoreBreakdown: { evidenceQuality: 8 },
    publicationTypes: ["Journal Article"],
    meshTerms: ["Animals", "Mice"],
    title: "Neuronal receptor signalling in mice",
    abstract: "This study examines the molecular mechanism of propofol anesthesia.",
    journalMetric: { impactFactor: 8 },
  }];
  const result = selectDailyArticles(records, {
    dailyLimit: 1,
    selectionPolicy: { clinicalTarget: 0, basicTarget: 1, allowBackfill: false },
  });
  assert.equal(result.selected.length, 1);
  assert.equal(result.candidatePool.basic, 1);
});

test("selects the four highest-impact clinical articles and highest-impact basic article", () => {
  const records = [
    ...Array.from({ length: 5 }, (_, index) => ({
      pmid: `c${index}`,
      score: 90 - index,
      scoreBreakdown: { evidenceQuality: 20 - index },
      publicationTypes: ["Clinical Trial"],
      meshTerms: ["Humans"],
      title: "Clinical anesthesia trial",
      abstract: "Patients",
      journalMetric: { impactFactor: 6 + index },
    })),
    { pmid: "b1", score: 70, scoreBreakdown: { evidenceQuality: 8 }, publicationTypes: ["Journal Article"], meshTerms: ["Animals", "Mice"], title: "Anesthetic mechanism in mice", abstract: "Molecular receptor pathway in mice", journalMetric: { impactFactor: 7 } },
  ];
  const result = selectDailyArticles(records, { dailyLimit: 5, selectionPolicy: { clinicalTarget: 4, basicTarget: 1, allowBackfill: false } });
  assert.equal(result.summary.clinical, 4);
  assert.equal(result.summary.basic, 1);
  assert.equal(result.selected[0].pmid, "c4");
  assert.equal(result.selected.some(item => item.pmid === "c0"), false);
  assert.equal(result.compositionSatisfied, true);
});

test("impact factor outranks recency and score after the candidate pool is qualified", () => {
  const records = [
    { pmid: "recent", publicationDate: "2026-07-20", score: 99, scoreBreakdown: { evidenceQuality: 25 }, publicationTypes: ["Clinical Trial"], meshTerms: ["Humans"], title: "Recent anesthesia trial", abstract: "Patients", journalMetric: { impactFactor: 6 } },
    { pmid: "older", publicationDate: "2026-01-20", score: 60, scoreBreakdown: { evidenceQuality: 10 }, publicationTypes: ["Clinical Trial"], meshTerms: ["Humans"], title: "Older anesthesia trial", abstract: "Patients", journalMetric: { impactFactor: 20 } },
  ];
  const result = selectDailyArticles(records, { dailyLimit: 2, selectionPolicy: { clinicalTarget: 2, basicTarget: 0, allowBackfill: false } });
  assert.equal(result.selected[0].pmid, "older");
});

test("does not backfill a missing basic slot with a fifth clinical article", () => {
  const records = Array.from({ length: 5 }, (_, index) => ({
    pmid: `c${index}`,
    score: 80,
    publicationTypes: ["Clinical Trial"],
    meshTerms: ["Humans"],
    title: "Clinical anesthesia trial",
    abstract: "Patients",
    journalMetric: { impactFactor: 10 - index },
  }));
  const result = selectDailyArticles(records, { dailyLimit: 5, selectionPolicy: { clinicalTarget: 4, basicTarget: 1, allowBackfill: false } });
  assert.equal(result.selected.length, 4);
  assert.equal(result.summary.clinical, 4);
  assert.equal(result.summary.basic, 0);
  assert.equal(result.compositionSatisfied, false);
});
