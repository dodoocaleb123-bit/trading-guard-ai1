import { and, eq } from "drizzle-orm";
import { generatedSignals, users } from "../drizzle/schema";
import { activateIntelligenceVersion, createIntelligenceComponent, createIntelligenceVersion, createStrategyDecision, createStrategyLesson, getActiveIntelligenceVersion, getAllRulesText, getDb, getRelevantRulesText, getTelegramDeliveryForSignal, listIntelligenceComponents, listStrategyRules, recordStrategyEngineHealth, recordTelegramDelivery, updateStrategyEngineStatus } from "./db";
import { buildMultiTimeframeContext } from "./market-context";
import { fetchOfficialMacroContext } from "./official-macro";
import { buildIntelligenceModel, compileExecutableComponents, evaluateExecutableIntelligence, type ExecutableComponent } from "./intelligence";
import { buildReplacementKnowledgeModelV3, evaluateReplacementIntelligence } from "./replacement-intelligence";
import { fetchMarketSeriesBatch, fetchMarketSnapshot, fetchStrategyRulesFromSupabase, forensicAnalysis, formatApprovedTelegramMessage, formatOutcomeTelegramMessage, formatAuditResult, generateScannerDecisions, mirrorToSupabase, sendTelegramMessage, type MarketSeries } from "./integrations";

const WATCHLIST = ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"] as const;
const TIMEFRAMES = ["15MIN", "1H"] as const;

function precision(asset: string) {
  return asset === "BTC/USD" ? 2 : asset === "XAU/USD" ? 4 : 5;
}

export function shouldNotifyScannerSignal(verdict: string) {
  return verdict === "APPROVED";
}

export function shouldCreateCandidate(ruleCount: number, series: { close?: number; trend?: string } | null) {
  return ruleCount > 0 && Boolean(series && Number.isFinite(series.close) && (series.trend === "UP" || series.trend === "DOWN"));
}

