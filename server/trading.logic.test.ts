import { describe, expect, it } from "vitest";
import { extractStrategyText, formatAuditResult, gateAuditDecision, normalizeAsset } from "./integrations";
import { buildSignalLevels, resolveOutcome } from "./scanner";
import { buildStrategyContext, buildStrategyRuleRecord } from "./routers";

describe("TradingGuardAI market helpers", () => {
  it("normalizes common asset aliases", () => {
    expect(normalizeAsset("eurusd")).toBe("EUR/USD");
    expect(normalizeAsset("XAUUSD")).toBe("XAU/USD");
    expect(normalizeAsset("BTC/USD")).toBe("BTC/USD");
  });

  it("preserves unknown symbols for transparent provider errors", () => {
    expect(normalizeAsset("USD/JPY")).toBe("USD/JPY");
  });

  it("extracts plain-text strategy content", async () => {
    await expect(extractStrategyText(Buffer.from("Risk no more than 1% per trade."), "text/plain", "rules.txt")).resolves.toBe("Risk no more than 1% per trade.");
  });

  it("preserves large extracted rule bodies", async () => {
    const source = "Rule: wait for confirmation.\n".repeat(5000);
    const extracted = await extractStrategyText(Buffer.from(source), "text/plain", "large-rules.txt");
    expect(extracted.length).toBeGreaterThan(140000);
    expect(extracted.endsWith("confirmation.")).toBe(true);
  });

  it("includes saved local and Supabase rules in audit context", () => {
    const context = buildStrategyContext("## Local rule\nRisk stays below 1%.", [{ title: "Saved PDF", content: "Only trade with confirmation." }]);
    expect(context).toContain("Risk stays below 1%.");
    expect(context).toContain("Only trade with confirmation.");
    expect(context).toContain("## Saved PDF");
  });

  it("passes oversized content intact through the ingest mutation payload", () => {
    const content = "Rule: wait for confirmation.\n".repeat(5000);
    const record = buildStrategyRuleRecord({ userId: 1, title: "Forex", sourceType: "pdf", fileName: "playbook.pdf", content, storageKey: "1/strategy-rules/playbook.pdf", supabaseId: null });
    expect(record.content.length).toBe(content.length);
    expect(record.sourceType).toBe("pdf");
    expect(record.storageKey).toContain("strategy-rules");
  });

  it("does not require evidence or confidence thresholds, but still requires complete directional levels", () => {
    const rules = "## Trend confirmation\n## Risk management\n## Session filter\n";
    const approved = gateAuditDecision({ verdict: "APPROVED", confidence: 82, adjustments: "None", direction: "BUY", entry: 100, stopLoss: 98, takeProfit: 104, ruleEvidence: ["Trend confirmation", "Risk management", "Session filter"], ruleFindings: [{ title: "Trend confirmation", stance: "BUY", weight: 3 }, { title: "Risk management", stance: "BUY", weight: 2 }, { title: "Session filter", stance: "BUY", weight: 1 }] }, rules);
    expect(approved.verdict).toBe("APPROVED");
    const paperApproved = gateAuditDecision({ verdict: "DENIED", confidence: 42, adjustments: "Mixed context", direction: "BUY", entry: 100, stopLoss: 98, takeProfit: 104, ruleEvidence: [], ruleFindings: [] }, rules);
    expect(paperApproved.verdict).toBe("APPROVED");
    expect(paperApproved.validationStatus).toBe("UNVALIDATED");
    const invalidLevels = gateAuditDecision({ verdict: "APPROVED", confidence: 90, adjustments: "None", direction: "BUY", entry: 100, stopLoss: 101, takeProfit: 104, ruleEvidence: [], ruleFindings: [] }, rules);
    expect(invalidLevels.verdict).toBe("DENIED");
    expect(invalidLevels.adjustments).toContain("directional entry");
  });

  it("formats structured approved and denied audit verdicts", () => {
    const market = { symbol: "EUR/USD", price: 1.15805, fetchedAt: new Date().toISOString() };
    expect(formatAuditResult({ verdict: "APPROVED", confidence: 86, adjustments: "None" }, market)).toContain("TRADE APPROVED");
    expect(formatAuditResult({ verdict: "DENIED", confidence: 31, adjustments: "Risk is not acceptable" }, market)).toContain("TRADE DENIED");
  });

  it("resolves WIN, LOSS, and PENDING transitions", () => {
    expect(resolveOutcome("BUY", 102, 95, 100)).toBe("WIN");
    expect(resolveOutcome("BUY", 94, 95, 100)).toBe("LOSS");
    expect(resolveOutcome("SELL", 98, 105, 90)).toBeNull();
  });

  it("builds timeframe-specific 1:2 signal geometry", () => {
    const signal = buildSignalLevels("EUR/USD", "1H", 1.15805, "UP");
    expect(signal.timeframe).toBe("1H");
    expect(signal.direction).toBe("BUY");
    expect(signal.entry).toBeLessThan(signal.takeProfit);
    expect(signal.stopLoss).toBeLessThan(signal.entry);
    expect(signal.riskReward).toBe(2);
  });
});
