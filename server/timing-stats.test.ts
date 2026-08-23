import { describe, expect, it } from "vitest";
import { summarizeBestDaysToTrade, summarizeBestTimeToTrade } from "./db";

const base = { asset: "EUR/USD", timeframe: "1H", version: "replacement-forex-v1" };

describe("best timing paper analytics", () => {
  it("groups signals by UTC hour and separates versions", () => {
    const rows = [
      { ...base, status: "WIN", openedAt: new Date("2026-08-20T09:15:00.000Z") },
      { ...base, status: "LOSS", openedAt: new Date("2026-08-20T09:45:00.000Z") },
      { ...base, version: "forex-trading-combined-document-v2", status: "WIN", openedAt: new Date("2026-08-20T09:45:00.000Z") },
      { ...base, version: "forex-trading-combined-document-v4", status: "WIN", openedAt: new Date("2026-08-20T09:45:00.000Z") },
    ];
    const result = summarizeBestTimeToTrade(rows);
    const v1 = result.groups.find((group) => group.version === "replacement-forex-v1" && group.asset === "EUR/USD" && group.timeframe === "1H")!;
    const nine = v1.buckets.find((bucket) => bucket.key === "9")!;
    expect(nine).toMatchObject({ generated: 2, resolved: 2, takeProfitHits: 1, stopLossHits: 1, winRate: 50 });
    const v2 = result.groups.find((group) => group.version === "forex-trading-combined-document-v2" && group.asset === "EUR/USD" && group.timeframe === "1H")!;
    expect(v2.buckets.find((bucket) => bucket.key === "9")).toMatchObject({ generated: 1, takeProfitHits: 1, stopLossHits: 0 });
    const v4 = result.groups.find((group) => group.version === "forex-trading-combined-document-v4" && group.asset === "EUR/USD" && group.timeframe === "1H")!;
    expect(v4.buckets.find((bucket) => bucket.key === "9")).toMatchObject({ generated: 1, resolved: 1, takeProfitHits: 1, winRate: 100 });
  });

  it("calculates win rate as take-profit hits divided by resolved signals", () => {
    const rows = [
      { ...base, status: "WIN", openedAt: new Date("2026-08-20T10:00:00.000Z") },
      { ...base, status: "WIN", openedAt: new Date("2026-08-20T10:15:00.000Z") },
      { ...base, status: "WIN", openedAt: new Date("2026-08-20T10:30:00.000Z") },
      { ...base, status: "LOSS", openedAt: new Date("2026-08-20T10:45:00.000Z") },
    ];
    const bucket = summarizeBestTimeToTrade(rows).groups.find((group) => group.version === base.version && group.asset === base.asset && group.timeframe === base.timeframe)!.buckets.find((item) => item.key === "10")!;
    expect(bucket).toMatchObject({ resolved: 4, takeProfitHits: 3, stopLossHits: 1, winRate: 75 });
  });

  it("groups signals by Monday-first UTC weekday", () => {
    const result = summarizeBestDaysToTrade([{ ...base, status: "WIN", openedAt: new Date("2026-08-17T01:00:00.000Z") }]);
    const group = result.groups.find((item) => item.version === base.version && item.asset === base.asset && item.timeframe === base.timeframe)!;
    expect(group.buckets[0]).toMatchObject({ key: "0", label: "Monday", generated: 1, resolved: 1, takeProfitHits: 1, winRate: 100 });
    expect(group.buckets).toHaveLength(7);
  });
});
