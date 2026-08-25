import { describe, expect, it } from "vitest";
import { summarizeDeliveryCounts, summarizeJudgmentAlertBridge, summarizeTelegramDeliveryHealth } from "./db";

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

  it("separates current delivery health from historical rate-limit failures", () => {
    const now = new Date("2026-08-25T12:00:00.000Z");
    const summary = summarizeTelegramDeliveryHealth([
      { kind: "OUTCOME", status: "DELIVERED", createdAt: new Date("2026-08-25T11:55:00.000Z") },
      { kind: "SIGNAL", status: "FAILED", error: "Request failed with status code 429", createdAt: new Date("2026-08-24T00:21:42.000Z") },
      { kind: "OUTCOME", status: "FAILED", error: "Connection timeout", createdAt: new Date("2026-08-23T00:21:42.000Z") },
    ], now);

    expect(summary).toMatchObject({
      recentAttempts: 1,
      recentDelivered: 1,
      recentFailed: 0,
      recentFailureRate: 0,
      historicalRateLimitFailures: 1,
      historicalOtherFailures: 1,
    });
    expect(summary.latestFailureAt).toEqual(new Date("2026-08-24T00:21:42.000Z"));
  });

  it("keeps directional judgments distinct from approved and delivered alerts", () => {
    expect(summarizeJudgmentAlertBridge({ total: 8, approved: 0 }, { signalDelivered: 40 })).toEqual({ directionalJudgments: 8, approvedJudgments: 0, telegramDelivered: 40 });
  });
});
