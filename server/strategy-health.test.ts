import { describe, expect, it } from "vitest";
import { summarizeStrategyEngineHealth } from "./db";

describe("strategy-engine health summary", () => {
  it("calculates complete-response percentage and preserves operational counters", () => {
    expect(summarizeStrategyEngineHealth({ strategyEngineStatus: "AVAILABLE", strategyEngineTotalSnapshots: 16, strategyEngineCompleteResponses: 14, strategyEngineRetryCount: 3, strategyEngineUnavailableCycles: 1 })).toMatchObject({ status: "AVAILABLE", totalSnapshots: 16, completeResponses: 14, completenessPercent: 88, retryCount: 3, unavailableCycles: 1 });
  });

  it("returns a safe zero state before the first scanner cycle", () => {
    expect(summarizeStrategyEngineHealth({})).toMatchObject({ status: "NOT_RUN", totalSnapshots: 0, completenessPercent: 0, retryCount: 0, unavailableCycles: 0 });
  });
});
