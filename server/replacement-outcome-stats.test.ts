import { describe, expect, it } from "vitest";
import { summarizeReplacementOutcomes } from "./db";

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
});
