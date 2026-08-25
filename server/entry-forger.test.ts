import { describe, expect, it } from "vitest";
import { canUseEntryForgerFallback, deriveEntryForgerLevels } from "./entry-forger";
import { formatApprovedTelegramMessage, formatOutcomeTelegramMessage } from "./integrations";

describe("Entry Forger", () => {
  it("selects a favorable target and calculates the stop at half the target distance for BUY", () => {
    const result = deriveEntryForgerLevels({ entry: 100, direction: "BUY", targetBoundary: 110, atr: 1 });
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.takeProfit).toBeLessThan(110);
    expect(result.stopLoss).toBeCloseTo(100 - result.targetDistance / 2, 8);
    expect(result.riskReward).toBe(2);
  });

  it("mirrors target-first construction for SELL", () => {
    const result = deriveEntryForgerLevels({ entry: 100, direction: "SELL", targetBoundary: 90, atr: 1 });
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.takeProfit).toBeGreaterThan(90);
    expect(result.stopLoss).toBeCloseTo(100 + result.targetDistance / 2, 8);
  });

  it("rejects a boundary on the wrong side or without usable clearance", () => {
    expect(deriveEntryForgerLevels({ entry: 100, direction: "BUY", targetBoundary: 99, atr: 1 }).ready).toBe(false);
    expect(deriveEntryForgerLevels({ entry: 100, direction: "BUY", targetBoundary: 100.0001, atr: 1 }).ready).toBe(false);
    expect(deriveEntryForgerLevels({ entry: 100, direction: "BUY", targetBoundary: null, atr: 1 }).ready).toBe(false);
  });

  it("only enables fallback after a geometry denial and preserves lock and gate safeguards", () => {
    const base = { locatorReady: false, geometryDenied: true, v4Active: true, strategyApproved: true, hasCompleteLevels: true, activeSignal: false };
    expect(canUseEntryForgerFallback(base)).toBe(true);
    expect(canUseEntryForgerFallback({ ...base, locatorReady: true })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, geometryDenied: false })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, strategyApproved: false })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, hasCompleteLevels: false })).toBe(false);
    expect(canUseEntryForgerFallback({ ...base, activeSignal: true })).toBe(false);
  });

  it("labels initial and resolved messages by signal source", () => {
    const initial = formatApprovedTelegramMessage({ asset: "EUR/USD", timeframe: "15MIN", direction: "BUY", entry: 1, stopLoss: 0.99, takeProfit: 1.02, confidence: 70, riskReward: 2, generationSource: "ENTRY_FORGER" });
    const outcome = formatOutcomeTelegramMessage({ asset: "EUR/USD", timeframe: "15MIN", direction: "BUY", status: "WIN", entry: 1, stopLoss: 0.99, takeProfit: 1.02, closePrice: 1.02, signalId: 1, generationSource: "ENTRY_FORGER" });
    expect(initial).toContain("ENTRY FORGER");
    expect(outcome).toContain("ENTRY FORGER");
  });
});
