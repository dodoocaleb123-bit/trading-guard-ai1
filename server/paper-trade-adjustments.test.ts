import { describe, expect, it } from "vitest";
import { detectPaperTradeContradiction } from "./paper-trade-adjustments";

const signal = { id: 42, asset: "BTC/USD", timeframe: "15MIN", direction: "SELL" as const, entry: "100", stopLoss: "110", takeProfit: "80" };

function decision(direction: "BUY" | "SELL", confidence = 80, confluenceScore = 75) {
  return { direction, confidence, confluenceScore, setupIndicators: [{ id: direction === "BUY" ? "structure-uptrend" : "structure-downtrend", direction, strength: "STRONG" }], decisionTrace: { supportingComponents: ["Current structure"], conflictingComponents: [] } };
}

describe("paper-trade contradiction monitor", () => {
  it("detects a strong opposite direction and recommends paper exit review", () => {
    const result = detectPaperTradeContradiction(signal, 101, decision("BUY"));
    expect(result).toMatchObject({ observedDirection: "BUY", action: "EXIT_PAPER_SETUP", confidence: 80, confluenceScore: 75 });
    expect(result?.evidence.opposingIndicators).toContain("structure-uptrend");
    expect(result?.reason).toContain("contradicting the original SELL");
  });

  it("recommends tightening the paper stop after a favorable but not decisive reversal", () => {
    const result = detectPaperTradeContradiction(signal, 95, decision("BUY", 65, 60));
    expect(result).toMatchObject({ action: "TIGHTEN_STOP", observedDirection: "BUY" });
    expect(result?.evidence.suggestedStopLoss).toBe(100);
  });

  it("does not trigger for same-direction, weak, or indicator-free evidence", () => {
    expect(detectPaperTradeContradiction(signal, 95, decision("SELL"))).toBeNull();
    expect(detectPaperTradeContradiction(signal, 95, decision("BUY", 59, 80))).toBeNull();
    expect(detectPaperTradeContradiction(signal, 95, { ...decision("BUY"), setupIndicators: [] })).toBeNull();
  });
});
