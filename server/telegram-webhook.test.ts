import { describe, expect, it } from "vitest";
import { isTelegramWebhookAuthorized } from "./telegram-webhook";

describe("Telegram webhook secret", () => {
  it("accepts the configured secret header and rejects incorrect or missing values", () => {
    const configured = process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(configured, "TELEGRAM_WEBHOOK_SECRET must be configured for this test").toBeTruthy();
    expect(isTelegramWebhookAuthorized({ "x-telegram-bot-api-secret-token": configured })).toBe(true);
    expect(isTelegramWebhookAuthorized({ "x-telegram-bot-api-secret-token": `${configured}-wrong` })).toBe(false);
    expect(isTelegramWebhookAuthorized({})).toBe(false);
  });
});
