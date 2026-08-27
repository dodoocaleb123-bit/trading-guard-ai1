import { describe, expect, it } from "vitest";
import { calculateMarketContext } from "./market-context";
import { detectDocumentPatternIndicators } from "./pattern-detectors";
import { buildReplacementKnowledgeModelV3, buildReplacementKnowledgeModelV5, detectSetupIndicators } from "./replacement-intelligence";

const bullishEngulfingValues = [
  { open: 1.1000, high: 1.1020, low: 1.0980, close: 1.1005, volume: 1000 },
  { open: 1.1005, high: 1.1015, low: 1.0975, close: 1.0990, volume: 1000 },
  { open: 1.0990, high: 1.1000, low: 1.0960, close: 1.0970, volume: 1000 },
  { open: 1.0970, high: 1.0980, low: 1.0940, close: 1.0950, volume: 1000 },
  { open: 1.0945, high: 1.1015, low: 1.0935, close: 1.1005, volume: 1400 },
];

describe("document pattern detectors", () => {
  it("detects a bullish engulfing candle from scanner OHLCV values", () => {
    const context = calculateMarketContext(bullishEngulfingValues)!;
    const patterns = detectDocumentPatternIndicators(bullishEngulfingValues, context);
    expect(patterns.some((pattern) => pattern.id === "bullish-engulfing" && pattern.direction === "BUY")).toBe(true);
  });

  it("returns no pattern evidence when the scanner history is insufficient", () => {
    const values = bullishEngulfingValues.slice(-2);
    const context = calculateMarketContext(bullishEngulfingValues)!;
    expect(detectDocumentPatternIndicators(values, context)).toEqual([]);
  });

  it("adds pattern evidence to v5 but leaves the v3 baseline unchanged", () => {
    const context = calculateMarketContext(bullishEngulfingValues)!;
    const v3 = detectSetupIndicators({ market: { asset: "EUR/USD", close: 1.1005, interval: "15min", values: bullishEngulfingValues }, context }, buildReplacementKnowledgeModelV3());
    const v5 = detectSetupIndicators({ market: { asset: "EUR/USD", close: 1.1005, interval: "15min", values: bullishEngulfingValues }, context }, buildReplacementKnowledgeModelV5());
    expect(v3.some((indicator) => indicator.id === "bullish-engulfing")).toBe(false);
    expect(v5.some((indicator) => indicator.id === "bullish-engulfing")).toBe(true);
    expect(v5.find((indicator) => indicator.id === "bullish-engulfing")?.source.document).toBe("Forex trading.docx");
  });

  it("bounds total directional pattern contribution so patterns cannot dominate v5", () => {
    const context = calculateMarketContext(bullishEngulfingValues)!;
    const indicators = detectSetupIndicators({ market: { asset: "EUR/USD", close: 1.1005, interval: "15min", values: bullishEngulfingValues }, context }, buildReplacementKnowledgeModelV5());
    for (const direction of ["BUY", "SELL"] as const) {
      const total = indicators.filter((indicator) => indicator.family === "PATTERN" && indicator.direction === direction).reduce((sum, indicator) => sum + indicator.contribution, 0);
      expect(total).toBeLessThanOrEqual(3);
    }
  });
});
