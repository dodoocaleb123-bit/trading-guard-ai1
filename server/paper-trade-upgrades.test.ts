import { describe, expect, it } from "vitest";
import { compareStrongerSameDirectionSetup } from "./paper-trade-upgrades";

const active = {
  id: 14520001,
  asset: "BTC/USD",
  timeframe: "1H",
  direction: "SELL" as const,
  confidence: "66",
  confluenceScore: "60",
  intelligenceComponents: JSON.stringify(["Downtrend is lower peaks and lower troughs"]),
  marketRegime: "FALLING/CONTRACTING/WITHIN_RANGE",
};

const candidate = {
  direction: "SELL" as const,
  confidence: 76,
  confluenceScore: 72,
  entry: 77100,
  stopLoss: 77500,
  takeProfit: 76300,
  riskReward: 2,
  marketRegime: "FALLING/EXPANDING/BELOW_SUPPORT",
  ruleEvidence: ["Downtrend is lower peaks and lower troughs"],
  decisionTrace: {
    supportingComponents: ["Downtrend is lower peaks and lower troughs", "Moving averages confirm trend direction"],
    conflictingComponents: [],
  },
};

describe("linked stronger paper setup comparison", () => {
  it("accepts a materially stronger same-direction candidate", () => {
    const upgrade = compareStrongerSameDirectionSetup(active, candidate);
    expect(upgrade).not.toBeNull();
    expect(upgrade?.score).toBeGreaterThanOrEqual(3);
    expect(upgrade?.evidence.improvements).toEqual(expect.arrayContaining([
      "confidence increased by 10 points",
      "confluence increased by 12 points",
      "strong indicator families increased from 1 to 2",
    ]));
  });

  it("rejects opposite-direction candidates because contradiction monitoring owns that path", () => {
    expect(compareStrongerSameDirectionSetup(active, { ...candidate, direction: "BUY" })).toBeNull();
  });

  it("rejects a small same-direction change that would create upgrade noise", () => {
    expect(compareStrongerSameDirectionSetup(active, {
      ...candidate,
      confidence: 67,
      confluenceScore: 61,
      decisionTrace: { supportingComponents: ["Downtrend is lower peaks and lower troughs"], conflictingComponents: ["Support and resistance are decision levels"] },
    })).toBeNull();
  });

  it("rejects a candidate with a ratio outside the allowed adaptive set", () => {
    expect(compareStrongerSameDirectionSetup(active, { ...candidate, riskReward: 1.25 })).toBeNull();
  });

  it("accepts each configured adaptive ratio when the candidate is otherwise stronger", () => {
    for (const riskReward of [1, 1.5, 2, 3]) {
      expect(compareStrongerSameDirectionSetup(active, { ...candidate, riskReward })).not.toBeNull();
    }
  });
});
