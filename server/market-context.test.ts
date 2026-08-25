import { describe, expect, it } from "vitest";
import { buildMultiTimeframeContext, calculateMarketContext } from "./market-context";

describe("market context features", () => {
  const candles = Array.from({ length: 20 }, (_, index) => {
    const close = 1.1 + index * 0.001;
    return {
      datetime: `2026-08-18 ${String(index).padStart(2, "0")}:00:00`,
      open: String(close - 0.0004),
      high: String(close + 0.0006),
      low: String(close - 0.0008),
      close: String(close),
      volume: String(1000 + index),
    };
  });

  it("derives structure, volatility, candle behavior, zones, momentum, and breakout state", () => {
    const context = calculateMarketContext(candles);
    expect(context).not.toBeNull();
    expect(context?.sampleSize).toBe(20);
    expect(context?.marketStructure).toBe("RISING");
    expect(context?.latestCandle.direction).toBe("BULLISH");
    expect(context?.supportResistance.support).toBeLessThan(context?.supportResistance.resistance ?? 0);
    expect(context?.momentum.direction).toBe("BULLISH");
    expect(context?.summary).toContain("Market structure:");
    expect(context?.summary).toContain("Support:");
    expect(context?.summary).toContain("Momentum:");
  });

  it("detects a close above the completed prior resistance range", () => {
    const breakoutCandles = [...candles.slice(0, -1), {
      datetime: "2026-08-18 19:00:00",
      open: "1.1180",
      high: "1.1225",
      low: "1.1178",
      close: "1.1215",
      volume: "2500",
    }];
    const context = calculateMarketContext(breakoutCandles);
    expect(context?.breakoutState).toBe("ABOVE_RESISTANCE");
    expect(context?.priceAction.breakoutOrFakeout).toBe("BREAKOUT");
  });

  it("detects a close below the completed prior support range", () => {
    const breakdownCandles = candles.map((candle, index) => index === candles.length - 1 ? {
      ...candle,
      open: "1.1010",
      high: "1.1012",
      low: "1.0970",
      close: "1.0974",
    } : candle);
    const context = calculateMarketContext(breakdownCandles);
    expect(context?.breakoutState).toBe("BELOW_SUPPORT");
    expect(context?.priceAction.breakoutOrFakeout).toBe("BREAKOUT");
  });

  it("combines opposing-timeframe context without inventing a missing timeframe", () => {
    const context = calculateMarketContext(candles);
    const combined = buildMultiTimeframeContext([
      { interval: "15min", context },
      { interval: "1h", context },
    ], "15min");
    expect(combined).toContain("1h:");
    expect(combined).not.toContain("15min:");
  });
});
