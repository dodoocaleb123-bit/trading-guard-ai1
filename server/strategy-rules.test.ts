import { describe, expect, it } from "vitest";
import { isUsableStrategyRule, toStrategyRuleSummary } from "./db";

describe("strategy rule integrity", () => {
  it("keeps complete strategy rules available", () => {
    expect(isUsableStrategyRule({ title: "Momentum confirmation", content: "Momentum agrees with the direction." })).toBe(true);
  });

  it("excludes undefined learned guardrails from active context", () => {
    expect(isUsableStrategyRule({ title: "Learned guardrail · EUR/USD 15MIN", content: "undefined\n\nGuardrail: undefined" })).toBe(false);
    expect(isUsableStrategyRule({ title: "Corrupt rule", content: "undefined" })).toBe(false);
  });

  it("excludes blank rows without treating them as strategy evidence", () => {
    expect(isUsableStrategyRule({ title: "", content: "A rule" })).toBe(false);
    expect(isUsableStrategyRule({ title: "A rule", content: "" })).toBe(false);
    expect(isUsableStrategyRule({ title: null, content: null })).toBe(false);
  });

  it("bounds rule previews without changing the original rule object", () => {
    const rule = { id: 7, title: "Large source", content: "A".repeat(2_000), sourceType: "pdf" as const };
    const summary = toStrategyRuleSummary(rule, 64);

    expect(summary.content).toBe(`${"A".repeat(64)}…`);
    expect(summary.contentLength).toBe(2_000);
    expect(summary.title).toBe(rule.title);
    expect(rule.content).toHaveLength(2_000);
  });
});
