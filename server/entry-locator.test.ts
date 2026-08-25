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

  it("qualifies at the shared 60% confidence and 45% confluence boundary", () => {
    const result = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "exact-quality", confidence: 60, confluence: 45 }), hasOpenSignal: false, now });
    expect(result.ready).toBe(true);
    expect(result.state.status).toBe("READY");
  });

  it("rejects a directional setup below either shared quality minimum", () => {
    const lowConfidence = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "low-confidence", confidence: 59, confluence: 100 }), hasOpenSignal: false, now });
    const lowConfluence = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "low-confluence", confidence: 60, confluence: 44 }), hasOpenSignal: false, now });
    expect(lowConfidence.ready).toBe(false);
    expect(lowConfidence.reason).toContain("60%/45%");
    expect(lowConfluence.ready).toBe(false);
    expect(lowConfluence.reason).toContain("60%/45%");
  });

  it("qualifies with one strong setup family when the evidence is strong enough", () => {
    const result = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "one-strong", confidence: 82, confluence: 60, supportingComponents: ["MACD line/signal line crossover"] }), hasOpenSignal: false, now });
    expect(result.ready).toBe(true);
    expect(result.reason).toContain("without requiring every catalog indicator");
  });

  it("accumulates a no-indicator snapshot and qualifies when later directional evidence appears", () => {
    const first = advanceEntryLocator({ previous: createEmptyEntryLocatorState(), observation: observation({ fingerprint: "neutral-first", direction: "NEUTRAL", confidence: 0, confluence: 0, supportingComponents: [], indicatorEvidence: [] }), hasOpenSignal: false, now });
    expect(first.ready).toBe(false);
    expect(first.reason).toContain("accumulating");
    const second = advanceEntryLocator({ previous: first.state, observation: observation({ fingerprint: "later-buy", confidence: 82, confluence: 60, supportingComponents: ["structure"] }), hasOpenSignal: false, now: new Date("2026-08-22T12:10:00.000Z") });
    expect(second.ready).toBe(true);
    expect(second.state.snapshotCount).toBe(2);
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
