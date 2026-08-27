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
    expect(result.runs[0].classification).toBe("FAILED");
    expect(result.runs[1].classification).toBe("COMPLETED_WITH_DUPLICATES");
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
    expect(result.runs[1].classification).toBe("COMPLETED_WITH_DUPLICATES");
  });

  it("classifies the latest Twelve Data quota issue by interval and source", () => {
    const result = summarizeScannerCadence([
      { id: 10, runKey: "trading-guard-scanner:10", taskUid: "external-cron-job", startedAt: "2026-08-25T17:00:00.000Z", status: "SUCCEEDED", marketData: "unavailable", error: "Twelve Data 15min unavailable: Request failed with status code 429 | Twelve Data 1h unavailable: Request failed with status code 429 | Twelve Data 4h unavailable: Request failed with status code 429" },
    ]);
    expect(result.providerUnavailableCycles).toBe(1);
    expect(result.providerUnavailableWindows).toBe(1);
    expect(result.runs[0].classification).toBe("PROVIDER_UNAVAILABLE");
    expect(result.latestProviderIssue).toMatchObject({ provider: "Twelve Data", intervals: ["15min", "1h", "4h"], at: "2026-08-25T17:00:00.000Z", source: "EXTERNAL_TRIGGER", statusCode: 429, severity: "QUOTA" });
    expect(result.latestProviderIssue?.message).toContain("429");
  });

  it("classifies a transient Twelve Data 522 separately from quota exhaustion", () => {
    const result = summarizeScannerCadence([
      { runKey: "trading-guard-scanner:522", taskUid: "external-cron-job", startedAt: "2026-08-26T00:00:00.000Z", status: "SUCCEEDED", marketData: "unavailable", error: "Twelve Data 1h unavailable: Request failed with status code 522" },
    ]);
    expect(result.latestProviderIssue).toMatchObject({ statusCode: 522, severity: "TRANSIENT" });
  });

  it("keeps the latest provider issue historical when a later cycle is available", () => {
    const result = summarizeScannerCadence([
      { id: 10, runKey: "trading-guard-scanner:10", taskUid: "external-cron-job", startedAt: "2026-08-25T17:00:00.000Z", status: "SUCCEEDED", marketData: "unavailable", error: "Twelve Data 15min unavailable: quota" },
      { id: 11, runKey: "trading-guard-scanner:11", taskUid: "external-cron-job", startedAt: "2026-08-25T17:05:00.000Z", status: "SUCCEEDED", marketData: "available", error: null },
    ]);
    expect(result.providerUnavailableCycles).toBe(1);
    expect(result.latestProviderIssue?.at).toBe("2026-08-25T17:00:00.000Z");
    expect(result.lastRunAt).toBe("2026-08-25T17:05:00.000Z");
  });

  it("selects the latest successful available-data cycle for freshness", () => {
    const result = summarizeScannerCadence([
      { runKey: "trading-guard-scanner:20", taskUid: "external-cron-job", startedAt: "2026-08-27T13:00:00.000Z", finishedAt: "2026-08-27T13:00:12.000Z", status: "SUCCEEDED", marketData: "available" },
      { runKey: "trading-guard-scanner:21", taskUid: "external-cron-job", startedAt: "2026-08-27T13:05:00.000Z", finishedAt: "2026-08-27T13:05:30.000Z", status: "SUCCEEDED", marketData: "unavailable", error: "Twelve Data 4h unavailable: aborted" },
      { runKey: "trading-guard-scanner:22", taskUid: "heartbeat-task", startedAt: "2026-08-27T13:10:00.000Z", finishedAt: "2026-08-27T13:10:09.000Z", status: "SUCCEEDED", marketData: "available" },
    ]);
    expect(result.latestSuccessfulAt).toBe("2026-08-27T13:10:09.000Z");
    expect(result.latestSuccessfulSource).toBe("HEARTBEAT");
  });

  it("returns a safe empty state", () => {
    expect(summarizeScannerCadence([])).toMatchObject({ receivedCycles: 0, skippedWindows: 0, providerUnavailableWindows: 0, duplicateSuppressed: 0, lastRunAt: null });
  });
});
