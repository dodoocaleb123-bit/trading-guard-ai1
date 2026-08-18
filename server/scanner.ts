import { and, eq } from "drizzle-orm";
import { generatedSignals, users } from "../drizzle/schema";
import { createStrategyRule, getAllRulesText, getDb, listStrategyRules } from "./db";
import { fetchMarketSeriesBatch, fetchMarketSnapshot, forensicAnalysis, mirrorToSupabase, sendTelegramMessage, type MarketSeries } from "./integrations";

const WATCHLIST = ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"] as const;
const TIMEFRAMES = ["15MIN", "1H"] as const;

function precision(asset: string) {
  return asset === "BTC/USD" ? 2 : asset === "XAU/USD" ? 4 : 5;
}

export function shouldCreateCandidate(ruleCount: number, series: { close?: number; trend?: string } | null) {
  return ruleCount > 0 && Boolean(series && Number.isFinite(series.close) && (series.trend === "UP" || series.trend === "DOWN"));
}

export function resolveOutcome(direction: "BUY" | "SELL", price: number, stop: number, target: number): "WIN" | "LOSS" | null {
  const win = direction === "BUY" ? price >= target : price <= target;
  const loss = direction === "BUY" ? price <= stop : price >= stop;
  return win ? "WIN" : loss ? "LOSS" : null;
}

export function buildSignalLevels(asset: string, timeframe: "15MIN" | "1H", close: number, trend: "UP" | "DOWN") {
  const p = precision(asset);
  const direction = trend === "UP" ? "BUY" : "SELL";
  const entry = Number(close.toFixed(p));
  const risk = Number((entry * (asset === "BTC/USD" ? 0.004 : 0.0012)).toFixed(p));
  const stopLoss = Number((direction === "BUY" ? entry - risk : entry + risk).toFixed(p));
  const takeProfit = Number((direction === "BUY" ? entry + risk * 2 : entry - risk * 2).toFixed(p));
  const confidence = Math.min(94, 72 + (timeframe === "1H" ? 8 : 0));
  return { asset, timeframe, direction, entry, stopLoss, takeProfit, riskReward: 2, confidence };
}

export async function scanUser(userId: number) {
  const db = await getDb();
  if (!db) return { created: 0, tracked: 0 };
  const rules = await listStrategyRules(userId);
  if (rules.length === 0) return { created: 0, tracked: 0 };
  let series15m: Map<string, MarketSeries>;
  let series1h: Map<string, MarketSeries>;
  try {
    [series15m, series1h] = await Promise.all([
      fetchMarketSeriesBatch(WATCHLIST, "15min"),
      fetchMarketSeriesBatch(WATCHLIST, "1h"),
    ]);
  } catch (error) {
    console.warn("[Scanner] Market batch unavailable; no signals created:", error instanceof Error ? error.message : error);
    return { created: 0, tracked: 0 };
  }
  const seriesCache = new Map<string, MarketSeries>();
  series15m.forEach((series, symbol) => seriesCache.set(`${symbol}:15MIN`, series));
  series1h.forEach((series, symbol) => seriesCache.set(`${symbol}:1H`, series));
  const created: Array<{ id: number; asset: string; timeframe: string; direction: string; entry: number; stopLoss: number; takeProfit: number; riskReward: number; confidence: number }> = [];
  for (const asset of WATCHLIST) {
    for (const timeframe of TIMEFRAMES) {
      try {
        const series = seriesCache.get(`${asset}:${timeframe}`);
        if (!series || !shouldCreateCandidate(rules.length, series)) continue;
        const levels = buildSignalLevels(asset, timeframe, series.close, series.trend);
        const rationale = `OHLCV trend ${series.trend} confirmed on ${timeframe} from ${series.values.length} candles. Candidate remains subject to the full strategy memory.`;
        const [result] = await db.insert(generatedSignals).values({ userId, asset, timeframe, direction: levels.direction as "BUY" | "SELL", entry: String(levels.entry), stopLoss: String(levels.stopLoss), takeProfit: String(levels.takeProfit), riskReward: "2.00", confidence: String(levels.confidence), rationale, status: "PENDING" });
        const signal = { id: Number(result.insertId), ...levels };
        await mirrorToSupabase("generated_signals", { user_id: userId, ...signal, status: "PENDING", rationale });
        await sendTelegramMessage(`<b>TradingGuardAI signal</b>\n\nAsset: ${asset}\nTimeframe: ${timeframe}\nDirection: ${levels.direction}\nEntry: ${levels.entry}\nStop Loss: ${levels.stopLoss}\nTake Profit: ${levels.takeProfit}\nRisk/Reward: 1:2\nConfidence: ${levels.confidence}%`);
        created.push(signal);
      } catch (error) {
        console.warn(`[Scanner] ${asset} ${timeframe} skipped:`, error instanceof Error ? error.message : error);
      }
    }
  }
  return { created: created.length, tracked: await trackOpenSignals(userId, seriesCache) };
}

