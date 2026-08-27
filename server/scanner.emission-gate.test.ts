import { describe, expect, it } from "vitest";
import { canEmitV5Locator } from "./scanner";

describe("v5 Entry Locator emission gate", () => {
  it("does not emit when the Locator is ready but the v5 judgment is not approved", () => {
    expect(canEmitV5Locator({ locatorReady: true, strategyApproved: false, levelsComplete: true })).toBe(false);
  });

  it("does not emit when the v5 judgment is approved but levels are incomplete", () => {
    expect(canEmitV5Locator({ locatorReady: true, strategyApproved: true, levelsComplete: false })).toBe(false);
  });

  it("does not emit when structural geometry is invalid", () => {
    expect(canEmitV5Locator({ locatorReady: true, strategyApproved: true, levelsComplete: true, geometryValid: false })).toBe(false);
  });

  it("emits only when readiness, approval, complete levels, and geometry all pass", () => {
    expect(canEmitV5Locator({ locatorReady: true, strategyApproved: true, levelsComplete: true, geometryValid: true })).toBe(true);
  });
});
