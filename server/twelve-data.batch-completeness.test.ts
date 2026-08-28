import { describe, expect, it } from "vitest";
import { hasCompleteTwelveDataBatch } from "./integrations";

const candle = { datetime: "2026-08-28 00:00:00", open: "1", high: "1.1", low: "0.9", close: "1.05" };

describe("Twelve Data batch completeness", () => {
  it("accepts a usable response for every requested symbol", () => {
    expect(hasCompleteTwelveDataBatch({ "EUR/USD": { values: [candle, candle, candle] }, "XAU/USD": { values: [candle, candle, candle] } }, ["EUR/USD", "XAU/USD"])).toBe(true);
  });

  it("rejects a response missing a symbol or enough candles", () => {
    expect(hasCompleteTwelveDataBatch({ "EUR/USD": { values: [candle, candle, candle] } }, ["EUR/USD", "XAU/USD"])).toBe(false);
    expect(hasCompleteTwelveDataBatch({ "EUR/USD": { values: [candle, candle] }, "XAU/USD": { values: [candle, candle, candle] } }, ["EUR/USD", "XAU/USD"])).toBe(false);
  });
});

