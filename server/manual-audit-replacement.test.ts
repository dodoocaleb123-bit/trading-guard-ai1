import { describe, expect, it } from "vitest";
import { buildReplacementManualAuditResult } from "./routers";
import type { ReplacementDecision } from "./replacement-intelligence";

const market = { symbol: "EUR/USD", price: 1.17, close: 1.17, fetchedAt: "2026-08-19T00:00:00.000Z" };
const decision = (direction: "BUY" | "SELL"): ReplacementDecision => ({
  direction,
  entry: 1.17,
  stopLoss: direction === "BUY" ? 1.168 : 1.172,
  takeProfit: direction === "BUY" ? 1.174 : 1.166,
  confidence: 82,
  confluenceScore: 75,
  riskReward: 2,
  marketRegime: "RISING/STABLE/WITHIN_RANGE",
  ruleEvidence: ["Chapter II, 2.2 Types of Trends: Uptrend is higher peaks and higher troughs"],
  ruleFindings: [{ title: "Uptrend is higher peaks and higher troughs", stance: "BUY", weight: 3 }],
  adjustments: "",
  buyScore: direction === "BUY" ? 5 : 1,
  sellScore: direction === "BUY" ? 1 : 5,
  score: { buy: direction === "BUY" ? 5 : 1, sell: direction === "BUY" ? 1 : 5, net: direction === "BUY" ? 4 : -4 },
  matchedNodes: [],
  conflicts: [],
  explanation: `Replacement PDF-derived intelligence selected ${direction}.`,
  sourceTrace: [],
  decisionTrace: {} as any,
});

describe("manual Replacement Intelligence v2 audit", () => {
  it("approves a submitted direction matching the latest intelligence judgment", () => {
    const result = buildReplacementManualAuditResult("Asset: EUR/USD\nTimeframe: 15MIN\nDirection: BUY", "EUR/USD", "15MIN", market, decision("BUY"));
    expect(result.verdict).toBe("APPROVED");
    expect(result.validationStatus).toBe("UNVALIDATED");
    expect(result.adjustments).toContain("Source-linked replacement v2");
    expect(result.ruleEvidence[0]).toContain("Chapter II");
  });

  it("denies a submitted direction that conflicts with the latest intelligence judgment", () => {
    const result = buildReplacementManualAuditResult("Asset: EUR/USD\nTimeframe: 1H\nDirection: SELL", "EUR/USD", "1H", market, decision("BUY"));
    expect(result.verdict).toBe("DENIED");
    expect(result.adjustments).toContain("conflicts with Replacement Intelligence v2 BUY");
    expect(result.direction).toBe("BUY");
  });
});
