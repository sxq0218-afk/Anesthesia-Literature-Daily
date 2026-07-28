import assert from "node:assert/strict";
import test from "node:test";
import { enrichStatisticalMethods, statisticalMethodReferences } from "./statistics.mjs";

test("detects statistical methods explicitly reported by the source", () => {
  const methods = statisticalMethodReferences("Outcomes were assessed using linear mixed-effects models and a time by treatment interaction.");
  assert.deepEqual(methods.map(item => item.id), ["mixed-effects", "interaction"]);
});

test("adds a reviewed standard explanation without replacing study-specific interpretation", () => {
  const result = enrichStatisticalMethods({
    methods: [{ referenceId: "mediation", name: "中介分析", purposeInStudy: "评估再住院是否解释认知下降", interpretation: "中介检验不显著" }],
  }, "A mediation analysis was performed.");
  assert.match(result.methods[0].standardExplanation, /不能证明中介或因果机制/);
  assert.equal(result.methods[0].purposeInStudy, "评估再住院是否解释认知下降");
});

