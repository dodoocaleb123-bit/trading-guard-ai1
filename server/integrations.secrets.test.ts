import { describe, expect, it } from "vitest";

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "TWELVE_DATA_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TELEGRAM_EURUSD_BOT_TOKEN",
  "TELEGRAM_EURUSD_CHAT_ID",
  "TELEGRAM_XAUUSD_BOT_TOKEN",
  "TELEGRAM_XAUUSD_CHAT_ID",
  "TELEGRAM_GBPUSD_BOT_TOKEN",
  "TELEGRAM_GBPUSD_CHAT_ID",
] as const;

describe("configured integration secrets", () => {
  it("are present in the server environment", () => {
    for (const key of required) {
      expect(process.env[key], `${key} must be configured`).toBeTruthy();
    }
  });

  it("can reach Supabase with the configured key", async () => {
    const response = await fetch(`${process.env.SUPABASE_URL}/strategy_rules?select=id&limit=1`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });
    expect(response.ok, await response.text()).toBe(true);
  }, 15000);

  it("can reach Twelve Data with the configured key", async () => {
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=EUR/USD&interval=15min&apikey=${process.env.TWELVE_DATA_API_KEY}`,
    );
    const body = (await response.json()) as { status?: string; code?: number; message?: string };
    // A quota response still proves the key reached Twelve Data and was recognized;
    // authentication failures are the cases that must block configuration.
    expect(response.status, body.message ?? "Twelve Data request failed").not.toBe(401);
    expect(response.status, body.message ?? "Twelve Data request failed").not.toBe(403);
    expect(body.message ?? "",).not.toMatch(/invalid api key|unauthorized/i);
  }, 15000);

  it("can reach Telegram with the configured bot token", async () => {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
    const body = (await response.json()) as { ok?: boolean; description?: string };
    expect(response.ok, body.description ?? "Telegram request failed").toBe(true);
    expect(body.ok, body.description ?? "Telegram rejected the bot token").toBe(true);
  }, 15000);
});
