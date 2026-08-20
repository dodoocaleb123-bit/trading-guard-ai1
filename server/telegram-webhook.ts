import { ENV } from "./_core/env";
import { findSignalByTelegramMessageId, hasTelegramDelivery, recordTelegramDelivery } from "./db";
import { formatReasonTelegramMessage, sendTelegramMessage } from "./integrations";

export function isTelegramWebhookAuthorized(headers: Record<string, string | string[] | undefined>) {
  const received = headers["x-telegram-bot-api-secret-token"];
  const value = Array.isArray(received) ? received[0] : received;
  return Boolean(ENV.telegramWebhookSecret && value && value === ENV.telegramWebhookSecret);
}

type TelegramMessage = {
  message_id?: number;
  text?: string;
  chat?: { id?: number | string; type?: string };
  reply_to_message?: { message_id?: number };
};

type TelegramUpdate = { update_id?: number; message?: TelegramMessage };

export async function handleTelegramWebhookUpdate(update: TelegramUpdate) {
  const message = update.message;
  const text = message?.text?.trim().toLowerCase();
  const repliedToMessageId = message?.reply_to_message?.message_id;
  if (!message || !message.message_id || !repliedToMessageId || !["reason", "/reason"].includes(text ?? "")) return { handled: false, reason: "not-a-reason-reply" };
  const linked = await findSignalByTelegramMessageId(String(repliedToMessageId));
  if (!linked) return { handled: false, reason: "signal-not-found" };
  const dedupeKey = `reason:${linked.signal.id}:${message.message_id}`;
  if (await hasTelegramDelivery(dedupeKey)) return { handled: true, duplicate: true, signalId: linked.signal.id };
  const signal = linked.signal;
  const response = await sendTelegramMessage(formatReasonTelegramMessage({ signalId: signal.id, asset: signal.asset, timeframe: signal.timeframe, direction: signal.direction, entry: signal.entry, stopLoss: signal.stopLoss, takeProfit: signal.takeProfit, confidence: signal.confidence, rationale: signal.rationale, intelligenceVersion: signal.intelligenceVersion, intelligenceComponents: signal.intelligenceComponents, marketRegime: signal.marketRegime }), signal.asset, { replyToMessageId: String(message.message_id) });
  await recordTelegramDelivery({ userId: linked.delivery.userId, signalId: signal.id, kind: "REASON", status: response.delivered ? "DELIVERED" : "FAILED", telegramMessageId: response.telegramMessageId, dedupeKey, error: response.error });
  return { handled: true, duplicate: false, signalId: signal.id, delivered: response.delivered };
}
