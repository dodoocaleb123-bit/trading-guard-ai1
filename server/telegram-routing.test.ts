import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn(async () => ({ data: { ok: true, result: { message_id: 42 } } })));
vi.mock("axios", () => ({ default: { post } }));

import { sendTelegramMessage } from "./integrations";

describe("asset Telegram routing", () => {
  beforeEach(() => post.mockClear());

  it.each([
    ["EUR/USD", "TELEGRAM_EURUSD_BOT_TOKEN", "TELEGRAM_EURUSD_GROUP_CHAT_ID"],
    ["XAU/USD", "TELEGRAM_XAUUSD_BOT_TOKEN", "TELEGRAM_XAUUSD_GROUP_CHAT_ID"],
    ["GBP/USD", "TELEGRAM_GBPUSD_BOT_TOKEN", "TELEGRAM_GBPUSD_GROUP_CHAT_ID"],
  ])("routes %s to its designated bot", async (asset, tokenKey, chatKey) => {
    const result = await sendTelegramMessage("paper signal", asset);
    expect(result.delivered).toBe(true);
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining(`/bot${process.env[tokenKey]}/sendMessage`),
      expect.objectContaining({ chat_id: process.env[chatKey], text: "paper signal" }),
      expect.any(Object),
    );
  });

  it("keeps BTC/USD and unspecified legacy calls on the existing bot", async () => {
    await sendTelegramMessage("btc signal", "BTC/USD");
    expect(post.mock.calls[0]?.[0]).toContain(`/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`);
    await sendTelegramMessage("legacy signal");
    expect(post.mock.calls[1]?.[0]).toContain(`/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`);
  });
});
