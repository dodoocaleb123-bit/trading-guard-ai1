import { describe, expect, it } from "vitest";
import { formatApprovedTelegramMessage, shouldNotifyApprovedAudit } from "./integrations";
import { isAuthorizedScannerCron } from "./scheduled";

describe("approved Telegram signal formatting", () => {
  it("notifies only for approved audit verdicts", () => {
    expect(shouldNotifyApprovedAudit("APPROVED")).toBe(true);
    expect(shouldNotifyApprovedAudit("DENIED")).toBe(false);
    expect(shouldNotifyApprovedAudit("PENDING")).toBe(false);
  });

  it("accepts only authenticated cron identities for scanner execution", () => {
    expect(isAuthorizedScannerCron({ isCron: true, taskUid: "task-123" })).toBe(true);
    expect(isAuthorizedScannerCron({ isCron: true, taskUid: null })).toBe(false);
    expect(isAuthorizedScannerCron({ isCron: false, taskUid: "task-123" })).toBe(false);
  });
  it("includes the complete approved trade context", () => {
    const message = formatApprovedTelegramMessage({
      asset: "EUR/USD",
      timeframe: "15MIN",
      direction: "BUY",
      entry: 1.15805,
      stopLoss: 1.15666,
      takeProfit: 1.16083,
      confidence: 88,
      adjustments: "Wait for confirmation.",
    });

    expect(message).toContain("TradingGuardAI approved trade");
    expect(message).toContain("Asset: EUR/USD");
    expect(message).toContain("Timeframe: 15MIN");
    expect(message).toContain("Direction: BUY");
    expect(message).toContain("Entry: 1.15805");
    expect(message).toContain("Stop Loss: 1.15666");
    expect(message).toContain("Take Profit: 1.16083");
    expect(message).toContain("Confidence: 88%");
  });

  it("renders missing levels safely", () => {
    const message = formatApprovedTelegramMessage({
      asset: "BTC/USD",
      timeframe: "1H",
      direction: "SELL",
      entry: null,
      stopLoss: undefined,
      takeProfit: null,
      confidence: 72,
      adjustments: "No adjustments.",
    });

    expect(message).toContain("Entry: —");
    expect(message).toContain("Stop Loss: —");
    expect(message).toContain("Take Profit: —");
  });
});
