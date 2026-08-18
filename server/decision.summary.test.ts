import { describe, expect, it } from "vitest";
import { summarizeStrategyDecisions } from "./db";

describe("strategy decision summaries", () => {
  it("counts approved, denied, skipped, and unavailable judgments separately", () => {
    expect(summarizeStrategyDecisions([
      { verdict: "APPROVED" },
      { verdict: "DENIED" },
      { verdict: "SKIPPED" },
      { verdict: "UNAVAILABLE" },
      { verdict: "APPROVED" },
    ])).toEqual({ total: 5, approved: 2, denied: 1, skipped: 1, unavailable: 1 });
  });

  it("returns zeroed summaries for an empty ledger", () => {
    expect(summarizeStrategyDecisions([])).toEqual({ total: 0, approved: 0, denied: 0, skipped: 0, unavailable: 0 });
  });
});
