import { describe, expect, it } from "vitest";
import { buildEntryForgerDashboardState, canUseEntryForgerFallback, deriveEntryForgerLevels } from "./entry-forger";
import { formatApprovedTelegramMessage, formatOutcomeTelegramMessage } from "./integrations";

describe("Entry Forger", () => {
  it("selects the cleared BUY target and places the stop at half the target distance", () => {
    const result = deriveEntryForgerLevels({ entry: 100, direction: "BUY", targetBoundary: 110, atr: 1 });
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.takeProfit).toBeLessThan(110);
    expect(result.takeProfit).toBeCloseTo(100 + result.targetDistance, 8);
    expect(result.stopLoss).toBeCloseTo(100 - result.targetDistance / 2, 8);
    expect(result.riskReward).toBe(2);
    expect(result.reason).toContain("before the opposing structural boundary");
  });

  it("mirrors target-first construction for SELL", () => {
    const result = deriveEntryForgerLevels({ entry: 100, direction: "SELL", targetBoundary: 90, atr: 1 });
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.takeProfit).toBeGreaterThan(90);
    expect(result.takeProfit).toBeCloseTo(100 - result.targetDistance, 8);
    expect(result.stopLoss).toBeCloseTo(100 + result.targetDistance / 2, 8);
  });

  it("rejects a boundary on the wrong side or without usable clearance", () => {
    expect(deriveEntryForgerLevels({ entry: 100, direction: "BUY", targetBoundary: 99, atr: 1 }).ready).toBe(false);
    expect(deriveEntryForgerLevels({ entry: 100, direction: "BUY", targetBoundary: 100.0001, atr: 1 }).ready).toBe(false);
    expect(deriveEntryForgerLevels({ entry: 100, direction: "BUY", targetBoundary: null, atr: 1 }).ready).toBe(false);
  });

  it("rejects an impractically tight target even when it is favorable", () => {
    const result = deriveEntryForgerLevels({ entry: 1.16721, direction: "BUY", targetBoundary: 1.1675, atr: 0.0003 });
    expect(result.ready).toBe(false);
    if (!result.ready) expect(result.reason).toContain("executable paper setup");
  });

  it("accepts a target that clears the executable volatility floor", () => {
    const result = deriveEntryForgerLevels({ entry: 1.16721, direction: "BUY", targetBoundary: 1.171, atr: 0.0003 });
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.takeProfit).toBeCloseTo(1.16721 + result.targetDistance, 8);
    expect(result.stopLoss).toBeCloseTo(1.16721 - result.targetDistance / 2, 8);
  });

  it("only enables fallback after a geometry denial and preserves lock and gate safeguards", () => {
    const base = { locatorReady: false, geometryDenied: true, v4Active: true, strategyApproved: true, qualityApproved: true, hasCompleteLevels: true, activeSignal: false };
    expect(canUseEntryForgerFallback(base)).toBe(true);
    expect(canUseEntryForgerFallback({ ...base, locatorReady: true })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, geometryDenied: false })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, strategyApproved: false })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, qualityApproved: false })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, hasCompleteLevels: false })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, activeSignal: true })).toBe(false);
  });

  it("serializes dashboard status and target diagnostics without changing fallback rules", () => {
    const state = buildEntryForgerDashboardState("READY", "Entry Locator denied only the allowed geometry; Entry Forger is eligible.", { targetBoundary: 1.2, targetDistance: 0.01, riskReward: 2 }, new Date("2026-08-25T21:00:00.000Z"));
    expect(state).toEqual({ status: "READY", reason: "Entry Locator denied only the allowed geometry; Entry Forger is eligible.", targetBoundary: 1.2, targetDistance: 0.01, riskReward: 2, updatedAt: "2026-08-25T21:00:00.000Z" });
  });

  it("labels initial and resolved messages by signal source", () => {
    const initial = formatApprovedTelegramMessage({ asset: "EUR/USD", timeframe: "15MIN", direction: "BUY", entry: 1, stopLoss: 0.99, takeProfit: 1.02, confidence: 70, riskReward: 2, generationSource: "ENTRY_FORGER" });
    const outcome = formatOutcomeTelegramMessage({ asset: "EUR/USD", timeframe: "15MIN", direction: "BUY", status: "WIN", entry: 1, stopLoss: 0.99, takeProfit: 1.02, closePrice: 1.02, signalId: 1, generationSource: "ENTRY_FORGER" });
    expect(initial).toContain("ENTRY FORGER");
    expect(outcome).toContain("ENTRY FORGER");
  });
});
