import { describe, expect, it } from "vitest";
import { summarizeScannerCadence } from "./scheduler-status";

describe("scanner cadence diagnostics", () => {
  it("counts skipped five-minute windows between received cycles", () => {
    const result = summarizeScannerCadence([
      { id: 1, runKey: "trading-guard-scanner:1", taskUid: "external-cron-job", startedAt: "2026-08-25T02:40:00.000Z", status: "SUCCEEDED", duplicateCallbacks: 1 },
      { id: 2, runKey: "trading-guard-scanner:3", taskUid: "external-cron-job", startedAt: "2026-08-25T02:50:00.000Z", status: "FAILED", duplicateCallbacks: 2 },
    ]);
    expect(result.receivedCycles).toBe(2);
    expect(result.observedWindows).toBe(3);
    expect(result.skippedWindows).toBe(1);
    expect(result.completedCycles).toBe(1);
    expect(result.failedCycles).toBe(1);
    expect(result.duplicateSuppressed).toBe(3);
    expect(result.averageIntervalMinutes).toBe(10);
    expect(result.lastSource).toBe("EXTERNAL_TRIGGER");
  });

  it("deduplicates shared buckets while preserving source counts", () => {
    const result = summarizeScannerCadence([
      { id: 1, runKey: "trading-guard-scanner:1", taskUid: "external-cron-job", startedAt: "2026-08-25T02:40:00.000Z", status: "SUCCEEDED" },
      { id: 2, runKey: "trading-guard-scanner:1", taskUid: "heartbeat-task", startedAt: "2026-08-25T02:40:03.000Z", status: "SUCCEEDED", duplicateCallbacks: 1 },
      { id: 3, runKey: "trading-guard-scanner:2", taskUid: "heartbeat-task", startedAt: "2026-08-25T02:45:00.000Z", status: "SUCCEEDED" },
    ]);
    expect(result.receivedCycles).toBe(2);
    expect(result.externalCycles).toBe(1);
    expect(result.heartbeatCycles).toBe(1);
    expect(result.duplicateSuppressed).toBe(1);
  });

  it("returns a safe empty state", () => {
    expect(summarizeScannerCadence([])).toMatchObject({ receivedCycles: 0, skippedWindows: 0, duplicateSuppressed: 0, lastRunAt: null });
  });
});