export async function trackOpenSignals(userId: number, seriesCache?: Map<string, MarketSeries>) {
  const db = await getDb();
  if (!db) return 0;
  const open = await db.select().from(generatedSignals).where(and(eq(generatedSignals.userId, userId), eq(generatedSignals.status, "PENDING")));
  let tracked = 0;
  for (const signal of open) {
    try {
      const timeframe = signal.timeframe === "1H" ? "1H" : "15MIN";
      const cached = seriesCache?.get(`${signal.asset}:${timeframe}`);
      const market = cached ? { symbol: signal.asset, price: cached.close, close: cached.close, fetchedAt: cached.fetchedAt } : await fetchMarketSnapshot(signal.asset, timeframe === "1H" ? "1h" : "15min");
      const price = market.price;
      const stop = Number(signal.stopLoss);
      const target = Number(signal.takeProfit);
      const status = resolveOutcome(signal.direction, price, stop, target);
      if (!status) continue;
      const note = `Closed from live ${signal.asset} ${signal.timeframe} price ${price}.`;
      await db.update(generatedSignals).set({ status, closedAt: new Date(), outcomeNote: note }).where(eq(generatedSignals.id, signal.id));
      await mirrorToSupabase("trade_outcomes", { signal_id: signal.id, user_id: userId, status, close_price: price, note });
      if (status === "LOSS") {
        const forensics = await forensicAnalysis({ asset: signal.asset, direction: signal.direction, entry: String(signal.entry), stopLoss: String(signal.stopLoss), takeProfit: String(signal.takeProfit) }, market, await getAllRulesText(userId));
        const learned = `${forensics.lesson}\n\nGuardrail: ${forensics.guardrail}`;
        const rule = await createStrategyRule({ userId, title: `Learned guardrail · ${signal.asset} ${signal.timeframe}`, sourceType: "text", sourceFileName: null, content: learned, storageKey: null, supabaseId: null });
        const mirrored = await mirrorToSupabase("strategy_rules", { title: rule.title, content: learned, source_type: "text", source_file_name: "loss-forensics" });
        if (mirrored?.id) await db.update(generatedSignals).set({ outcomeNote: `${note} Learned: ${forensics.rootCause}` }).where(eq(generatedSignals.id, signal.id));
      }
      await sendTelegramMessage(`<b>TradingGuardAI outcome</b>\n\n${signal.asset} ${signal.direction}\nStatus: ${status}\nClose price: ${price}`);
      tracked += 1;
    } catch (error) {
      console.warn(`[Tracker] ${signal.asset} ${signal.timeframe} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  return tracked;
}

export async function scanAllUsers() {
  const db = await getDb();
  if (!db) return { users: 0, created: 0, tracked: 0 };
  const allUsers = await db.select({ id: users.id }).from(users);
  let created = 0;
  let tracked = 0;
  for (const user of allUsers) {
    const result = await scanUser(user.id);
    created += result.created;
    tracked += result.tracked;
  }
  return { users: allUsers.length, created, tracked };
}
