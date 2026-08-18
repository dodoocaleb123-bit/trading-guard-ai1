import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  hasTelegramDelivery: vi.fn(),
  listStrategyDecisionsSince: vi.fn(),
  recordTelegramDelivery: vi.fn(),
  sendTelegramMessage: vi.fn(),
}));

vi.mock("./_core/env", () => ({ ENV: { ownerOpenId: "owner-open-id" } }));
vi.mock("./db", () => mocks);
vi.mock("./integrations", () => ({ sendTelegramMessage: mocks.sendTelegramMessage }));

import { isAuthorizedScannerCron } from "./scheduled";
import { sendWeeklyStrategySummary } from "./weekly-summary";

describe("weekly strategy summary delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserByOpenId.mockResolvedValue({ id: 7 });
    mocks.listStrategyDecisionsSince.mockResolvedValue([{ verdict: "APPROVED" }]);
    mocks.recordTelegramDelivery.mockResolvedValue(undefined);
  });

  it("skips an already-delivered weekly summary without sending again", async () => {
    mocks.hasTelegramDelivery.mockResolvedValue(true);
    await expect(sendWeeklyStrategySummary()).resolves.toMatchObject({ ok: true, skipped: "already-delivered" });
    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("records failed delivery so a later retry can attempt the same dedupe key again", async () => {
    mocks.hasTelegramDelivery.mockResolvedValue(false);
    mocks.sendTelegramMessage.mockResolvedValue({ delivered: false, error: "Telegram unavailable" });
    await expect(sendWeeklyStrategySummary()).resolves.toMatchObject({ ok: false, delivery: "FAILED" });
    expect(mocks.recordTelegramDelivery).toHaveBeenCalledWith(expect.objectContaining({ kind: "SUMMARY", status: "FAILED", error: "Telegram unavailable" }));
  });

  it("accepts only authenticated cron identities for scheduled callbacks", () => {
    expect(isAuthorizedScannerCron({ isCron: true, taskUid: "weekly-task" })).toBe(true);
    expect(isAuthorizedScannerCron({ isCron: false, taskUid: "weekly-task" })).toBe(false);
    expect(isAuthorizedScannerCron({ isCron: true, taskUid: null })).toBe(false);
  });
});
