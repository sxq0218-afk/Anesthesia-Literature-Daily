export function configuredSearchWindows(scoringConfig) {
  const windows = [
    scoringConfig.initialWindowDays,
    scoringConfig.expandedWindowDays,
    scoringConfig.maximumWindowDays,
  ].map(Number);

  if (windows.some(days => !Number.isInteger(days) || days <= 0)) {
    throw new Error("Search window days must be positive integers.");
  }
  if (!(windows[0] < windows[1] && windows[1] < windows[2])) {
    throw new Error("Search windows must increase from initial to expanded to maximum.");
  }
  return windows;
}

export function selectionNeedsExpansion(selection, scoringConfig) {
  const countShortfall = selection.journalImpactFactor.eligibleCount < scoringConfig.dailyLimit;
  const compositionShortfall = Boolean(
    scoringConfig.selectionPolicy?.expandForCompositionShortfall
      && !selection.compositionSatisfied,
  );
  return {
    needed: countShortfall || compositionShortfall,
    reason: compositionShortfall ? "composition-shortfall" : countShortfall ? "article-count-shortfall" : null,
  };
}