export function resolveOutcome(direction: "BUY" | "SELL", price: number, stop: number, target: number, high = price, low = price): "WIN" | "LOSS" | null {
  const observedHigh = Number.isFinite(high) ? high : price;
  const observedLow = Number.isFinite(low) ? low : price;
  const win = direction === "BUY" ? observedHigh >= target : observedLow <= target;
  const loss = direction === "BUY" ? observedLow <= stop : observedHigh >= stop;
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

type ScanMarketDataStatus = "available" | "unavailable" | "not-run";

export function compactStrategyContext(localRules: string, mirroredRules: string, maxChars = 24_000) {
  return [localRules, mirroredRules].filter(Boolean).join("\n\n").slice(0, maxChars);
}

type ScanUserResult = { created: number; tracked: number; marketData: ScanMarketDataStatus };

async function ensureReplacementIntelligenceVersion(userId: number) {
  const active = await getActiveIntelligenceVersion(userId);
  if (active?.versionLabel === "forex-trading-combined-document-v3") return active;
  const model = buildReplacementKnowledgeModelV3();
  const version = await createIntelligenceVersion({ userId, versionLabel: model.id, status: "ACTIVE", sourceRuleCount: 0, componentCount: model.nodes.length, lessonCount: 0, algorithmJson: JSON.stringify(model), validationJson: JSON.stringify({ status: "UNVALIDATED", reason: "Replacement intelligence v2 is newly activated and requires forward paper validation." }), activatedAt: new Date() });
  const triggerFor = (family: string) => family === "STRUCTURE" ? "MARKET_STRUCTURE" : family === "LEVELS" ? "SUPPORT_RESISTANCE" : family === "PATTERN" ? "BREAKOUT" : family === "INDICATOR" ? "MOMENTUM" : family === "VOLUME" ? "VOLATILITY" : "CANDLE";
  for (const node of model.nodes) await createIntelligenceComponent({ userId, versionId: version.id, title: node.concept, sourceRuleIds: JSON.stringify([]), trigger: triggerFor(node.family) as any, stance: "NEUTRAL", conditionJson: JSON.stringify({ values: node.prerequisites, description: node.rule }), weight: "1", enabled: true });
  await activateIntelligenceVersion(userId, version.id);
  return version;
}

async function loadExecutableIntelligence(userId: number): Promise<ExecutableComponent[]> {
  const active = await getActiveIntelligenceVersion(userId);
  if (active) return listIntelligenceComponents(userId, active.id) as unknown as ExecutableComponent[];
  const rules = await listStrategyRules(userId);
  const components = compileExecutableComponents(rules);
  const version = await createIntelligenceVersion({ userId, versionLabel: `intelligence-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`, status: "ACTIVE", sourceRuleCount: rules.length, componentCount: components.length, lessonCount: 0, algorithmJson: JSON.stringify(buildIntelligenceModel(components)), validationJson: JSON.stringify({ status: "UNVALIDATED", reason: "No sufficient forward paper-validation sample yet." }), activatedAt: new Date() });
  for (const component of components) {
    await createIntelligenceComponent({ userId, versionId: version.id, title: component.title, sourceRuleIds: JSON.stringify(component.sourceRuleIds), trigger: component.trigger, stance: component.stance, conditionJson: JSON.stringify(component.condition), weight: String(component.weight), enabled: true });
  }
  return components;
}

export async function scanUser(userId: number): Promise<ScanUserResult> {
  const db = await getDb();
  if (!db) return { created: 0, tracked: 0, marketData: "not-run" };

  let series15m: Map<string, MarketSeries>;
  let series1h: Map<string, MarketSeries>;
  try {
    [series15m, series1h] = await Promise.all([
      fetchMarketSeriesBatch(WATCHLIST, "15min"),
      fetchMarketSeriesBatch(WATCHLIST, "1h"),
    ]);
  } catch (error) {
    console.warn("[Scanner] Market batch unavailable; no signals created:", error instanceof Error ? error.message : error);
    return { created: 0, tracked: 0, marketData: "unavailable" };
  }
  const seriesCache = new Map<string, MarketSeries>();
  series15m.forEach((series, symbol) => seriesCache.set(`${symbol}:15MIN`, series));
  series1h.forEach((series, symbol) => seriesCache.set(`${symbol}:1H`, series));
  const created: Array<{ id: number; asset: string; timeframe: string; direction: string; entry: number; stopLoss: number; takeProfit: number; riskReward: number; confidence: number }> = [];
  const mirroredRules = await fetchStrategyRulesFromSupabase();
  const mirroredText = mirroredRules.map((rule) => `## ${rule.title ?? "Saved strategy rule"}\n${rule.content ?? ""}`).join("\n\n").slice(0, 6_000);
  await ensureReplacementIntelligenceVersion(userId);
  const replacementModel = buildReplacementKnowledgeModelV3();
  const candidates = WATCHLIST.flatMap((asset) => TIMEFRAMES.map((timeframe) => ({ asset, timeframe, series: seriesCache.get(`${asset}:${timeframe}`) })) ).filter((candidate): candidate is { asset: typeof WATCHLIST[number]; timeframe: typeof TIMEFRAMES[number]; series: MarketSeries } => Boolean(candidate.series)).map((candidate) => ({ ...candidate, cooldownKey: `${candidate.asset}:${candidate.timeframe}:${(candidate.series.close ?? 0).toFixed(4)}` }));
  console.info(`[Scanner] Forwarding ${candidates.length} raw market snapshots to the strategy-rules algorithm.`);
  let decisions: Array<any> & { metrics?: { snapshots: number; completeResponses: number; retries: number } };
  try {
    decisions = await Promise.all(candidates.map(async ({ asset, timeframe, series }) => {
        const companion = timeframe === "15MIN" ? seriesCache.get(`${asset}:1H`) : seriesCache.get(`${asset}:15MIN`);
        const multiTimeframeContext = buildMultiTimeframeContext([
          { interval: series.interval, context: series.marketContext },
          { interval: companion?.interval ?? "companion", context: companion?.marketContext ?? null },
        ], series.interval);
        const companionContext = companion?.marketContext;
        const directional = (value: string) => value === "RISING" || value === "BULLISH" ? "UP" : value === "FALLING" || value === "BEARISH" ? "DOWN" : "NEUTRAL";
        const localDirection = series.marketContext ? directional(series.marketContext.marketStructure) : "NEUTRAL";
        const companionDirection = companionContext ? directional(companionContext.marketStructure) : "NEUTRAL";
        const localMomentum = series.marketContext ? directional(series.marketContext.momentum.direction) : "NEUTRAL";
        const companionMomentum = companionContext ? directional(companionContext.momentum.direction) : "NEUTRAL";
        const multiTimeframeAlignment = series.marketContext && companionContext ? {
          companionInterval: companion.interval,
          structure: localDirection === "NEUTRAL" || companionDirection === "NEUTRAL" ? "MIXED" as const : localDirection === companionDirection ? "ALIGNED" as const : "OPPOSED" as const,
          momentum: localMomentum === "NEUTRAL" || companionMomentum === "NEUTRAL" ? "MIXED" as const : localMomentum === companionMomentum ? "ALIGNED" as const : "OPPOSED" as const,
          breakout: series.marketContext.breakoutState === "WITHIN_RANGE" || companionContext.breakoutState === "WITHIN_RANGE" ? "MIXED" as const : localDirection === companionDirection ? "ALIGNED" as const : "OPPOSED" as const,
        } : undefined;
        const market = {
          symbol: asset,
          price: series.close,
          close: series.close,
          interval: series.interval,
          trend: series.trend,
          values: series.values,
          fetchedAt: series.fetchedAt,
          marketContext: series.marketContext ? { ...series.marketContext, multiTimeframeContext, multiTimeframeAlignment } : null,
        };
        const fundamentalContext = await fetchOfficialMacroContext(asset);
        const replacementIntelligence = market.marketContext ? evaluateReplacementIntelligence({ close: series.close, interval: series.interval, marketContext: market.marketContext, fundamentalContext }, replacementModel) : undefined;
        if (!replacementIntelligence) throw new Error(`Replacement intelligence could not evaluate ${asset} ${timeframe}.`);
        return {
          asset,
          timeframe,
          verdict: "APPROVED" as const,
          confidence: replacementIntelligence.confidence,
          confluenceScore: replacementIntelligence.confluenceScore,
          marketRegime: replacementIntelligence.marketRegime,
          adjustments: replacementIntelligence.adjustments,
          direction: replacementIntelligence.direction,
          entry: replacementIntelligence.entry,
          stopLoss: replacementIntelligence.stopLoss,
          takeProfit: replacementIntelligence.takeProfit,
          ruleEvidence: replacementIntelligence.ruleEvidence,
          ruleFindings: replacementIntelligence.ruleFindings,
          decisionTrace: replacementIntelligence.decisionTrace,
          market: { ...market, fundamentalContext, intelligenceSeed: replacementIntelligence, replacementIntelligence, replacementMarketRegime: replacementIntelligence.marketRegime },
        };
      }));
    decisions.metrics = { snapshots: candidates.length, completeResponses: decisions.length, retries: 0 };
    await updateStrategyEngineStatus(userId, { status: "AVAILABLE" });
    await recordStrategyEngineHealth(userId, { snapshots: decisions.metrics?.snapshots ?? candidates.length, completeResponses: decisions.metrics?.completeResponses ?? decisions.length, retries: decisions.metrics?.retries ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateStrategyEngineStatus(userId, { status: "UNAVAILABLE", error: message });
    await recordStrategyEngineHealth(userId, { snapshots: candidates.length, completeResponses: 0, retries: 1, unavailableCycle: true });
    for (const candidate of candidates) {
      await createStrategyDecision({ userId, asset: candidate.asset, timeframe: candidate.timeframe, verdict: "UNAVAILABLE", confidence: "0", confluenceScore: "0", ruleEvidence: null, ruleFindings: null, marketSnapshot: JSON.stringify(candidate.series), generatedDirection: null, generatedEntry: null, generatedStopLoss: null, generatedTakeProfit: null, decisionReason: `Strategy engine unavailable: ${message}`, cooldownKey: candidate.cooldownKey });
    }
    console.warn("[Scanner] Strategy engine unavailable; no new signals created:", message);
    return { created: 0, tracked: await trackOpenSignals(userId, seriesCache), marketData: "available" };
  }
  for (const gated of decisions) {
    const { asset, timeframe, market } = gated;
    const sourceCandidate = candidates.find((candidate) => candidate.asset === asset && candidate.timeframe === timeframe);
    const cooldownKey = sourceCandidate?.cooldownKey ?? `${asset}:${timeframe}:unknown:${(market.close ?? market.price).toFixed(4)}`;
    await createStrategyDecision({
      userId,
      asset,
      timeframe,
      verdict: gated.verdict,
      confidence: String(gated.confidence),
      confluenceScore: String(gated.confluenceScore ?? 0),
      ruleEvidence: JSON.stringify(gated.ruleEvidence ?? []),
      ruleFindings: JSON.stringify(gated.ruleFindings ?? []),
      marketSnapshot: JSON.stringify(market),
      generatedDirection: gated.direction,
      generatedEntry: gated.entry == null ? null : String(gated.entry),
      generatedStopLoss: gated.stopLoss == null ? null : String(gated.stopLoss),
      generatedTakeProfit: gated.takeProfit == null ? null : String(gated.takeProfit),
      decisionReason: gated.adjustments,
      cooldownKey,
    });
    try {
      if (!shouldNotifyScannerSignal(gated.verdict)) {
        console.info(`[Scanner] ${asset} ${timeframe} candidate rejected by strategy gate: ${gated.adjustments}`);
        continue;
      }
      if (!gated.direction || gated.entry == null || gated.stopLoss == null || gated.takeProfit == null) {
        console.info(`[Scanner] ${asset} ${timeframe} strategy engine returned an incomplete approved outcome; no signal sent.`);
        continue;
      }
      const approvedLevels = { asset, timeframe, direction: gated.direction, entry: gated.entry, stopLoss: gated.stopLoss, takeProfit: gated.takeProfit, riskReward: 2, confidence: gated.confidence };
      const rationale = formatAuditResult(gated, market);
      const [result] = await db.insert(generatedSignals).values({ userId, asset, timeframe, direction: approvedLevels.direction as "BUY" | "SELL", entry: String(approvedLevels.entry), stopLoss: String(approvedLevels.stopLoss), takeProfit: String(approvedLevels.takeProfit), riskReward: "2.00", confidence: String(approvedLevels.confidence), rationale, intelligenceVersion: replacementModel.id, intelligenceComponents: JSON.stringify(gated.decisionTrace?.supportingComponents ?? gated.ruleEvidence ?? []), marketRegime: gated.marketRegime ?? market.replacementMarketRegime ?? null, status: "PENDING" });
      const signal = { id: Number(result.insertId), ...approvedLevels };
      await mirrorToSupabase("generated_signals", { user_id: userId, ...signal, status: "PENDING", rationale, rule_evidence: gated.ruleEvidence ?? [], confluence_score: gated.confluenceScore ?? 0 });
      const delivery = await sendTelegramMessage(formatApprovedTelegramMessage({ asset, timeframe, direction: approvedLevels.direction, entry: approvedLevels.entry, stopLoss: approvedLevels.stopLoss, takeProfit: approvedLevels.takeProfit, confidence: approvedLevels.confidence, adjustments: gated.adjustments, ruleEvidence: gated.ruleEvidence, confluenceScore: gated.confluenceScore, decisionTrace: gated.decisionTrace, fundamentalContext: market.fundamentalContext }), asset);
      await recordTelegramDelivery({ userId, signalId: signal.id, kind: "SIGNAL", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey: `signal:${signal.id}`, error: delivery.error });
      created.push(signal);
    } catch (error) {
      console.warn(`[Scanner] ${asset} ${timeframe} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  return { created: created.length, tracked: await trackOpenSignals(userId, seriesCache), marketData: "available" };
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
      const market = cached
        ? { symbol: signal.asset, price: cached.close, close: cached.close, high: Number(cached.values.at(-1)?.high), low: Number(cached.values.at(-1)?.low), fetchedAt: cached.fetchedAt }
        : await fetchMarketSnapshot(signal.asset, timeframe === "1H" ? "1h" : "15min");
      const price = market.price;
      const stop = Number(signal.stopLoss);
      const target = Number(signal.takeProfit);
      const status = resolveOutcome(signal.direction, price, stop, target, Number(market.high), Number(market.low));
      if (!status) continue;
      const note = `Closed from live ${signal.asset} ${signal.timeframe} price ${price}.`;
      await db.update(generatedSignals).set({ status, closedAt: new Date(), outcomeNote: note }).where(eq(generatedSignals.id, signal.id));
      await mirrorToSupabase("trade_outcomes", { signal_id: signal.id, user_id: userId, status, close_price: price, note });
      const activeVersion = await getActiveIntelligenceVersion(userId);
      let lesson: Record<string, unknown> = { outcome: status, reinforcement: status === "WIN" ? "Reinforce the compiled components that supported this direction after forward validation." : "Do not promote this failure into active intelligence without repeated evidence." };
      if (status === "LOSS") {
        try {
          const forensics = await forensicAnalysis({ asset: signal.asset, direction: signal.direction, entry: String(signal.entry), stopLoss: String(signal.stopLoss), takeProfit: String(signal.takeProfit) }, market, await getAllRulesText(userId));
          lesson = { ...lesson, rootCause: forensics.rootCause, lesson: forensics.lesson, guardrail: forensics.guardrail };
          await db.update(generatedSignals).set({ outcomeNote: `${note} Proposed lesson: ${forensics.rootCause}` }).where(eq(generatedSignals.id, signal.id));
        } catch (forensicError) {
          lesson = { ...lesson, forensicStatus: "UNAVAILABLE", error: forensicError instanceof Error ? forensicError.message : String(forensicError) };
        }
      }
      await createStrategyLesson({ userId, signalId: signal.id, sourceVersionId: activeVersion?.id ?? null, outcome: status, status: "PROPOSED", observation: note, lessonJson: JSON.stringify(lesson) });
      const signalDelivery = await getTelegramDeliveryForSignal(userId, signal.id, "SIGNAL");
      const delivery = await sendTelegramMessage(formatOutcomeTelegramMessage({ asset: signal.asset, timeframe: signal.timeframe, direction: signal.direction, status, entry: signal.entry, stopLoss: signal.stopLoss, takeProfit: signal.takeProfit, closePrice: price, signalId: signal.id, note }), signal.asset, { replyToMessageId: signalDelivery?.status === "DELIVERED" ? signalDelivery.telegramMessageId ?? undefined : undefined });
      await recordTelegramDelivery({ userId, signalId: signal.id, kind: "OUTCOME", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey: `outcome:${signal.id}:${status}`, error: delivery.error });
      tracked += 1;
    } catch (error) {
      console.warn(`[Tracker] ${signal.asset} ${signal.timeframe} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  return tracked;
}

export async function scanAllUsers() {
  const db = await getDb();
  if (!db) return { users: 0, created: 0, tracked: 0, marketData: "not-run" as const };
  const allUsers = await db.select({ id: users.id }).from(users);
  let created = 0;
  let tracked = 0;
  let marketData: ScanMarketDataStatus = allUsers.length ? "available" : "not-run";
  for (const user of allUsers) {
    const result = await scanUser(user.id);
    created += result.created;
    tracked += result.tracked;
    if (result.marketData === "unavailable") marketData = "unavailable";
    else if (result.marketData === "not-run" && marketData === "available") marketData = "not-run";
  }
  return { users: allUsers.length, created, tracked, marketData };
}
