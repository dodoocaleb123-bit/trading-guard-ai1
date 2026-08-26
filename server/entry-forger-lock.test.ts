import { describe, expect, it } from "vitest";
import { isEntryForgerBlockingSignal } from "./db";

describe("Entry Forger lock policy", () => {
  it("blocks normal pending signals", () => {
    expect(isEntryForgerBlockingSignal({ status: "PENDING", blocksEntryForger: true })).toBe(true);
  });

  it("blocks every unresolved pending signal regardless of legacy release state", () => {
    expect(isEntryForgerBlockingSignal({ status: "PENDING", blocksEntryForger: false })).toBe(true);
  });

  it("does not treat resolved signals as blockers", () => {
    expect(isEntryForgerBlockingSignal({ status: "WIN", blocksEntryForger: true })).toBe(false);
  });
});
