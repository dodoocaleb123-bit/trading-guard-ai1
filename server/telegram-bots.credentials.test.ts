import { describe, expect, it } from "vitest";

const bots = [
  ["EUR/USD", "TELEGRAM_EURUSD_BOT_TOKEN"],
  ["XAU/USD", "TELEGRAM_XAUUSD_BOT_TOKEN"],
  ["GBP/USD", "TELEGRAM_GBPUSD_BOT_TOKEN"],
] as const;

describe("asset Telegram bot credentials", () => {
  it("authenticate with Telegram getMe without exposing tokens", async () => {
    for (const [asset, key] of bots) {
      const token = process.env[key];
      expect(token, `${asset} bot token is configured`).toBeTruthy();
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const body = (await response.json()) as { ok?: boolean };
      expect(response.ok, `${asset} Telegram API request failed`).toBe(true);
      expect(body.ok, `${asset} Telegram bot token was rejected`).toBe(true);
    }
  }, 30_000);
});
