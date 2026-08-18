import { describe, expect, it, vi } from "vitest";

const select = vi.fn(() => ({
  from: vi.fn(() => ({
    where: vi.fn(async () => []),
  })),
}));
const db = { select, insert: vi.fn(), update: vi.fn() };

vi.mock("./db", () => ({
  getDb: vi.fn(async () => db),
  listStrategyRules: vi.fn(async () => [{ id: 1, title: "Rules", content: "Use confirmation." }]),
  getAllRulesText: vi.fn(async () => "Use confirmation."),
  createStrategyRule: vi.fn(),
}));

vi.mock("./integrations", () => ({
  fetchMarketSeriesBatch: vi.fn(async () => { throw new Error("Twelve Data quota exhausted"); }),
  fetchMarketSnapshot: vi.fn(),
  forensicAnalysis: vi.fn(),
  mirrorToSupabase: vi.fn(),
  sendTelegramMessage: vi.fn(),
}));

import { scanUser } from "./scanner";

describe("scanner unavailable-market behavior", () => {
  it("skips all assets without inserting signals when OHLCV polling fails", async () => {
    const result = await scanUser(1);
    expect(result.created).toBe(0);
    expect(result.tracked).toBe(0);
    expect(result.marketData).toBe("unavailable");
    expect(db.insert).not.toHaveBeenCalled();
  });
});
