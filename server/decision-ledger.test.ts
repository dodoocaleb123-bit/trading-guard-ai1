import { describe, expect, it } from "vitest";
import { filterStrategyDecisions, formatWeeklyJudgmentSummary, serializeDecisionLedgerCsv, serializeDecisionLedgerJson } from "./decision-ledger";

const rows = [
  { id: 1, userId: 1, asset: "EUR/USD", timeframe: "15MIN", verdict: "APPROVED", confidence: "80", confluenceScore: "75", ruleEvidence: "[\"trend rule\"]", ruleFindings: null, marketSnapshot: "{\"close\":1.1}", generatedDirection: "BUY", generatedEntry: "1.1", generatedStopLoss: "1.09", generatedTakeProfit: "1.12", decisionReason: "Supported", cooldownKey: "k1", createdAt: new Date("2026-08-18T00:00:00Z") },
  { id: 2, userId: 1, asset: "XAU/USD", timeframe: "1H", verdict: "DENIED", confidence: "40", confluenceScore: "30", ruleEvidence: "[]", ruleFindings: null, marketSnapshot: "{}", generatedDirection: null, generatedEntry: null, generatedStopLoss: null, generatedTakeProfit: null, decisionReason: "Conflict", cooldownKey: "k2", createdAt: new Date("2026-08-18T00:00:00Z") },
] as any;

describe("decision ledger utilities", () => {
  it("filters by asset, timeframe, and verdict", () => {
    expect(filterStrategyDecisions(rows, { asset: "EUR/USD", timeframe: "15MIN", verdict: "APPROVED" })).toHaveLength(1);
    expect(filterStrategyDecisions(rows, { verdict: "SKIPPED" })).toHaveLength(0);
  });

  it("exports evidence in JSON and escaped CSV formats", () => {
    expect(serializeDecisionLedgerJson(rows)).toContain("EUR/USD");
    const csv = serializeDecisionLedgerCsv(rows);
    expect(csv).toContain("id,asset,timeframe,verdict");
    expect(csv).toContain('"EUR/USD"');
  });

  it("formats weekly summaries with judgment counts and paper-validation boundary", () => {
    const summary = formatWeeklyJudgmentSummary([{ verdict: "APPROVED" }, { verdict: "SKIPPED" }, { verdict: "UNAVAILABLE" }], "Aug 11 – Aug 18");
    expect(summary).toContain("Approved: 1");
    expect(summary).toContain("Skipped by cooldown: 1");
    expect(summary).toContain("paper-validation");
  });
});
