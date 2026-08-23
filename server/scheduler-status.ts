export type CallbackStatus = "HEALTHY" | "CALLBACK_REACHED_WITH_ERROR" | "CALLBACK_NOT_REACHED" | "SCHEDULER_UNAVAILABLE" | "NOT_CONFIGURED";

export type SchedulerJobSnapshot = {
  taskUid: string;
  name: string;
  cronExpression: string;
  callbackPath: string;
  callbackMethod: string;
  isEnable: boolean;
  createdAt?: string | null;
  lastExecutedAt?: string | null;
  nextExecutionAt?: string | null;
};

const SCANNER_CALLBACK_PATH = "/api/scheduled/trading-guard-scanner";
const SCANNER_TASK_PREFIX = "trading-guard-scanner";

export function hasRepeatedScannerFailures(runs: Array<{ status: string }>, threshold = 2) {
  return runs.filter((run) => run.status === "FAILED").length >= threshold;
}

export function selectScannerSchedulerJob(storedTaskUid: string | null | undefined, jobs: SchedulerJobSnapshot[]) {
  const exact = storedTaskUid ? jobs.find((job) => job.taskUid === storedTaskUid) ?? null : null;
  if (exact) return { job: exact, taskUid: exact.taskUid, reconciled: false };

  const candidates = jobs
    .filter((job) => job.isEnable && job.callbackPath === SCANNER_CALLBACK_PATH && job.name.startsWith(SCANNER_TASK_PREFIX))
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  if (candidates.length !== 1) return { job: null, taskUid: storedTaskUid ?? null, reconciled: false };
  const replacement = candidates[0];
  return { job: replacement, taskUid: replacement.taskUid, reconciled: true };
}

export type CallbackStatusInput = {
  scannerEnabled: boolean;
  scheduleCronTaskUid?: string | null;
  strategyEngineStatus?: string | null;
  strategyEngineLastRunAt?: Date | string | null;
  schedulerJob?: SchedulerJobSnapshot | null;
  schedulerRegistryAvailable: boolean;
  now?: Date;
};

const asDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function buildCallbackStatus(input: CallbackStatusInput) {
  const now = input.now ?? new Date();
  const appLastRunAt = asDate(input.strategyEngineLastRunAt);
  const schedulerLastAttemptAt = asDate(input.schedulerJob?.lastExecutedAt);
  const configuredTaskUid = input.scheduleCronTaskUid ?? null;

  if (!input.scannerEnabled || !configuredTaskUid) {
    return {
      status: "NOT_CONFIGURED" as const,
      label: input.scannerEnabled ? "NOT CONFIGURED" : "SCANNER DISABLED",
      diagnosis: input.scannerEnabled ? "No scanner Heartbeat task is stored for this account." : "The scanner is disabled in app settings.",
      taskUid: configuredTaskUid,
      schedulerJob: input.schedulerJob ?? null,
      appLastRunAt,
      schedulerLastAttemptAt,
      nextExecutionAt: asDate(input.schedulerJob?.nextExecutionAt),
      minutesSinceApplicationRun: appLastRunAt ? Math.max(0, Math.round((now.getTime() - appLastRunAt.getTime()) / 60000)) : null,
    };
  }

  if (!input.schedulerRegistryAvailable || !input.schedulerJob) {
    return {
      status: "SCHEDULER_UNAVAILABLE" as const,
      label: "SCHEDULER UNAVAILABLE",
      diagnosis: "The scheduler registry could not confirm the stored Heartbeat task. No callback health claim is made.",
      taskUid: configuredTaskUid,
      schedulerJob: input.schedulerJob ?? null,
      appLastRunAt,
      schedulerLastAttemptAt,
      nextExecutionAt: asDate(input.schedulerJob?.nextExecutionAt),
      minutesSinceApplicationRun: appLastRunAt ? Math.max(0, Math.round((now.getTime() - appLastRunAt.getTime()) / 60000)) : null,
    };
  }

  const applicationWasReached = Boolean(
    appLastRunAt &&
      schedulerLastAttemptAt &&
      appLastRunAt.getTime() >= schedulerLastAttemptAt.getTime() - 120000 &&
      input.schedulerJob.isEnable,
  );

  if (applicationWasReached) {
    const runUnavailable = input.strategyEngineStatus === "UNAVAILABLE";
    return {
      status: runUnavailable ? "CALLBACK_REACHED_WITH_ERROR" as const : "HEALTHY" as const,
      label: runUnavailable ? "CALLBACK REACHED · RUN UNAVAILABLE" : "CALLBACK HEALTHY",
      diagnosis: runUnavailable
        ? "The callback reached the app, but the latest run could not obtain usable market data or complete its processing. No signal was created from that run."
        : "The latest scheduler attempt is reflected by a recent application scan.",
      taskUid: configuredTaskUid,
      schedulerJob: input.schedulerJob,
      appLastRunAt,
      schedulerLastAttemptAt,
      nextExecutionAt: asDate(input.schedulerJob.nextExecutionAt),
      minutesSinceApplicationRun: appLastRunAt ? Math.max(0, Math.round((now.getTime() - appLastRunAt.getTime()) / 60000)) : null,
    };
  }

  return {
    status: "CALLBACK_NOT_REACHED" as const,
    label: "CALLBACK NOT REACHED",
    diagnosis: schedulerLastAttemptAt
      ? "The scheduler recorded an attempt newer than the application’s last scan. The callback likely did not reach the app; the scheduler’s exact HTTP response is not available inside the app."
      : "The Heartbeat task is registered, but no scheduler attempt has been recorded yet.",
    taskUid: configuredTaskUid,
    schedulerJob: input.schedulerJob,
    appLastRunAt,
    schedulerLastAttemptAt,
    nextExecutionAt: asDate(input.schedulerJob.nextExecutionAt),
    minutesSinceApplicationRun: appLastRunAt ? Math.max(0, Math.round((now.getTime() - appLastRunAt.getTime()) / 60000)) : null,
  };
}
