import { describe, expect, it } from "vitest";
import { buildWhiteAiZoneContext, formatWhiteAiZoneFallback } from "./routers";

describe("White AI persisted v5 zone context", () => {
  it("extracts the latest persisted locator levels for an asset and timeframe", () => {
    const context = buildWhiteAiZoneContext([
      {
        asset: "BTC/USD",
        timeframe: "1H",
        status: "WAITING",
        snapshotCount: 4,
        lastSnapshotAt: "2026-08-28T02:00:00.000Z",
        stateJson: JSON.stringify({ snapshots: [{ observedAt: "2026-08-28T02:00:00.000Z", nextResistance: 82000, nextSupport: 79500, targetBoundary: 83000, breakoutState: "WITHIN_RANGE", supportingComponents: ["hierarchical-zones"], indicatorEvidence: ["support-resistance"] }] }),
      },
    ], "BTC/USD", "1H");

    expect(context).toMatchObject({ asset: "BTC/USD", timeframe: "1H", found: true, status: "WAITING", nextResistance: 82000, nextSupport: 79500, targetBoundary: 83000, breakoutState: "WITHIN_RANGE" });
    expect(formatWhiteAiZoneFallback(context)).toContain("Next resistance/opposing upper level: 82000");
    expect(formatWhiteAiZoneFallback(context)).toContain("paper trading only — UNVALIDATED");
  });

  it("does not invent levels when the requested state is unavailable", () => {
    const context = buildWhiteAiZoneContext([], "BTC/USD", "1H");
    const fallback = formatWhiteAiZoneFallback(context);
    expect(fallback).toContain("could not find a persisted v5 Entry Locator state");
    expect(fallback).toContain("will not invent zone levels");
  });
});
