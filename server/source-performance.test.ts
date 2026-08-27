import { describe, expect, it } from "vitest";
import { summarizeV5SourceStats } from "./db";

describe("v5 Locator source performance", () => {
  it("summarizes only Locator-generated v5 signals", () => {
    expect(summarizeV5SourceStats([
      { generationMode: "ENTRY_LOCATOR_V5", status: "WIN" },
      { generationMode: "ENTRY_LOCATOR_V5", status: "LOSS" },
      { generationMode: "ENTRY_LOCATOR_V5", status: "PENDING" },
      { generationMode: "RETIRED_FALLBACK_MODE", status: "WIN" },
      { generationMode: "RETIRED_FALLBACK_MODE", status: "PENDING" },
    ])).toEqual([
      { source: "ENTRY_LOCATOR", generated: 3, resolved: 2, wins: 1, losses: 1, winRate: 50 },
    ]);
  });

  it("does not invent an outcome rate when Locator signals are pending", () => {
    expect(summarizeV5SourceStats([{ generationMode: "ENTRY_LOCATOR_V5", status: "PENDING" }])).toEqual([
      { source: "ENTRY_LOCATOR", generated: 1, resolved: 0, wins: 0, losses: 0, winRate: null },
    ]);
  });
});
