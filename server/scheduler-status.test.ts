import { describe, expect, it } from "vitest";
import { buildCallbackStatus, type SchedulerJobSnapshot } from "./scheduler-status";

const job: SchedulerJobSnapshot = {
  taskUid: "task-123",
  name: "trading-guard-scanner",
  cronExpression: "0 */5 * * * *",
  callbackPath: "/api/scheduled/trading-guard-scanner",
  callbackMethod: "POST",
  isEnable: true,
  createdAt: "2026-08-23T01:00:00.000Z",
  lastExecutedAt: "2026-08-23T02:00:00.000Z",
  nextExecutionAt: "2026-08-23T02:05:00.000Z",
};

describe("callback status", () => {
  it("reports healthy when the app run follows the scheduler attempt", () => {
    const result = buildCallbackStatus({
      scannerEnabled: true,
      scheduleCronTaskUid: job.taskUid,
      schedulerJob: job,
      schedulerRegistryAvailable: true,
      strategyEngineStatus: "AVAILABLE",
      strategyEngineLastRunAt: "2026-08-23T02:00:02.000Z",
      now: new Date("2026-08-23T02:01:00.000Z"),
    });
    expect(result.status).toBe("HEALTHY");
    expect(result.label).toBe("CALLBACK HEALTHY");
  });

  it("reports callback not reached when the scheduler is newer than the app run", () => {
    const result = buildCallbackStatus({
      scannerEnabled: true,
      scheduleCronTaskUid: job.taskUid,
      schedulerJob: job,
      schedulerRegistryAvailable: true,
      strategyEngineStatus: "AVAILABLE",
      strategyEngineLastRunAt: "2026-08-23T00:25:27.000Z",
      now: new Date("2026-08-23T02:01:00.000Z"),
    });
    expect(result.status).toBe("CALLBACK_NOT_REACHED");
    expect(result.diagnosis).toContain("newer than the application’s last scan");
  });

  it("does not claim health when the scheduler registry cannot be read", () => {
    const result = buildCallbackStatus({
      scannerEnabled: true,
      scheduleCronTaskUid: job.taskUid,
      schedulerJob: null,
      schedulerRegistryAvailable: false,
      now: new Date("2026-08-23T02:01:00.000Z"),
    });
    expect(result.status).toBe("SCHEDULER_UNAVAILABLE");
  });

  it("reports an unconfigured or disabled scanner safely", () => {
    expect(buildCallbackStatus({ scannerEnabled: true, scheduleCronTaskUid: null, schedulerRegistryAvailable: true }).status).toBe("NOT_CONFIGURED");
    expect(buildCallbackStatus({ scannerEnabled: false, scheduleCronTaskUid: job.taskUid, schedulerJob: job, schedulerRegistryAvailable: true }).label).toBe("SCANNER DISABLED");
  });
});
