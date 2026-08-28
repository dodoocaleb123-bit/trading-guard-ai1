import { describe, expect, it } from "vitest";
import { buildContextOnlyState, parseMarketSeriesCandleAt } from "./scanner";
import type { MarketSeries } from "./integrations";

const makeSeries = (interval: "1h" | "4h", datetime?: string): MarketSeries => ({
  symbol: "EUR/USD",
  interval,
  values: [{ datetime: datetime ?? "2026-08-28 00:00:00", open: "1.1", high: "1.2", low: "1.0", close: "1.15" }],
  close: 1.15,
  trend: "UP",
  fetchedAt: "2026-08-28T00:00:05.000Z",
  marketContext: null,
});

describe("v5 context-only timeframe state", () => {
  it("uses the latest candle timestamp when recording a context refresh", () => {
    expect(parseMarketSeriesCandleAt(makeSeries("1h")).toISOString()).toBe("2026-08-28T00:00:00.000Z");
  });

  it("increments refresh count and clears emission-only metrics", () => {
    const state = buildContextOnlyState({
      asset: "XAU/USD",
      timeframe: "4H",
      series: makeSeries("4h"),
      previousSnapshotCount: 8,
    });
    expect(state).toMatchObject({
      status: "WAITING",
      snapshotCount: 9,
      lastDirection: null,
      lastConfidence: null,
      lastConfluence: null,
      lastEmittedAt: null,
    });
    expect(JSON.parse(state.stateJson)).toMatchObject({
      contextOnly: true,
      asset: "XAU/USD",
      timeframe: "4H",
    });
    expect(JSON.parse(state.stateJson).waitReason).toContain("not eligible for signal emission");
  });
});

