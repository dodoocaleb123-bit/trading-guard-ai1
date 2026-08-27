import { describe, expect, it } from "vitest";
import { summarizeV5SourceStats } from "./db";

describe("v5 source performance", () => {
  it("keeps Entry Locator and Entry Forger metrics independent", () => {
    expect(summarizeV5SourceStats([
      { generationMode: "ENTRY_LOCATOR_V5", status: "WIN" },
      { generationMode: "ENTRY_LOCATOR_V5", status: "LOSS" },
      { generationMode: "ENTRY_LOCATOR_V5", status: "PENDING" },
      { generationMode: "ENTRY_FORGER_V5", status: "WIN" },
      { generationMode: "ENTRY_FORGER_V5", status: "PENDING" },
    ])).toEqual([
      { source: "ENTRY_LOCATOR", generated: 3, resolved: 2, wins: 1, losses: 1, winRate: 50 },
      { source: "ENTRY_FORGER", generated: 2, resolved: 1, wins: 1, losses: 0, winRate: 100 },
    ]);
  });

  it("does not invent outcome rates when a source has only pending signals", () => {
    expect(summarizeV5SourceStats([{ generationMode: "ENTRY_FORGER_V5", status: "PENDING" }])).toEqual([
      { source: "ENTRY_LOCATOR", generated: 0, resolved: 0, wins: 0, losses: 0, winRate: null },
      { source: "ENTRY_FORGER", generated: 1, resolved: 0, wins: 0, losses: 0, winRate: null },
    ]);
  });
});
