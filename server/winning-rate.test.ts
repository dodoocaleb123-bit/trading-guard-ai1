import { describe, expect, it } from "vitest";
import { buildWinningRateReconciliation, summarizeWinningRate } from "./db";

describe("Winning Rate analytics", () => {
  it("includes authoritative v4 rows in overall, asset, timeframe, and confidence metrics", () => {
    const result = summarizeWinningRate([
      { version: "forex-trading-combined-document-v4", asset: "BTC/USD", timeframe: "15MIN", confidence: "68", status: "PENDING" },
      { version: "forex-trading-combined-document-v4", asset: "BTC/USD", timeframe: "1H", confidence: "77", status: "WIN" },
      { version: "forex-trading-combined-document-v4", asset: "EUR/USD", timeframe: "1H", confidence: "92", status: "LOSS" },
    ]);
    const v4 = result.versions.find((version) => version.version === "forex-trading-combined-document-v4");
    expect(v4?.overall).toMatchObject({ generated: 3, resolved: 2, wins: 1, losses: 1, winRate: 50 });
    expect(v4?.assets.find((metric) => metric.key === "BTC/USD")).toMatchObject({ generated: 2, resolved: 1, wins: 1, losses: 0, winRate: 100 });
    expect(v4?.timeframes.find((metric) => metric.key === "BTC/USD · 15MIN")).toMatchObject({ generated: 1, resolved: 0, winRate: null });
    expect(v4?.confidenceBands.find((metric) => metric.key === "69-60")).toMatchObject({ generated: 1, resolved: 0, winRate: null });
  });

  it("reports records outside the recognized version set without changing source totals", () => {
    expect(buildWinningRateReconciliation(3560, 3560)).toEqual({ sourceTotal: 3560, includedTotal: 3560, excludedTotal: 0, status: "RECONCILED" });
    expect(buildWinningRateReconciliation(3869, 3560)).toEqual({ sourceTotal: 3869, includedTotal: 3560, excludedTotal: 309, status: "MISMATCH" });
  });
});
