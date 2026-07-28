import test from "node:test";
import assert from "node:assert/strict";
import { configuredSearchWindows, selectionNeedsExpansion } from "./window-policy.mjs";

const scoringConfig = {
  initialWindowDays: 30,
  expandedWindowDays: 180,
  maximumWindowDays: 360,
  dailyLimit: 5,
  selectionPolicy: { expandForCompositionShortfall: true },
};

test("uses 30, 180 and 360 day search windows in order", () => {
  assert.deepEqual(configuredSearchWindows(scoringConfig), [30, 180, 360]);
});

test("continues expanding when the 180-day selection still lacks the 4+1 composition", () => {
  const result = selectionNeedsExpansion({
    journalImpactFactor: { eligibleCount: 8 },
    compositionSatisfied: false,
  }, scoringConfig);
  assert.deepEqual(result, { needed: true, reason: "composition-shortfall" });
});

test("stops expanding when the target count and composition are satisfied", () => {
  const result = selectionNeedsExpansion({
    journalImpactFactor: { eligibleCount: 5 },
    compositionSatisfied: true,
  }, scoringConfig);
  assert.deepEqual(result, { needed: false, reason: null });
});

test("rejects a maximum window that does not extend beyond 180 days", () => {
  assert.throws(
    () => configuredSearchWindows({ ...scoringConfig, maximumWindowDays: 180 }),
    /must increase/,
  );
});
