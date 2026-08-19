import { describe, expect, it } from "vitest";
import { summarizeDeliveryCounts, summarizeJudgmentAlertBridge } from "./db";

describe("delivery reconciliation summary", () => {
  it("separates generated signals, approved audits, and Telegram outcomes", () => {
    const summary = summarizeDeliveryCounts(
      [{ status: "PENDING" }, { status: "WIN" }, { status: "LOSS" }],
      [{ verdict: "APPROVED" }, { verdict: "DENIED" }, { verdict: "APPROVED" }],
      [
        { kind: "SIGNAL", status: "DELIVERED" },
        { kind: "SIGNAL", status: "FAILED" },
        { kind: "AUDIT", status: "DELIVERED" },
        { kind: "OUTCOME", status: "DELIVERED" },
      ],
    );

    expect(summary).toMatchObject({
      generated: 3,
      pending: 1,
      wins: 1,
      losses: 1,
      audits: 3,
      approvedAudits: 2,
      signalAttempts: 2,
      signalDelivered: 1,
      signalFailed: 1,
      approvedAuditDelivered: 1,
      outcomeDelivered: 1,
    });
  });

  it("keeps directional judgments distinct from approved and delivered alerts", () => {
    expect(summarizeJudgmentAlertBridge({ total: 8, approved: 0 }, { signalDelivered: 40 })).toEqual({ directionalJudgments: 8, approvedJudgments: 0, telegramDelivered: 40 });
  });
});
