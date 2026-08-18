import { ENV } from "./_core/env";
import { formatWeeklyJudgmentSummary } from "./decision-ledger";
import { getUserByOpenId, hasTelegramDelivery, listStrategyDecisionsSince, recordTelegramDelivery } from "./db";
import { sendTelegramMessage } from "./integrations";

export async function sendWeeklyStrategySummary() {
  const owner = await getUserByOpenId(ENV.ownerOpenId);
  if (!owner) return { ok: true, skipped: "owner-not-found" };
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekLabel = `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  const dedupeKey = `SUMMARY:WEEKLY:${owner.id}:${start.toISOString().slice(0, 10)}`;
  if (await hasTelegramDelivery(dedupeKey)) return { ok: true, skipped: "already-delivered" };
  const decisions = await listStrategyDecisionsSince(owner.id, start);
  const text = formatWeeklyJudgmentSummary(decisions, weekLabel);
  const delivery = await sendTelegramMessage(text);
  await recordTelegramDelivery({ userId: owner.id, kind: "SUMMARY", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, error: delivery.error, dedupeKey });
  return { ok: delivery.delivered, decisions: decisions.length, delivery: delivery.delivered ? "DELIVERED" : "FAILED", error: delivery.error };
}
