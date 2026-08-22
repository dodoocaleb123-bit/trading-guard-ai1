import { describe, expect, it } from "vitest";
import { advanceEntryLocator, createEmptyEntryLocatorState, markEntryLocatorEmitted } from "./entry-locator";

const observation = (overrides: Partial<Parameters<typeof advanceEntryLocator>[0]["observation"]> = {}) => ({
  fingerprint: "default-fingerprint",
  observedAt: "2026-08-22T12:00:00.000Z",
  direction: "BUY" as const,
  confidence: 78,
  confluence: 70,
  marketRegime: "TRENDING_UP",
  eventRisk: "NORMAL" as const,
  geometryFallback: false,
  supportingComponents: ["structure", "momentum"],
  conflictingComponents: [],
  ...overrides,
});

describe("entry locator", () => {
  const now = new Date("2026-08-22T12:05:00.000Z");

  it("qualifies immediately from two independent setup families", () => {
    const result = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "two-families" }), hasOpenSignal: false, now });
    expect(result.ready).toBe(true);
    expect(result.state.status).toBe("READY");
    expect(result.selectedObservation?.direction).toBe("BUY");
  });

  it("qualifies with one strong setup family when the evidence is strong enough", () => {
    const result = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "one-strong", confidence: 82, confluence: 60, supportingComponents: ["MACD line/signal line crossover"] }), hasOpenSignal: false, now });
    expect(result.ready).toBe(true);
    expect(result.reason).toContain("without requiring every catalog indicator");
  });

  it("waits when BUY and SELL evidence are tied", () => {
    const first = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "buy" }), hasOpenSignal: false, now });
    const second = advanceEntryLocator({ previous: first.state, observation: observation({ fingerprint: "sell", direction: "SELL" }), hasOpenSignal: false, now });
    expect(second.ready).toBe(false);
    expect(second.reason).toContain("tied");
  });

  it("does not emit during high-impact risk until two consistent observations and two families exist", () => {
    let state = createEmptyEntryLocatorState();
    const first = advanceEntryLocator({ previous: state, observation: observation({ fingerprint: "one", eventRisk: "HIGH", supportingComponents: ["structure", "momentum"] }), hasOpenSignal: false, now });
    state = first.state;
    expect(first.ready).toBe(false);
    const second = advanceEntryLocator({ previous: state, observation: observation({ fingerprint: "two", eventRisk: "HIGH", supportingComponents: ["structure", "momentum"] }), hasOpenSignal: false, now });
    expect(second.ready).toBe(true);
  });

  it("rejects stale observations without changing to ready", () => {
    const result = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ observedAt: "2026-08-21T00:00:00.000Z" }), hasOpenSignal: false, now });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain("fresh");
  });

  it("suppresses new emission while an active signal exists", () => {
    const result = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "new" }), hasOpenSignal: true, now });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain("Active paper setup");
  });

  it("marks an emitted locator with its fingerprint", () => {
    const state = markEntryLocatorEmitted({ ...createEmptyEntryLocatorState(), snapshotCount: 2 }, "emitted");
    expect(state.status).toBe("EMITTED");
    expect(state.lastEmittedFingerprint).toBe("emitted");
  });
});
