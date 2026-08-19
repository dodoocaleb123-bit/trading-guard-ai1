import { describe, expect, it } from "vitest";

const groups = [
  ["BTC/USD", "TELEGRAM_BOT_TOKEN", "TELEGRAM_BTC_GROUP_CHAT_ID"],
  ["EUR/USD", "TELEGRAM_EURUSD_BOT_TOKEN", "TELEGRAM_EURUSD_GROUP_CHAT_ID"],
  ["XAU/USD", "TELEGRAM_XAUUSD_BOT_TOKEN", "TELEGRAM_XAUUSD_GROUP_CHAT_ID"],
  ["GBP/USD", "TELEGRAM_GBPUSD_BOT_TOKEN", "TELEGRAM_GBPUSD_GROUP_CHAT_ID"],
] as const;

describe("Telegram asset group credentials", () => {
  it.each(groups)("can resolve the %s group with its designated bot", async (_asset, tokenKey, groupKey) => {
    const token = process.env[tokenKey];
    const chatId = process.env[groupKey];
    expect(token, `${tokenKey} must be configured`).toBeTruthy();
    expect(chatId, `${groupKey} must be configured`).toBeTruthy();
    const response = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId!)}`);
    const body = (await response.json()) as { ok?: boolean; description?: string; result?: { id?: number | string } };
    expect(response.ok, body.description ?? `${_asset} Telegram getChat request failed`).toBe(true);
    expect(body.ok, body.description ?? `${_asset} Telegram group could not be resolved`).toBe(true);
    expect(String(body.result?.id), `${_asset} group ID did not match the configured ID`).toBe(String(chatId));
  }, 15000);
});
