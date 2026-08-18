import { describe, expect, it } from "vitest";

describe("Telegram recipient configuration", () => {
  it("resolves the configured chat ID", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    expect(token, "TELEGRAM_BOT_TOKEN must be configured").toBeTruthy();
    expect(chatId, "TELEGRAM_CHAT_ID must be configured").toBeTruthy();
    const response = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId ?? "")}`);
    const body = (await response.json()) as { ok?: boolean; description?: string; result?: { id?: number | string } };
    expect(body.ok, body.description ?? "Telegram rejected the configured chat ID").toBe(true);
    expect(String(body.result?.id), body.description ?? "Telegram returned no matching chat").toBe(String(chatId));
  }, 15000);
});
