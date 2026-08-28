import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => ({ insert: vi.fn(() => ({ values: insertValues })) })),
    listGeneratedSignalsSince: vi.fn(async () => []),
    getRelevantRulesText: vi.fn(async () => "Use confirmation and preserve risk controls."),
    getAllRulesText: vi.fn(async () => "Risk management and market structure guidance."),
    getStrategyDecisionSummary: vi.fn(async () => ({ total: 0, approved: 0, denied: 0, skipped: 0, unavailable: 0 })),
    getScannerCadenceDiagnostics: vi.fn(async () => ({ latestSuccessfulAt: null, latestSuccessfulSource: null, completedCycles: 0, failedCycles: 0, expectedIntervalMinutes: 5 })),
    getV5HierarchySmokeStatus: vi.fn(async () => ({ ok: false, checkedDecisions: 0, qualified: 0, waiting: 0, actualRatios: [], reason: "No smoke data" })),
    listEntryLocatorStates: vi.fn(async () => []),
    listStrategyDecisionsSince: vi.fn(async () => []),
    listWhiteAiMemories: vi.fn(async () => []),
    rememberWhiteAiConversation: vi.fn(async () => null),
    getWinningRateStats: vi.fn(async () => ({ versions: [], confidenceBandLabels: [], assets: [], timeframes: [], generatedAt: new Date(), reconciliation: { sourceTotal: 0, includedTotal: 0, excludedTotal: 0, status: "RECONCILED" } })),
    getBestTimeToTradeStats: vi.fn(async () => []),
    getBestDaysToTradeStats: vi.fn(async () => []),
    getLocatorV5OutcomeStats: vi.fn(async () => ({})),
    getV5SourceStats: vi.fn(async () => ({})),
    listGeneratedSignals: vi.fn(async () => []),
  };
});

vi.mock("./_core/llm", async () => {
  const actual = await vi.importActual<typeof import("./_core/llm")>("./_core/llm");
  return {
    ...actual,
    invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: "This is a readable paper-only analysis. It is UNVALIDATED and creates no trade decision." } }] })),
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 1, openId: "smoke-user", email: "smoke@example.com", name: "Smoke User", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("authenticated chat smoke", () => {
  beforeEach(() => {
    insertValues.mockClear();
  });

  it("returns readable paper-only content through the protected conversation procedure", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    const result = await caller.audit.conversation({ messages: [{ role: "user", content: "Explain risk management." }] });

    expect(result.role).toBe("assistant");
    expect(result.content).toContain("readable");
    expect(result.content).toContain("paper-only");
    expect(result.content).toContain("UNVALIDATED");
    expect(insertValues).toHaveBeenCalledTimes(2);
  });
});
