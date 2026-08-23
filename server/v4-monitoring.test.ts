import { describe, expect, it } from "vitest";
import { summarizeV4Monitoring } from "./db";

describe("v4 outcome monitoring", () => {
  it("groups paper outcomes by asset, timeframe, direction, event risk, and geometry", () => {
    const rows = summarizeV4Monitoring([
      {
        asset: "EUR/USD",
        timeframe: "1H",
        direction: "BUY",
        status: "WIN",
        marketSnapshot: JSON.stringify({ entryLocator: { indicatorBucket: "TWO_PLUS" }, fundamentalContext: { eventRisk: "HIGH" }, replacementIntelligence: { decisionTrace: { levelDerivation: { takeProfit: "Next opposing zone is too close for 2R; retained minimum 2R paper target." } } } }),
      },
      {
        asset: "EUR/USD",
        timeframe: "1H",
        direction: "BUY",
        status: "LOSS",
        marketSnapshot: JSON.stringify({ entryLocator: { indicatorBucket: "ONE_STRONG" }, fundamentalContext: { eventRisk: "NORMAL" }, replacementIntelligence: { decisionTrace: { levelDerivation: { takeProfit: "Next opposing zone supports the structural target." } } } }),
      },
    ]);

    expect(rows.asset).toEqual([expect.objectContaining({ key: "EUR/USD", generated: 2, resolved: 2, wins: 1, losses: 1, winRate: 50 })]);
    expect(rows.timeframe).toEqual([expect.objectContaining({ key: "1H", generated: 2 })]);
    expect(rows.direction).toEqual([expect.objectContaining({ key: "BUY", generated: 2 })]);
    expect(rows.eventRisk).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "HIGH", generated: 1, wins: 1 }),
      expect.objectContaining({ key: "NORMAL", generated: 1, losses: 1 }),
    ]));
    expect(rows.geometry).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "2R_FALLBACK", generated: 1 }),
      expect.objectContaining({ key: "STANDARD", generated: 1 }),
    ]));
    expect(rows.indicatorCount).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "ONE_STRONG", generated: 1, losses: 1 }),
      expect.objectContaining({ key: "TWO_PLUS", generated: 1, wins: 1 }),
    ]));
  });

  it("does not infer event risk or geometry from malformed snapshots", () => {
    const rows = summarizeV4Monitoring([{ asset: "BTC/USD", timeframe: "15MIN", direction: "SELL", status: "PENDING", marketSnapshot: "not-json" }]);
    expect(rows.eventRisk).toEqual([expect.objectContaining({ key: "UNKNOWN", generated: 1, resolved: 0, winRate: null })]);
    expect(rows.geometry).toEqual([expect.objectContaining({ key: "STANDARD", generated: 1 })]);
    expect(rows.indicatorCount).toEqual([expect.objectContaining({ key: "UNKNOWN", generated: 1 })]);
  });
});

describe("adaptive ratio performance", () => {
  it("groups authoritative v4 outcomes by selected adaptive ratio", async () => {
    const { summarizeAdaptiveRatioStats } = await import("./db");
    const rows = summarizeAdaptiveRatioStats([
      { riskReward: "3", status: "WIN" },
      { riskReward: "2", status: "LOSS" },
      { riskReward: "1.5", status: "WIN" },
      { riskReward: "1.5", status: "LOSS" },
      { riskReward: "1", status: "PENDING" },
      { riskReward: "9", status: "WIN" },
    ]);
    expect(rows).toEqual([
      expect.objectContaining({ ratio: 3, generated: 1, resolved: 1, wins: 1, losses: 0, winRate: 100 }),
      expect.objectContaining({ ratio: 2, generated: 1, resolved: 1, wins: 0, losses: 1, winRate: 0 }),
      expect.objectContaining({ ratio: 1.5, generated: 2, resolved: 2, wins: 1, losses: 1, winRate: 50 }),
      expect.objectContaining({ ratio: 1, generated: 1, resolved: 0, wins: 0, losses: 0, winRate: null }),
    ]);
  });
});
