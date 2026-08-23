import { describe, expect, it } from "vitest";
import { summarizeReplacementOutcomes, summarizeWinningRate } from "./db";

describe("replacement outcome statistics", () => {
  it("aggregates by component and market regime without losing paper statuses", () => {
    const result = summarizeReplacementOutcomes([
      { status: "WIN", intelligenceComponents: JSON.stringify(["trend-alignment", "momentum"]), marketRegime: "TRENDING", confidence: "80" },
      { status: "LOSS", intelligenceComponents: JSON.stringify(["trend-alignment"]), marketRegime: "TRENDING", confidence: "80" },
      { status: "PENDING", intelligenceComponents: JSON.stringify(["momentum"]), marketRegime: "RANGING", confidence: "64" },
      { status: "INVALIDATED", intelligenceComponents: "not-json", marketRegime: null, confidence: "55" },
    ]);

    expect(result.total).toBe(4);
    expect(result.validation).toMatchObject({ resolved: 2, wins: 1, losses: 1, pending: 1, invalidated: 1, winRate: 50, reviewThreshold: 50, reviewReady: false, reviewStatus: "COLLECTING_EVIDENCE" });
    expect(result.confidenceBands.find((item) => item.key === "75-89")).toMatchObject({ total: 2, resolved: 2, winRate: 50 });
    expect(result.components.find((item) => item.key === "trend-alignment")).toMatchObject({ total: 2, wins: 1, losses: 1, resolved: 2, winRate: 50 });
    expect(result.components.find((item) => item.key === "momentum")).toMatchObject({ total: 2, wins: 1, pending: 1, resolved: 1, winRate: 100 });
    expect(result.regimes.find((item) => item.key === "TRENDING")).toMatchObject({ total: 2, resolved: 2, winRate: 50 });
    expect(result.regimes.find((item) => item.key === "UNKNOWN")).toMatchObject({ total: 1, invalidated: 1 });
  });

  it("returns an empty collecting state before the first replacement outcome", () => {
    expect(summarizeReplacementOutcomes([])).toMatchObject({ total: 0, components: [], regimes: [], confidenceBands: [], validation: { resolved: 0, pending: 0, winRate: null, reviewThreshold: 50, reviewReady: false, reviewStatus: "COLLECTING_EVIDENCE" } });
  });

  it("keeps v1 through v4 separate across assets, timeframes, and requested confidence bands", () => {
    const result = summarizeWinningRate([
      { version: "replacement-forex-v1", asset: "EUR/USD", timeframe: "15MIN", confidence: "95", status: "WIN" },
      { version: "replacement-forex-v1", asset: "EUR/USD", timeframe: "15MIN", confidence: "85", status: "LOSS" },
      { version: "replacement-forex-v1", asset: "BTC/USD", timeframe: "1H", confidence: "65", status: "PENDING" },
      { version: "forex-trading-combined-document-v2", asset: "EUR/USD", timeframe: "15MIN", confidence: "95", status: "LOSS" },
      { version: "forex-trading-combined-document-v2", asset: "XAU/USD", timeframe: "1H", confidence: "75", status: "WIN" },
      { version: "forex-trading-combined-document-v4", asset: "BTC/USD", timeframe: "15MIN", confidence: "84", status: "PENDING" },
      { version: "forex-trading-combined-document-v4", asset: "BTC/USD", timeframe: "1H", confidence: "92", status: "WIN" },
    ]);
    const v1 = result.versions.find((version) => version.version === "replacement-forex-v1")!;
    const v2 = result.versions.find((version) => version.version === "forex-trading-combined-document-v2")!;
    const v4 = result.versions.find((version) => version.version === "forex-trading-combined-document-v4")!;
    expect(v1.overall).toMatchObject({ generated: 3, resolved: 2, wins: 1, losses: 1, winRate: 50 });
    expect(v2.overall).toMatchObject({ generated: 2, resolved: 2, wins: 1, losses: 1, winRate: 50 });
    expect(v4.overall).toMatchObject({ generated: 2, resolved: 1, wins: 1, losses: 0, winRate: 100 });
    expect(v4.assets.find((item) => item.key === "BTC/USD")).toMatchObject({ generated: 2, resolved: 1, winRate: 100 });
    expect(v4.timeframes.find((item) => item.key === "BTC/USD · 15MIN")).toMatchObject({ generated: 1, resolved: 0, winRate: null });
    expect(v1.assets.find((item) => item.key === "EUR/USD")).toMatchObject({ generated: 2, resolved: 2, winRate: 50 });
    expect(v1.timeframes.find((item) => item.key === "BTC/USD · 1H")).toMatchObject({ generated: 1, resolved: 0, wins: 0, losses: 0, winRate: null });
    expect(v1.confidenceBands.find((item) => item.key === "100-90")).toMatchObject({ generated: 1, wins: 1, resolved: 1, winRate: 100 });
    expect(v1.confidenceBands.find((item) => item.key === "89-80")).toMatchObject({ generated: 1, losses: 1, resolved: 1, winRate: 0 });
    expect(v2.confidenceBands.find((item) => item.key === "79-70")).toMatchObject({ generated: 1, wins: 1, resolved: 1, winRate: 100 });
    expect(result.confidenceBandLabels).toEqual(["100-90", "89-80", "79-70", "69-60", "59-40"]);
    expect(v1.confidenceByAssetTimeframe).toHaveLength(4 * 2 * 6);
    expect(v1.confidenceByAssetTimeframe.find((item) => item.key === "EUR/USD · 15MIN · 100-90")).toMatchObject({ asset: "EUR/USD", timeframe: "15MIN", confidenceBand: "100-90", generated: 1, wins: 1, resolved: 1, winRate: 100 });
    expect(v1.confidenceByAssetTimeframe.find((item) => item.key === "BTC/USD · 1H · 69-60")).toMatchObject({ generated: 1, resolved: 0, winRate: null });
  });
});
