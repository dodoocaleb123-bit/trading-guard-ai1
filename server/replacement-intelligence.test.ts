import { describe, expect, it } from "vitest";
import { buildReplacementKnowledgeModel, evaluateReplacementIntelligence } from "./replacement-intelligence";
import { calculateMarketContext } from "./market-context";

describe("replacement PDF-derived intelligence", () => {
  const candles = Array.from({ length: 40 }, (_, index) => {
    const close = 1.1 + index * 0.001;
    return { datetime: `2026-08-18 ${String(index).padStart(2, "0")}:00:00`, open: close - 0.0004, high: close + 0.0007, low: close - 0.0006, close, volume: 1000 + index * 50 };
  });

  it("contains source-linked concepts from the combined Forex document", () => {
    const model = buildReplacementKnowledgeModel();
    expect(model.sourceDocument).toBe("Forex trading.docx");
    expect(model.id).toBe("forex-trading-combined-document-v2");
    expect(model.nodes.length).toBeGreaterThan(8);
    expect(model.nodes.some((node) => node.concept.includes("higher peaks"))).toBe(true);
    expect(model.nodes.every((node) => node.source.passage.length > 20)).toBe(true);
  });

  it("makes a paper direction from enriched market context and preserves a source trace", () => {
    const marketContext = calculateMarketContext(candles);
    expect(marketContext?.indicators.rsi14).toBeDefined();
    expect(marketContext?.chartDetails.chartType).toBe("JAPANESE_CANDLESTICK");
    const decision = evaluateReplacementIntelligence({ close: candles.at(-1)!.close, interval: "1h", marketContext: { ...marketContext!, multiTimeframeAlignment: { companionInterval: "15min", structure: "ALIGNED", momentum: "ALIGNED", breakout: "ALIGNED" } } });
    expect(["BUY", "SELL"]).toContain(decision.direction);
    expect(decision.matchedNodes.some((node) => node.id === "moving-average-alignment" || node.id === "oscillator-confirmation" || node.id === "higher-timeframe-alignment")).toBe(true);
    expect(decision.marketRegime).toContain("ALIGNED");
    expect(decision.matchedNodes.length).toBeGreaterThan(0);
    expect(decision.sourceTrace[0]?.document).toBe("Forex trading.docx");
    expect(decision.explanation).toContain("source-linked observations");
    expect(decision.adjustments).toContain("replacement v2");
  });

  it("produces a SELL from bearish structure and momentum instead of a generic BUY fallback", () => {
    const bearishCandles = Array.from({ length: 40 }, (_, index) => {
      const close = 1.2 - index * 0.001;
      return { datetime: `2026-08-18 ${String(index).padStart(2, "0")}:00:00`, open: close + 0.0004, high: close + 0.0006, low: close - 0.0007, close, volume: 1400 + index * 30 };
    });
    const marketContext = calculateMarketContext(bearishCandles);
    const decision = evaluateReplacementIntelligence({ close: bearishCandles.at(-1)!.close, interval: "1h", marketContext: { ...marketContext!, multiTimeframeAlignment: { companionInterval: "15min", structure: "ALIGNED", momentum: "ALIGNED", breakout: "ALIGNED" } } });
    expect(decision.direction).toBe("SELL");
    expect(decision.matchedNodes.some((node) => node.id === "structure-downtrend")).toBe(true);
    expect(decision.explanation).toContain("Downtrend is lower peaks and lower troughs");
  });

  it("documents a source-grounded tie break rather than silently defaulting to BUY", () => {
    const marketContext = calculateMarketContext(candles);
    const decision = evaluateReplacementIntelligence({ close: candles.at(-1)!.close, interval: "1h", marketContext: { ...marketContext!, multiTimeframeAlignment: { companionInterval: "15min", structure: "ALIGNED", momentum: "ALIGNED", breakout: "ALIGNED" } } });
    if (decision.buyScore === decision.sellScore) expect(decision.explanation).toContain("source-grounded tie-break");
  });
});
