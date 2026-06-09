const Issue = require("../models/Issue");

// Severity weights — how many points each issue type deducts
const DEDUCTIONS = {
  unevaluated_page:   { critical: 20, high: 15, medium: 10, low: 5 },
  blur_penalized:     { critical: 25, high: 18, medium: 10, low: 5 },
  missing_page:       { critical: 20, high: 15, medium: 10, low: 5 },
  anomalous_zero:     { critical: 12, high: 8,  medium: 5,  low: 2 },
  arithmetic_error:   { critical: 10, high: 7,  medium: 4,  low: 2 },
  wrong_sheet:        { critical: 30, high: 20, medium: 10, low: 5 },
  repeat_stamp:       { critical: 10, high: 7,  medium: 4,  low: 2 },
  supplement_missing: { critical: 18, high: 12, medium: 8,  low: 3 },
  mark_mismatch:      { critical: 15, high: 10, medium: 6,  low: 3 },
};

// Category mapping for breakdown
const CATEGORY_MAP = {
  scanQuality:            ["blur_penalized"],
  pageIntegrity:          ["missing_page", "supplement_missing", "wrong_sheet"],
  evaluationCompleteness: ["unevaluated_page", "anomalous_zero", "repeat_stamp"],
  markAccuracy:           ["arithmetic_error", "mark_mismatch"],
};

async function calculateTrustScore(paperId) {
  const issues = await Issue.find({ paperId });

  const breakdown = {
    scanQuality: 100,
    pageIntegrity: 100,
    evaluationCompleteness: 100,
    markAccuracy: 100,
  };

  for (const issue of issues) {
    const deductionTable = DEDUCTIONS[issue.type];
    if (!deductionTable) continue;

    const deduction = deductionTable[issue.severity] || 0;

    // Find which category this issue affects
    for (const [category, types] of Object.entries(CATEGORY_MAP)) {
      if (types.includes(issue.type)) {
        breakdown[category] = Math.max(0, breakdown[category] - deduction);
      }
    }
  }

  // Weighted average: scanQuality 20%, pageIntegrity 25%, evalCompleteness 35%, markAccuracy 20%
  const trustScore = Math.round(
    breakdown.scanQuality * 0.2 +
    breakdown.pageIntegrity * 0.25 +
    breakdown.evaluationCompleteness * 0.35 +
    breakdown.markAccuracy * 0.2
  );

  return { trustScore: Math.max(0, Math.min(100, trustScore)), breakdown };
}

module.exports = { calculateTrustScore };
