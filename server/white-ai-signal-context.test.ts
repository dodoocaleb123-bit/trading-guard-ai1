import { describe, expect, it } from "vitest";
import { buildWhiteAiSignalContext, formatWhiteAiSignalFallback } from "./routers";

describe("White AI signal explanation context", () => {
  it("matches normalized asset labels and calculates the recorded geometry", () => {
    const context = buildWhiteAiSignalContext([
      {
        id: 16920002,
        asset: "xauusd",
        timeframe: "5MIN",
        direction: "SELL",
        entry: "4586.07550000",
        stopLoss: "4588.86790000",
        takeProfit: "4580.60400000",
        riskReward: "1.96",
        confidence: "73.00",
        confluenceScore: "69.00",
        rationale: "Stop beyond the recorded invalidation structure.",
        status: "WIN",
        outcomeNote: "TP hit",
        openedAt: "2026-08-28T01:35:05Z",
        closedAt: "2026-08-28T01:45:11Z",
        telegramDelivery: { status: "DELIVERED", deliveredAt: "2026-08-28T01:35:06Z" },
      },
    ], "XAU/USD");

    expect(context.found).toBe(true);
    if (context.found) {
      expect(context.stopDistance).toBeCloseTo(2.7924, 4);
      expect(context.targetDistance).toBeCloseTo(5.4715, 4);
      expect(context.calculatedRiskReward).toBeCloseTo(1.9591, 3);
      expect(formatWhiteAiSignalFallback(context)).toContain("approximately 1:1.96");
    }
  });

  it("does not invent an explanation when the signal is absent", () => {
    const context = buildWhiteAiSignalContext([], "XAU/USD");
    expect(context.found).toBe(false);
    expect(formatWhiteAiSignalFallback(context)).toContain("could not find a persisted v5 signal");
  });
});

