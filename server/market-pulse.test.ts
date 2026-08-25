import { describe, expect, it } from "vitest";
import { summarizeLiveMarketPulse } from "./db";

describe("live market pulse", () => {
  it("uses the newest decision snapshot per asset and parses its live price metadata", () => {
    const rows = summarizeLiveMarketPulse([
      {
        asset: "EUR/USD",
        timeframe: "1H",
        createdAt: new Date("2026-08-25T20:15:00.000Z"),
        marketSnapshot: JSON.stringify({
          price: 1.1675,
          close: 1.1675,
          interval: "1h",
          trend: "DOWN",
          values: [{ datetime: "2026-08-25 20:00:00", close: "1.16750" }],
        }),
      },
      {
        asset: "EUR/USD",
        timeframe: "15MIN",
        createdAt: new Date("2026-08-25T20:14:00.000Z"),
        marketSnapshot: JSON.stringify({
          price: 1.1674,
          values: [{ datetime: "2026-08-25 20:00:00", close: "1.16740" }],
        }),
      },
      {
        asset: "BTC/USD",
        timeframe: "15MIN",
        createdAt: new Date("2026-08-25T20:16:00.000Z"),
        marketSnapshot: JSON.stringify({
          close: "79132.01",
          interval: "15min",
          values: [{ datetime: "2026-08-25 20:15:00", close: "79132.01" }],
        }),
      },
    ]);

    expect(rows).toEqual([
      {
        asset: "EUR/USD",
        price: 1.1675,
        candleTime: "2026-08-25 20:00:00",
        savedAt: new Date("2026-08-25T20:15:00.000Z"),
        timeframe: "1H",
        interval: "1h",
        trend: "DOWN",
      },
      {
        asset: "BTC/USD",
        price: 79132.01,
        candleTime: "2026-08-25 20:15:00",
        savedAt: new Date("2026-08-25T20:16:00.000Z"),
        timeframe: "15MIN",
        interval: "15min",
        trend: null,
      },
    ]);
  });

  it("fails closed when a snapshot is missing or malformed", () => {
    expect(summarizeLiveMarketPulse([
      {
        asset: "XAU/USD",
        timeframe: "1H",
        createdAt: new Date("2026-08-25T20:15:00.000Z"),
        marketSnapshot: null,
      },
      {
        asset: "GBP/USD",
        timeframe: "15MIN",
        createdAt: new Date("2026-08-25T20:16:00.000Z"),
        marketSnapshot: "not-json",
      },
    ])).toEqual([
      {
        asset: "XAU/USD",
        price: null,
        candleTime: null,
        savedAt: new Date("2026-08-25T20:15:00.000Z"),
        timeframe: "1H",
        interval: null,
        trend: null,
      },
      {
        asset: "GBP/USD",
        price: null,
        candleTime: null,
        savedAt: new Date("2026-08-25T20:16:00.000Z"),
        timeframe: "15MIN",
        interval: null,
        trend: null,
      },
    ]);
  });
});
