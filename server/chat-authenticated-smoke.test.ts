import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValues = vi.fn().mockResolvedValue(undefined);

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => ({ insert: vi.fn(() => ({ values: insertValues })) })),
    listGeneratedSignalsSince: vi.fn(async () => []),
    getRelevantRulesText: vi.fn(async () => "Use confirmation and preserve risk controls."),
    getStrategyDecisionSummary: vi.fn(async () => ({ total: 0, approved: 0, denied: 0, skipped: 0, unavailable: 0 })),
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
