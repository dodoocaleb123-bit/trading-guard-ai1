import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSignalByTelegramMessageId: vi.fn(),
  hasTelegramDelivery: vi.fn(),
  recordTelegramDelivery: vi.fn(),
  formatReasonTelegramMessage: vi.fn(() => "reason details"),
  sendTelegramMessage: vi.fn(),
}));

vi.mock("./db", () => ({
  findSignalByTelegramMessageId: mocks.findSignalByTelegramMessageId,
  hasTelegramDelivery: mocks.hasTelegramDelivery,
  recordTelegramDelivery: mocks.recordTelegramDelivery,
}));
vi.mock("./integrations", () => ({
  formatReasonTelegramMessage: mocks.formatReasonTelegramMessage,
  sendTelegramMessage: mocks.sendTelegramMessage,
}));

import { handleTelegramWebhookUpdate } from "./telegram-webhook";

describe("Telegram Reason webhook", () => {
  beforeEach(() => {
    mocks.findSignalByTelegramMessageId.mockReset();
    mocks.hasTelegramDelivery.mockReset();
    mocks.recordTelegramDelivery.mockReset();
    mocks.formatReasonTelegramMessage.mockClear();
    mocks.sendTelegramMessage.mockReset();
  });

  it("sends a detailed reply to the Reason message and records it idempotently", async () => {
    mocks.findSignalByTelegramMessageId.mockResolvedValue({ delivery: { userId: 7 }, signal: { id: 42, asset: "EUR/USD", timeframe: "1H", direction: "SELL", entry: "1.16736", stopLoss: "1.16876", takeProfit: "1.16456", confidence: "84", rationale: "Stored rationale", intelligenceVersion: "forex-trading-combined-document-v3", intelligenceComponents: JSON.stringify(["Momentum"]), marketRegime: "TRENDING_DOWN" } });
    mocks.hasTelegramDelivery.mockResolvedValue(false);
    mocks.sendTelegramMessage.mockResolvedValue({ delivered: true, telegramMessageId: "901" });

    const result = await handleTelegramWebhookUpdate({ update_id: 1, message: { message_id: 900, text: "Reason", chat: { id: -1001, type: "supergroup" }, reply_to_message: { message_id: 800 } } });

    expect(result).toMatchObject({ handled: true, duplicate: false, signalId: 42, delivered: true });
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith("reason details", "EUR/USD", { replyToMessageId: "900" });
    expect(mocks.recordTelegramDelivery).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, signalId: 42, kind: "REASON", status: "DELIVERED", telegramMessageId: "901", dedupeKey: "reason:42:900" }));
  });

  it("ignores non-Reason messages and duplicate updates", async () => {
    expect(await handleTelegramWebhookUpdate({ message: { message_id: 1, text: "hello", reply_to_message: { message_id: 800 } } })).toMatchObject({ handled: false });
    mocks.findSignalByTelegramMessageId.mockResolvedValue({ delivery: { userId: 7 }, signal: { id: 42, asset: "EUR/USD", timeframe: "1H", direction: "SELL", entry: "1", stopLoss: "2", takeProfit: "0", confidence: "80" } });
    mocks.hasTelegramDelivery.mockResolvedValue(true);
    expect(await handleTelegramWebhookUpdate({ message: { message_id: 900, text: "/reason", reply_to_message: { message_id: 800 } } })).toMatchObject({ handled: true, duplicate: true });
    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
  });
});
