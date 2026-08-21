import { describe, expect, it } from "vitest";
import { summarizeChatSignals } from "./routers";

describe("interactive chat paper context", () => {
  it("summarizes generated, resolved, TP, SL, and win-rate metrics by asset", () => {
    expect(summarizeChatSignals([
      { asset: "XAU/USD", status: "WIN" },
      { asset: "XAU/USD", status: "LOSS" },
      { asset: "XAU/USD", status: "PENDING" },
      { asset: "EUR/USD", status: "WIN" },
    ])).toEqual([
      { asset: "XAU/USD", generated: 3, resolved: 2, wins: 1, losses: 1, winRate: 50 },
      { asset: "EUR/USD", generated: 1, resolved: 1, wins: 1, losses: 0, winRate: 100 },
    ]);
  });

  it("does not invent a win rate when an asset has no resolved outcomes", () => {
    expect(summarizeChatSignals([{ asset: "BTC/USD", status: "PENDING" }])).toEqual([
      { asset: "BTC/USD", generated: 1, resolved: 0, wins: 0, losses: 0, winRate: null },
    ]);
  });
});
