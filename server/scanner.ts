import { and, eq } from "drizzle-orm";
import { generatedSignals, users } from "../drizzle/schema";
import { activateIntelligenceVersion, createIntelligenceComponent, createIntelligenceVersion, createPaperTradeAdjustment, createStrategyDecision, createStrategyLesson, ENTRY_FORGER_V5_GENERATION_MODE, ENTRY_LOCATOR_V5_GENERATION_MODE, getActiveIntelligenceVersion, getAllRulesText, getDb, getEntryLocatorState, getRelevantRulesText, getTelegramDeliveryForSignal, hasOpenGeneratedSignal, hasTelegramDelivery, claimOwnerAlert, listAcceptedStrategyLessons, listFailedOutcomeDeliveries, listIntelligenceComponents, listOpenCurrentV5Signals, listStrategyRules, recordStrategyEngineHealth, recordTelegramDelivery, saveEntryForgerState, saveEntryLocatorState, markOwnerAlertNotified, supersedeGeneratedSignal, updateStrategyEngineStatus } from "./db";
import { buildMultiTimeframeContext } from "./market-context";
import { fetchOfficialMacroContext } from "./official-macro";
import { buildIntelligenceModel, compileExecutableComponents, evaluateExecutableIntelligence, type ExecutableComponent } from "./intelligence";
import { ALLOWED_RISK_REWARD_RATIOS, buildReplacementKnowledgeModelV3, buildReplacementKnowledgeModelV5, detectSetupIndicators, evaluateReplacementIntelligence } from "./replacement-intelligence";
import { advanceEntryLocator, countStrongSetupIndicators, hasBreakoutConfirmationTransition, markEntryLocatorEmitted, type EntryLocatorObservation } from "./entry-locator";
import { buildEntryForgerDashboardState, canUseEntryForgerFallback, deriveEntryForgerLevels } from "./entry-forger";
import { evaluateHierarchicalWorkflow } from "./multitimeframe-workflow";
import { describePaperSignalQuality, hasMinimumPaperSignalQuality } from "./paper-signal-quality";
import { detectPaperTradeContradiction } from "./paper-trade-adjustments";
import { buildUpgradePaperAdjustmentReason, buildUpgradeTelegramDedupeKey, compareStrongerSameDirectionSetup } from "./paper-trade-upgrades";
import { fetchMarketSeries, fetchMarketSeriesBatch, fetchMarketSnapshot, fetchStrategyRulesFromSupabase, forensicAnalysis, formatApprovedTelegramMessage, formatOutcomeTelegramMessage, formatPaperTradeAdjustmentTelegramMessage, formatPaperTradeContradictionWarningTelegramMessage, formatPaperTradeUpgradeTelegramMessage, formatAuditResult, generateScannerDecisions, mirrorToSupabase, normalizeForensicFinding, sendTelegramMessage, type MarketSeries, type MarketSnapshot } from "./integrations";
import { notifyOwner } from "./_core/notification";

const WATCHLIST = ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"] as const;
const TIMEFRAMES = ["15MIN", "1H"] as const;

function precision(asset: string) {
  return asset === "BTC/USD" ? 2 : asset === "XAU/USD" ? 4 : 5;
}

export function shouldNotifyScannerSignal(verdict: string) {
  return verdict === "APPROVED";
}

export function canEmitV5Locator(input: { locatorReady: boolean; strategyApproved: boolean; levelsComplete: boolean }) {
  return input.locatorReady && input.strategyApproved && input.levelsComplete;
}

export function shouldCreateCandidate(ruleCount: number, series: { close?: number; trend?: string } | null) {
  return ruleCount > 0 && Boolean(series && Number.isFinite(series.close) && (series.trend === "UP" || series.trend === "DOWN"));
}

export function buildSetupIdentity(asset: string, timeframe: string, direction: "BUY" | "SELL", marketRegime: string | null | undefined, breakoutState: string | null | undefined) {
  return `${asset}:${timeframe}:${direction}:${marketRegime ?? "UNKNOWN"}:${breakoutState ?? "UNKNOWN"}`;
}

export function resolveOutcome(direction: "BUY" | "SELL", price: number, stop: number, target: number, high = price, low = price, entry = price): "WIN" | "LOSS" | null {
  const observedHigh = Number.isFinite(high) ? high : price;
  const observedLow = Number.isFinite(low) ? low : price;
  const entered = direction === "BUY" ? observedHigh >= entry : observedLow <= entry;
  if (!entered) return null;
  const win = direction === "BUY" ? observedHigh >= target : observedLow <= target;
  const loss = direction === "BUY" ? observedLow <= stop : observedHigh >= stop;
  return win ? "WIN" : loss ? "LOSS" : null;
}

export type OutcomeCandle = { datetime?: string | null; high?: unknown; low?: unknown };

export function getOutcomeCandles(market: Pick<MarketSnapshot, "values">): OutcomeCandle[] {
  return (market.values ?? []) as OutcomeCandle[];
}

export function aggregatePostEntryEvidence(direction: "BUY" | "SELL", signalOpenedAt: Date | string, entry: number, candles: readonly OutcomeCandle[], currentPrice: number) {
  const openedAt = signalOpenedAt instanceof Date ? signalOpenedAt.getTime() : new Date(signalOpenedAt).getTime();
  const validCurrentPrice = Number.isFinite(currentPrice) ? currentPrice : null;
  let high = validCurrentPrice ?? Number.NEGATIVE_INFINITY;
  let low = validCurrentPrice ?? Number.POSITIVE_INFINITY;
  let entered = validCurrentPrice !== null && (direction === "BUY" ? validCurrentPrice >= entry : validCurrentPrice <= entry);
  let latestCandleAt: string | null = null;
  let usedIntrabar = false;
  for (const candle of candles) {
    if (!candle.datetime) continue;
    const candleAt = new Date(candle.datetime.includes("T") ? candle.datetime : `${candle.datetime.replace(" ", "T")}Z`).getTime();
    if (!Number.isFinite(candleAt) || !Number.isFinite(openedAt)) continue;
    const candleHigh = Number(candle.high);
    const candleLow = Number(candle.low);
    if (!Number.isFinite(candleHigh) || !Number.isFinite(candleLow) || candleAt < openedAt) continue;
    high = Math.max(high, candleHigh);
    low = Math.min(low, candleLow);
    latestCandleAt = candle.datetime;
    usedIntrabar = true;
    if (direction === "BUY" ? candleHigh >= entry : candleLow <= entry) entered = true;
  }
  return { high, low, entered, latestCandleAt, usedIntrabar };
}

export function resolveOutcomeFromPostEntryEvidence(direction: "BUY" | "SELL", price: number, stop: number, target: number, entry: number, evidence: ReturnType<typeof aggregatePostEntryEvidence>, assumeEntry = false): "WIN" | "LOSS" | null {
  if (!assumeEntry && !evidence.entered) return null;
  return resolveOutcome(direction, price, stop, target, evidence.high, evidence.low, entry);
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

export function attachSetupIndicators<T extends { market: Record<string, unknown> }>(decision: T, setupIndicators: unknown[]) {
  return { ...decision, setupIndicators, market: { ...decision.market, setupIndicators } };
}

export function safelyEvaluateBaselineIntelligence(input: Parameters<typeof evaluateReplacementIntelligence>[0], model: Parameters<typeof evaluateReplacementIntelligence>[1]) {
  try {
    return { status: "AVAILABLE" as const, decision: evaluateReplacementIntelligence(input, model), error: undefined };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: "UNAVAILABLE" as const, decision: undefined, error: reason };
  }
}

export function isEligibleContradictoryReplacement(decision: { contradictionLocatorReady?: boolean; entry?: unknown; stopLoss?: unknown; takeProfit?: unknown; decisionTrace?: { levelDerivation?: { selectedRiskReward?: unknown } } }) {
  const selectedRiskReward = Number(decision.decisionTrace?.levelDerivation?.selectedRiskReward);
  const hasLevels = [decision.entry, decision.stopLoss, decision.takeProfit].every((value) => value != null && Number.isFinite(Number(value)));
  return decision.contradictionLocatorReady === true && hasLevels && (ALLOWED_RISK_REWARD_RATIOS as readonly number[]).includes(selectedRiskReward);
}

export function buildSignalDeliveryDedupeKey(signalId: number) {
  return `signal:${signalId}`;
}

export const MAX_OUTCOME_TRACKS_PER_RUN = 32;
export const MAX_FAILED_OUTCOME_RETRIES_PER_RUN = 2;

type ScanUserResult = { created: number; tracked: number; adjustments: number; marketData: ScanMarketDataStatus; marketDataError?: string | null };
type SharedMarketData = { series5m: Map<string, MarketSeries>; series15m: Map<string, MarketSeries>; series1h: Map<string, MarketSeries>; series4h: Map<string, MarketSeries> };
type ScanUserInput = { marketData?: SharedMarketData; marketDataError?: string | null };

async function fetchSharedMarketData(): Promise<SharedMarketData> {
  const startedAt = Date.now();
  console.info(`[Scanner] Shared market-data window started at=${new Date(startedAt).toISOString()}`);
  const batchResults = await Promise.allSettled([
    fetchMarketSeriesBatch(WATCHLIST, "5min"),
    fetchMarketSeriesBatch(WATCHLIST, "15min"),
    fetchMarketSeriesBatch(WATCHLIST, "1h"),
    fetchMarketSeriesBatch(WATCHLIST, "4h"),
  ]);
  const batchLabels = ["5min", "15min", "1h", "4h"] as const;
  const optional5m = batchResults[0];
  if (optional5m.status === "rejected") console.warn(`[Scanner] Optional 5min confirmation batch unavailable; continuing with 15min confirmation: ${optional5m.reason instanceof Error ? optional5m.reason.message : String(optional5m.reason)}`);
  const failures = batchResults.slice(1).flatMap((result, index) => result.status === "rejected" ? [{ interval: batchLabels[index + 1], message: result.reason instanceof Error ? result.reason.message : String(result.reason) }] : []);
  if (failures.length) throw new Error(failures.map((failure) => `Twelve Data ${failure.interval} unavailable: ${failure.message}`).join(" | "));
  const series5m = optional5m.status === "fulfilled" ? optional5m.value : new Map<string, MarketSeries>();
  const [series15m, series1h, series4h] = batchResults.slice(1).map((result) => (result as PromiseFulfilledResult<Map<string, MarketSeries>>).value) as [Map<string, MarketSeries>, Map<string, MarketSeries>, Map<string, MarketSeries>];
  console.info(`[Scanner] Shared market-data window completed series5m=${series5m.size} series15m=${series15m.size} series1h=${series1h.size} series4h=${series4h.size} durationMs=${Date.now() - startedAt} at=${new Date().toISOString()}`);
  return { series5m, series15m, series1h, series4h };
}

export function outcomeFallbackPrice(signal: { status: string; entry: string | number; stopLoss: string | number; takeProfit: string | number; outcomeNote?: string | null; resolutionPrice?: string | number | null }) {
  const resolutionPrice = Number(signal.resolutionPrice);
  if (Number.isFinite(resolutionPrice)) return resolutionPrice;
  const notePrice = signal.outcomeNote?.match(/price\s+([0-9]+(?:\.[0-9]+)?)/i)?.[1];
  if (notePrice && Number.isFinite(Number(notePrice))) return Number(notePrice);
  return Number(signal.status === "WIN" ? signal.takeProfit : signal.stopLoss);
}

export function selectOutcomeTrackingBatch<T extends { openedAt: Date | string }>(signals: T[], limit = MAX_OUTCOME_TRACKS_PER_RUN) {
  return [...signals].sort((left, right) => new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime()).slice(0, limit);
}

async function retryFailedOutcomeDeliveries(userId: number) {
  const failed = await listFailedOutcomeDeliveries(userId, MAX_FAILED_OUTCOME_RETRIES_PER_RUN);
  let retried = 0;
  for (const { delivery: failedDelivery, signal } of failed) {
    try {
      const signalDelivery = await getTelegramDeliveryForSignal(userId, signal.id, "SIGNAL");
      const closePrice = outcomeFallbackPrice(signal);
      const delivery = await sendTelegramMessage(formatOutcomeTelegramMessage({ asset: signal.asset, timeframe: signal.timeframe, direction: signal.direction, status: signal.status as "WIN" | "LOSS", entry: signal.entry, stopLoss: signal.stopLoss, takeProfit: signal.takeProfit, closePrice, signalId: signal.id, note: signal.outcomeNote ?? undefined }), signal.asset, { replyToMessageId: signalDelivery?.status === "DELIVERED" ? signalDelivery.telegramMessageId ?? undefined : undefined });
      await recordTelegramDelivery({ userId, signalId: signal.id, kind: "OUTCOME", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey: failedDelivery.dedupeKey, error: delivery.error });
      if (delivery.delivered) retried += 1;
    } catch (error) {
      console.warn(`[Tracker] Retry for ${signal.asset} ${signal.timeframe} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  return retried;
}

async function ensureReplacementIntelligenceVersion(userId: number) {
  const active = await getActiveIntelligenceVersion(userId);
  if (active?.versionLabel?.startsWith("forex-trading-combined-document-v5")) return active;
  const model = buildReplacementKnowledgeModelV5();
  const version = await createIntelligenceVersion({ userId, versionLabel: model.id, status: "ACTIVE", sourceRuleCount: 0, componentCount: model.nodes.length, lessonCount: 0, algorithmJson: JSON.stringify(model), validationJson: JSON.stringify({ status: "UNVALIDATED", reason: "Replacement intelligence v5 is active for paper signals by user instruction; forward validation remains ongoing." }), activatedAt: new Date() });
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

export async function scanUser(userId: number, input?: ScanUserInput): Promise<ScanUserResult> {
  const db = await getDb();
  if (!db) return { created: 0, tracked: 0, adjustments: 0, marketData: "not-run", marketDataError: null };

  let series5m: Map<string, MarketSeries>;
  let series15m: Map<string, MarketSeries>;
  let series1h: Map<string, MarketSeries>;
  let series4h: Map<string, MarketSeries>;
  const marketDataStartedAt = Date.now();
  console.info(`[Scanner] Market-data window ${input?.marketData ? "reused" : "started"} user=${userId} at=${new Date(marketDataStartedAt).toISOString()}`);
  try {
    if (input?.marketDataError) throw new Error(input.marketDataError);
    if (input?.marketData) {
      ({ series5m, series15m, series1h, series4h } = input.marketData);
    } else {
      ({ series5m, series15m, series1h, series4h } = await fetchSharedMarketData());
    }
    console.info(`[Scanner] Market-data window ready user=${userId} series15m=${series15m.size} series5m=${series5m.size} series1h=${series1h.size} durationMs=${Date.now() - marketDataStartedAt} at=${new Date().toISOString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateStrategyEngineStatus(userId, { status: "UNAVAILABLE", error: message });
    await recordStrategyEngineHealth(userId, { snapshots: 0, completeResponses: 0, retries: 1, unavailableCycle: true });
    console.warn("[Scanner] Market batch unavailable; no signals created:", message);
    return { created: 0, tracked: 0, adjustments: 0, marketData: "unavailable", marketDataError: `Twelve Data market-data window failed for required 15min/1h/4h series: ${message}` };
  }
  const seriesCache = new Map<string, MarketSeries>();
  series5m.forEach((series, symbol) => seriesCache.set(`${symbol}:5MIN`, series));
  series15m.forEach((series, symbol) => seriesCache.set(`${symbol}:15MIN`, series));
  series1h.forEach((series, symbol) => seriesCache.set(`${symbol}:1H`, series));
  series4h.forEach((series, symbol) => seriesCache.set(`${symbol}:4H`, series));
  const created: Array<{ id: number; asset: string; timeframe: string; direction: string; entry: number; stopLoss: number; takeProfit: number; riskReward: number; confidence: number }> = [];
  const createdSignalIds = new Set<number>();
  const mirroredRules = await fetchStrategyRulesFromSupabase();
  const mirroredText = mirroredRules.map((rule) => `## ${rule.title ?? "Saved strategy rule"}\n${rule.content ?? ""}`).join("\n\n").slice(0, 6_000);
  await ensureReplacementIntelligenceVersion(userId);
  const replacementModel = buildReplacementKnowledgeModelV5();
  const replacementBaselineModel = buildReplacementKnowledgeModelV3();
  const acceptedLessons = await listAcceptedStrategyLessons(userId);
  const candidates = WATCHLIST.flatMap((asset) => TIMEFRAMES.map((timeframe) => ({ asset, timeframe, series: seriesCache.get(`${asset}:${timeframe}`) })) ).filter((candidate): candidate is { asset: typeof WATCHLIST[number]; timeframe: typeof TIMEFRAMES[number]; series: MarketSeries } => Boolean(candidate.series)).map((candidate) => ({ ...candidate, cooldownKey: `${candidate.asset}:${candidate.timeframe}:PENDING` }));
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
        const detectedIndicators = market.marketContext ? detectSetupIndicators({ market: { asset, close: series.close, interval: series.interval, values: series.values }, context: market.marketContext, fundamentalContext }, replacementModel) : [];
        const hasDirectionalIndicator = detectedIndicators.some((indicator) => indicator.direction !== "NEUTRAL");
        const series4h = seriesCache.get(`${asset}:4H`);
        const series1hForWorkflow = seriesCache.get(`${asset}:1H`);
        const series15mForWorkflow = seriesCache.get(`${asset}:15MIN`);
        const series5mForWorkflow = seriesCache.get(`${asset}:5MIN`);
        const replacementIntelligence = market.marketContext && hasDirectionalIndicator
          ? evaluateHierarchicalWorkflow({ asset, timeframe, primary: series, series4h, series1h: series1hForWorkflow, series15m: series15mForWorkflow, series5m: series5mForWorkflow, fundamentalContext, acceptedLessons }, replacementModel)
          : null;
        const workflowIndicators = replacementIntelligence?.setupIndicators ?? detectedIndicators;
        if (!market.marketContext || !replacementIntelligence) {
          return { asset, timeframe, noDirectionalSetup: true, entryLocatorReady: false, entryLocatorReason: "No directional setup indicator detected; accumulating fresh scanner snapshots.", verdict: "SKIPPED" as const, confidence: 0, confluenceScore: 0, marketRegime: "WAITING/ACCUMULATING", adjustments: "No directional setup indicator detected; accumulating fresh scanner snapshots before constructing the hierarchical candidate.", direction: "NEUTRAL" as const, entry: null, stopLoss: null, takeProfit: null, ruleEvidence: [], ruleFindings: [], decisionTrace: undefined, setupIndicators: workflowIndicators, market: { ...market, fundamentalContext, setupIndicators: workflowIndicators, replacementIntelligence: undefined, v3BaselineIntelligence: undefined, replacementMarketRegime: "WAITING/ACCUMULATING" } };
        }
        const baselineEvaluation = market.marketContext ? safelyEvaluateBaselineIntelligence({ asset, close: series.close, interval: series.interval, values: series.values, marketContext: market.marketContext, fundamentalContext, acceptedLessons }, replacementBaselineModel) : { status: "UNAVAILABLE" as const, decision: undefined, error: "Market context unavailable" };
        const v3BaselineIntelligence = baselineEvaluation.decision;
        if (baselineEvaluation.status !== "AVAILABLE") console.warn(`[Scanner] ${asset} ${timeframe} baseline unavailable; continuing with hierarchical workflow: ${baselineEvaluation.error ?? "unknown baseline error"}`);
        const workflowQualified = replacementIntelligence.workflow.eligible;
        return attachSetupIndicators({
          asset,
          timeframe,
          entryLocatorReady: false,
          entryLocatorReason: workflowQualified ? "Hierarchical workflow qualified; entry locator status is assigned after this decision is observed." : replacementIntelligence.workflow.explanation,
          verdict: workflowQualified ? "APPROVED" as const : "SKIPPED" as const,
          confidence: replacementIntelligence.confidence,
          confluenceScore: replacementIntelligence.confluenceScore,
          marketRegime: replacementIntelligence.marketRegime,
          adjustments: replacementIntelligence.adjustments,
          direction: replacementIntelligence.direction,
          entry: workflowQualified ? replacementIntelligence.entry : null,
          stopLoss: workflowQualified ? replacementIntelligence.stopLoss : null,
          takeProfit: workflowQualified ? replacementIntelligence.takeProfit : null,
          ruleEvidence: replacementIntelligence.ruleEvidence,
          ruleFindings: replacementIntelligence.ruleFindings,
          decisionTrace: replacementIntelligence.decisionTrace,
          market: { ...market, fundamentalContext, setupIndicators: workflowIndicators, intelligenceSeed: replacementIntelligence, replacementIntelligence, v3BaselineIntelligence, v3BaselineStatus: baselineEvaluation.status, v3BaselineError: baselineEvaluation.error, replacementMarketRegime: replacementIntelligence.marketRegime },
        }, workflowIndicators);
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
    return { created: 0, tracked: await trackOpenSignals(userId, seriesCache), adjustments: 0, marketData: "available" };
  }
  const activeCurrentSignals = await listOpenCurrentV5Signals(userId);
  for (const gated of decisions) {
    const { asset, timeframe, market } = gated;
    const sourceCandidate = candidates.find((candidate) => candidate.asset === asset && candidate.timeframe === timeframe);
    const cooldownKey = gated.noDirectionalSetup ? `${asset}:${timeframe}:WAITING` : buildSetupIdentity(asset, timeframe, gated.direction as "BUY" | "SELL", gated.marketRegime, market.marketContext?.breakoutState);
    const latestCandle = sourceCandidate?.series.values.at(-1);
    const latestCandleDatetime = typeof latestCandle?.datetime === "string" ? latestCandle.datetime : undefined;
    const observation: EntryLocatorObservation = {
      fingerprint: `${asset}:${timeframe}:${gated.direction}:${gated.marketRegime}:${market.marketContext?.breakoutState ?? "UNKNOWN"}:${latestCandleDatetime ?? sourceCandidate?.series.fetchedAt}:${sourceCandidate?.series.close}`,
      observedAt: latestCandleDatetime ? new Date(latestCandleDatetime.replace(" ", "T") + "Z").toISOString() : sourceCandidate?.series.fetchedAt ?? new Date().toISOString(),
      direction: gated.noDirectionalSetup ? "NEUTRAL" : gated.direction,
      confidence: Number(gated.confidence ?? 0),
      confluence: Number(gated.confluenceScore ?? 0),
      marketRegime: gated.marketRegime ?? "UNKNOWN",
      eventRisk: market.fundamentalContext?.eventRisk ?? "UNKNOWN",
      geometryFallback: /adaptive target geometry did not qualify|no allowed ratio fits|breakout indication is not confirmed|fallback target/i.test(gated.adjustments ?? ""),
      supportingComponents: gated.decisionTrace?.supportingComponents ?? gated.ruleEvidence ?? [],
      indicatorEvidence: (gated.setupIndicators ?? []).map((indicator: any) => indicator.id ?? indicator.concept ?? "").filter(Boolean),
      breakoutState: market.marketContext?.breakoutState ?? "UNKNOWN",
      breakoutConfirmed: gated.decisionTrace?.levelDerivation?.geometryMode === "BREAKOUT_NEXT_ZONE",
      geometryMode: gated.decisionTrace?.levelDerivation?.geometryMode ?? "RANGE_OPPOSING_ZONE",
      nextResistance: market.marketContext?.nextResistance ?? null,
      nextSupport: market.marketContext?.nextSupport ?? null,
      targetBoundary: (market.replacementIntelligence as any)?.workflow?.targetBoundary ?? (market.marketContext ? (gated.direction === "BUY" ? market.marketContext.nextResistance ?? market.marketContext.supportResistance.resistance : market.marketContext.nextSupport ?? market.marketContext.supportResistance.support) : null),
      workflowQualified: Boolean((market.replacementIntelligence as any)?.workflow?.eligible),
      conflictingComponents: gated.decisionTrace?.conflictingComponents ?? [],
    };
    const hasOpenSignal = await hasOpenGeneratedSignal(userId, asset, timeframe, replacementModel.id, ENTRY_LOCATOR_V5_GENERATION_MODE);
    const storedLocator = await getEntryLocatorState(userId, asset, timeframe);
    let previousLocator: Record<string, unknown> | null = null;
    try { previousLocator = storedLocator?.stateJson ? JSON.parse(storedLocator.stateJson) : null; } catch { previousLocator = null; }
    const locatorResult = advanceEntryLocator({ previous: previousLocator, observation, hasOpenSignal });
    const paperSignalQualityApproved = hasMinimumPaperSignalQuality(gated.confidence, gated.confluenceScore);
    const paperSignalQualityReason = describePaperSignalQuality(gated.confidence, gated.confluenceScore);
    const locatorReadyForEmission = locatorResult.ready && paperSignalQualityApproved;
    const v5LevelsComplete = gated.direction != null && gated.entry != null && gated.stopLoss != null && gated.takeProfit != null;
    const strategyApproved = shouldNotifyScannerSignal(gated.verdict);
    const executableLocatorEmission = canEmitV5Locator({ locatorReady: locatorReadyForEmission, strategyApproved, levelsComplete: v5LevelsComplete });
    gated.entryLocatorReady = executableLocatorEmission;
    gated.entryLocatorReason = !paperSignalQualityApproved && locatorResult.ready
      ? `Entry Locator blocked emission: ${paperSignalQualityReason}`
      : !strategyApproved
        ? `Entry Locator is not emitted because the v5 hierarchy judgment is ${gated.verdict}; waiting for a qualified structural plan.`
        : !v5LevelsComplete
          ? "Entry Locator is not emitted because the v5 plan does not contain complete executable levels."
          : locatorResult.reason;
    const activeSignal = activeCurrentSignals.find((signal) => signal.asset === asset && signal.timeframe === timeframe);
    const upgradeLocatorResult = activeSignal
      ? advanceEntryLocator({ previous: previousLocator ? { ...previousLocator, status: "WAITING" } : null, observation, hasOpenSignal: false })
      : null;
    gated.contradictionLocatorReady = activeSignal ? Boolean(upgradeLocatorResult?.ready && paperSignalQualityApproved) : locatorReadyForEmission;
    gated.contradictionLocatorReason = activeSignal ? (paperSignalQualityApproved ? upgradeLocatorResult?.reason ?? locatorResult.reason : `Contradiction monitor blocked: ${paperSignalQualityReason}`) : gated.entryLocatorReason;
    const qualitySafeLocatorState = !paperSignalQualityApproved && locatorResult.ready
      ? { ...locatorResult.state, status: "WAITING" as const, waitReason: `Entry Locator blocked emission: ${paperSignalQualityReason}` }
      : !strategyApproved || !v5LevelsComplete
        ? { ...locatorResult.state, status: "WAITING" as const, waitReason: gated.entryLocatorReason }
        : locatorResult.state;
    const locatorState = executableLocatorEmission ? markEntryLocatorEmitted(qualitySafeLocatorState, observation.fingerprint) : qualitySafeLocatorState;
    await saveEntryLocatorState({ userId, asset, timeframe, status: locatorState.status, snapshotCount: locatorState.snapshotCount, lastSnapshotAt: locatorState.lastSnapshotAt ? new Date(locatorState.lastSnapshotAt) : null,       lastDirection: observation.direction === "NEUTRAL" ? null : observation.direction, lastConfidence: String(observation.confidence), lastConfluence: String(observation.confluence), evidenceJson: JSON.stringify({ supporting: observation.supportingComponents, conflicting: observation.conflictingComponents }), conflictJson: JSON.stringify(observation.conflictingComponents), stateJson: JSON.stringify(locatorState), lastEmittedAt: executableLocatorEmission ? new Date() : storedLocator?.lastEmittedAt ?? null });
    if (hasBreakoutConfirmationTransition(previousLocator, observation)) {
      const dedupeKey = `BREAKOUT_CONFIRMED:${userId}:${asset}:${timeframe}:${observation.fingerprint}`;
      const content = `${asset} ${timeframe} has transitioned to a confirmed ${observation.direction} breakout. Geometry mode: ${observation.geometryMode ?? "UNKNOWN"}. Next opposing zone: ${observation.direction === "BUY" ? observation.nextResistance ?? "not recorded" : observation.nextSupport ?? "not recorded"}. This is an operational paper-trading alert; it is not a guarantee and does not itself emit a signal.`;
      try {
        const shouldNotify = await claimOwnerAlert({ userId, alertType: "BREAKOUT_CONFIRMED", dedupeKey, title: `Confirmed breakout: ${asset} ${timeframe}`, content });
        if (shouldNotify && await notifyOwner({ title: `Confirmed breakout: ${asset} ${timeframe}`, content })) await markOwnerAlertNotified(dedupeKey);
      } catch (error) {
        console.warn(`[Scanner] Breakout owner alert failed for ${asset} ${timeframe}:`, error);
      }
    }
    const strongIndicatorCount = countStrongSetupIndicators(observation.supportingComponents);
    const indicatorBucket = strongIndicatorCount === 1 ? "ONE_STRONG" : strongIndicatorCount >= 2 ? "TWO_PLUS" : "NONE";
    const locatorMarket = { ...market, entryLocator: { status: locatorState.status, ready: executableLocatorEmission, reason: gated.entryLocatorReason, snapshotCount: locatorState.snapshotCount, fingerprint: observation.fingerprint, strongIndicatorCount, indicatorBucket } };
    const decisionVerdict = executableLocatorEmission ? gated.verdict : "SKIPPED" as const;
    const executableDecision = decisionVerdict === "APPROVED";
    await createStrategyDecision({
      userId,
      asset,
      timeframe,
      verdict: decisionVerdict,
      confidence: String(gated.confidence),
      confluenceScore: String(gated.confluenceScore ?? 0),
      ruleEvidence: JSON.stringify(gated.ruleEvidence ?? []),
      ruleFindings: JSON.stringify(gated.ruleFindings ?? []),
      marketSnapshot: JSON.stringify(locatorMarket),
      generatedDirection: executableDecision ? gated.direction : null,
      generatedEntry: executableDecision && gated.entry != null ? String(gated.entry) : null,
      generatedStopLoss: executableDecision && gated.stopLoss != null ? String(gated.stopLoss) : null,
      generatedTakeProfit: executableDecision && gated.takeProfit != null ? String(gated.takeProfit) : null,
      decisionReason: `${gated.adjustments} Entry locator: ${gated.entryLocatorReason}`,
      cooldownKey,
    });
    try {
      const saveForgerState = async (status: "WAITING" | "READY" | "EMITTED" | "REJECTED", reason: string, details: { targetDistance?: number | null; riskReward?: number | null } = {}) => {
        const dashboardState = buildEntryForgerDashboardState(status, reason, { targetBoundary: observation.targetBoundary, targetDistance: details.targetDistance ?? null, riskReward: details.riskReward ?? null });
        await saveEntryForgerState({ userId, asset, timeframe, status, snapshotCount: locatorState.snapshotCount, lastSnapshotAt: locatorState.lastSnapshotAt ? new Date(locatorState.lastSnapshotAt) : null, lastDirection: observation.direction === "NEUTRAL" ? null : observation.direction, lastConfidence: String(observation.confidence), lastConfluence: String(observation.confluence), reason, targetBoundary: observation.targetBoundary, targetDistance: details.targetDistance ?? null, riskReward: details.riskReward ?? null, stateJson: JSON.stringify(dashboardState) });
      };
      const locatorGeometryDenied = /no allowed ratio fits|no allowed adaptive ratio|adaptive target geometry did not qualify/i.test(`${gated.adjustments ?? ""} ${locatorResult.reason}`);
      const eligibleForgerFallback = canUseEntryForgerFallback({ locatorReady: executableLocatorEmission, geometryDenied: locatorGeometryDenied, v5Active: replacementModel.id.endsWith("v5"), strategyApproved, qualityApproved: paperSignalQualityApproved, hasCompleteLevels: v5LevelsComplete, activeSignal: Boolean(activeSignal) });
      if (!executableLocatorEmission && !eligibleForgerFallback) {
        const forgerStatus = !paperSignalQualityApproved || !shouldNotifyScannerSignal(gated.verdict) || !(gated.direction != null && gated.entry != null && gated.stopLoss != null && gated.takeProfit != null) ? "REJECTED" as const : "WAITING" as const;
        const forgerReason = !paperSignalQualityApproved
          ? `Entry Forger rejected by the shared quality gate: ${paperSignalQualityReason}`
          : !shouldNotifyScannerSignal(gated.verdict)
            ? `Entry Forger rejected because the strategy judgment was ${gated.verdict}; only APPROVED judgments can reach Telegram.`
            : activeSignal
              ? "Entry Forger is waiting because this asset/timeframe already has an active v5 paper setup."
              : !(gated.direction != null && gated.entry != null && gated.stopLoss != null && gated.takeProfit != null)
                ? "Entry Forger rejected because the v5 candidate did not contain complete executable levels."
                : `Entry Forger is waiting for an Entry Locator geometry denial before using the target-first fallback. ${locatorResult.reason}`;
        await saveForgerState(forgerStatus, forgerReason);
        console.info(`[Scanner] ${asset} ${timeframe} entry locator waiting: ${locatorResult.reason}`);
        continue;
      }
      if (eligibleForgerFallback) {
        await saveForgerState("READY", "Entry Locator denied only the allowed geometry; Entry Forger is eligible to evaluate a target-first fallback.");
      } else if (executableLocatorEmission) {
        await saveForgerState("WAITING", "Entry Locator qualified this setup; Entry Forger remains inactive because Locator has precedence.");
      }
      if (!shouldNotifyScannerSignal(gated.verdict)) {
        await saveForgerState("REJECTED", `Entry Forger rejected because the strategy judgment was ${gated.verdict}; only APPROVED judgments can reach Telegram.`);
        console.info(`[Scanner] ${asset} ${timeframe} candidate rejected by strategy gate: ${gated.adjustments}`);
        continue;
      }
      if (!gated.direction || gated.entry == null || gated.stopLoss == null || gated.takeProfit == null) {
        await saveForgerState("REJECTED", "Entry Forger rejected because the v5 candidate did not contain complete executable levels.");
        console.info(`[Scanner] ${asset} ${timeframe} strategy engine returned an incomplete approved outcome; no signal sent.`);
        continue;
      }
      const hierarchicalQualified = Boolean((market.replacementIntelligence as any)?.workflow?.eligible);
      const adaptiveV5 = replacementModel.id.endsWith("v5") && !hierarchicalQualified;
      const traceRatio = gated.decisionTrace?.levelDerivation?.selectedRiskReward;
      const selectedRiskReward = hierarchicalQualified ? Number(gated.riskReward ?? traceRatio ?? 0) : adaptiveV5 ? (traceRatio == null ? Number.NaN : Number(traceRatio)) : Number(gated.riskReward ?? 2);
      const allowedRatios = hierarchicalQualified ? [selectedRiskReward] : adaptiveV5 ? (ALLOWED_RISK_REWARD_RATIOS as readonly number[]) : [2];
      if (!allowedRatios.includes(selectedRiskReward)) {
        const canForge = adaptiveV5 && locatorGeometryDenied && paperSignalQualityApproved && !activeSignal && Boolean(gated.direction) && gated.entry != null;
        const forged = canForge ? deriveEntryForgerLevels({ entry: Number(gated.entry), direction: gated.direction as "BUY" | "SELL", targetBoundary: observation.targetBoundary, atr: market.marketContext?.volatility.atr }) : { ready: false as const, reason: "Entry Forger not eligible until Entry Locator geometry denial." };
        if (forged.ready) {
          await saveForgerState("EMITTED", forged.reason, { targetDistance: forged.targetDistance, riskReward: forged.riskReward });
          const forgedLevels = { asset, timeframe, direction: gated.direction, entry: forged.entry, stopLoss: forged.stopLoss, takeProfit: forged.takeProfit, riskReward: forged.riskReward, confidence: gated.confidence };
          const forgedRationale = `${formatAuditResult(gated, market)} Entry Forger: ${forged.reason}`;
          const [forgedResult] = await db.insert(generatedSignals).values({ userId, asset, timeframe, direction: forgedLevels.direction as "BUY" | "SELL", entry: String(forgedLevels.entry), stopLoss: String(forgedLevels.stopLoss), takeProfit: String(forgedLevels.takeProfit), riskReward: forgedLevels.riskReward.toFixed(2), confidence: String(forgedLevels.confidence), confluenceScore: String(gated.confluenceScore ?? 0), rationale: forgedRationale, intelligenceVersion: replacementModel.id, generationMode: ENTRY_FORGER_V5_GENERATION_MODE, intelligenceComponents: JSON.stringify([...(gated.decisionTrace?.supportingComponents ?? gated.ruleEvidence ?? []), "ENTRY FORGER: target-first fallback after Entry Locator geometry denial"]), marketRegime: gated.marketRegime ?? market.replacementMarketRegime ?? null, status: "PENDING" });
          const forgedSignal = { id: Number(forgedResult.insertId), ...forgedLevels };
          await mirrorToSupabase("generated_signals", { user_id: userId, ...forgedSignal, status: "PENDING", rationale: forgedRationale, generation_mode: ENTRY_FORGER_V5_GENERATION_MODE, rule_evidence: gated.ruleEvidence ?? [], confluence_score: gated.confluenceScore ?? 0 });
          const forgedDelivery = await sendTelegramMessage(formatApprovedTelegramMessage({ asset, timeframe, direction: forgedLevels.direction, entry: forgedLevels.entry, stopLoss: forgedLevels.stopLoss, takeProfit: forgedLevels.takeProfit, confidence: forgedLevels.confidence, riskReward: forgedLevels.riskReward, adjustments: `${gated.adjustments ?? ""} Entry Locator denied the exact allowed geometry; Entry Forger selected the target-first fallback.`, ruleEvidence: gated.ruleEvidence, confluenceScore: gated.confluenceScore, decisionTrace: gated.decisionTrace, fundamentalContext: market.fundamentalContext, generationSource: "ENTRY_FORGER" }), asset);
          await recordTelegramDelivery({ userId, signalId: forgedSignal.id, kind: "SIGNAL", status: forgedDelivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: forgedDelivery.telegramMessageId, dedupeKey: buildSignalDeliveryDedupeKey(forgedSignal.id), error: forgedDelivery.error });
          created.push(forgedSignal);
          createdSignalIds.add(forgedSignal.id);
          console.info(`[Scanner] ${asset} ${timeframe} emitted an Entry Forger fallback after Entry Locator denial.`);
          continue;
        }
        await saveForgerState("REJECTED", `Entry Forger did not qualify: ${forged.reason}`);
        console.info(`[Scanner] ${asset} ${timeframe} has no allowed adaptive ratio; Entry Forger did not qualify: ${forged.reason}`);
        continue;
      }
      const approvedLevels = { asset, timeframe, direction: gated.direction, entry: gated.entry, stopLoss: gated.stopLoss, takeProfit: gated.takeProfit, riskReward: selectedRiskReward, confidence: gated.confidence };
      if (hasOpenSignal) {
        const upgrade = activeSignal && upgradeLocatorResult?.ready && gated.direction === activeSignal.direction
          ? compareStrongerSameDirectionSetup(activeSignal, { direction: gated.direction, confidence: gated.confidence, confluenceScore: gated.confluenceScore, entry: gated.entry, stopLoss: gated.stopLoss, takeProfit: gated.takeProfit, riskReward: approvedLevels.riskReward, marketRegime: gated.marketRegime, ruleEvidence: gated.ruleEvidence, decisionTrace: gated.decisionTrace })
          : null;
        if (!upgrade || !activeSignal) {
          await saveForgerState("WAITING", "Entry Forger is waiting because an active v5 paper setup already occupies this asset/timeframe.");
          console.info(`[Scanner] ${asset} ${timeframe} already has an active paper setup; current candidate evaluated immediately but duplicate suppressed.`);
          continue;
        }
        const upgradeDedupeKey = buildUpgradeTelegramDedupeKey(activeSignal.id, upgrade.fingerprint);
        if (await hasTelegramDelivery(upgradeDedupeKey)) {
          await saveForgerState("WAITING", "Entry Forger is waiting; the stronger Locator replacement for this active setup was already delivered.");
          console.info(`[Scanner] ${asset} ${timeframe} stronger setup upgrade already delivered; duplicate suppressed.`);
          continue;
        }
        const [replacementResult] = await db.insert(generatedSignals).values({ userId, asset, timeframe, direction: approvedLevels.direction as "BUY" | "SELL", entry: String(approvedLevels.entry), stopLoss: String(approvedLevels.stopLoss), takeProfit: String(approvedLevels.takeProfit), riskReward: approvedLevels.riskReward.toFixed(2), confidence: String(approvedLevels.confidence), confluenceScore: String(gated.confluenceScore ?? 0), rationale: formatAuditResult(gated, market), intelligenceVersion: replacementModel.id, generationMode: ENTRY_LOCATOR_V5_GENERATION_MODE, intelligenceComponents: JSON.stringify(gated.decisionTrace?.supportingComponents ?? gated.ruleEvidence ?? []), marketRegime: gated.marketRegime ?? market.replacementMarketRegime ?? null, status: "PENDING" });
        const replacementSignalId = Number(replacementResult.insertId);
        const upgradeReason = buildUpgradePaperAdjustmentReason(upgrade);
        await supersedeGeneratedSignal(activeSignal.id, replacementSignalId, upgradeReason);
        await createPaperTradeAdjustment({ userId, signalId: activeSignal.id, replacementSignalId, asset, timeframe, originalDirection: activeSignal.direction as "BUY" | "SELL", observedDirection: gated.direction as "BUY" | "SELL", currentPrice: String(market.close), confidence: String(gated.confidence), confluenceScore: String(gated.confluenceScore ?? 0), action: "UPGRADE_PAPER_SETUP", reason: upgradeReason, evidenceJson: JSON.stringify(upgrade.evidence), dedupeKey: upgradeDedupeKey });
        const originalDelivery = await getTelegramDeliveryForSignal(userId, activeSignal.id, "SIGNAL");
        const delivery = await sendTelegramMessage(formatPaperTradeUpgradeTelegramMessage({ signalId: activeSignal.id, replacementSignalId, asset, timeframe, direction: gated.direction, entry: approvedLevels.entry, stopLoss: approvedLevels.stopLoss, takeProfit: approvedLevels.takeProfit, confidence: gated.confidence, riskReward: approvedLevels.riskReward, confluenceScore: gated.confluenceScore, reason: upgradeReason, improvements: upgrade.evidence.improvements }), asset, { replyToMessageId: originalDelivery?.status === "DELIVERED" ? originalDelivery.telegramMessageId ?? undefined : undefined });
        await recordTelegramDelivery({ userId, signalId: activeSignal.id, kind: "ADJUSTMENT", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey: upgradeDedupeKey, error: delivery.error });
        if (delivery.delivered && delivery.telegramMessageId) await recordTelegramDelivery({ userId, signalId: replacementSignalId, kind: "SIGNAL", status: "DELIVERED", telegramMessageId: delivery.telegramMessageId, dedupeKey: buildSignalDeliveryDedupeKey(replacementSignalId) });
        await mirrorToSupabase("generated_signals", { user_id: userId, ...approvedLevels, signal_id: replacementSignalId, status: "PENDING", rationale: formatAuditResult(gated, market), confluence_score: gated.confluenceScore ?? 0 });
        created.push({ id: replacementSignalId, ...approvedLevels });
        createdSignalIds.add(replacementSignalId);
        await saveForgerState("WAITING", "Entry Locator emitted a stronger replacement; Entry Forger remains inactive because Locator has precedence.", { riskReward: approvedLevels.riskReward });
        console.info(`[Scanner] ${asset} ${timeframe} emitted a stronger setup upgrade linked to signal #${activeSignal.id}.`);
        continue;
      }
      const rationale = formatAuditResult(gated, market);
      const [result] = await db.insert(generatedSignals).values({ userId, asset, timeframe, direction: approvedLevels.direction as "BUY" | "SELL", entry: String(approvedLevels.entry), stopLoss: String(approvedLevels.stopLoss), takeProfit: String(approvedLevels.takeProfit), riskReward: approvedLevels.riskReward.toFixed(2), confidence: String(approvedLevels.confidence), confluenceScore: String(gated.confluenceScore ?? 0), rationale, intelligenceVersion: replacementModel.id, generationMode: ENTRY_LOCATOR_V5_GENERATION_MODE, intelligenceComponents: JSON.stringify(gated.decisionTrace?.supportingComponents ?? gated.ruleEvidence ?? []), marketRegime: gated.marketRegime ?? market.replacementMarketRegime ?? null, status: "PENDING" });
      const signal = { id: Number(result.insertId), ...approvedLevels };
      await mirrorToSupabase("generated_signals", { user_id: userId, ...signal, status: "PENDING", rationale, rule_evidence: gated.ruleEvidence ?? [], confluence_score: gated.confluenceScore ?? 0 });
      const delivery = await sendTelegramMessage(formatApprovedTelegramMessage({ asset, timeframe, direction: approvedLevels.direction, entry: approvedLevels.entry, stopLoss: approvedLevels.stopLoss, takeProfit: approvedLevels.takeProfit, confidence: approvedLevels.confidence, riskReward: approvedLevels.riskReward, adjustments: gated.adjustments, ruleEvidence: gated.ruleEvidence, confluenceScore: gated.confluenceScore, decisionTrace: gated.decisionTrace, fundamentalContext: market.fundamentalContext, generationSource: "ENTRY_LOCATOR" }), asset);
      await recordTelegramDelivery({ userId, signalId: signal.id, kind: "SIGNAL", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey: buildSignalDeliveryDedupeKey(signal.id), error: delivery.error });
      created.push(signal);
      createdSignalIds.add(signal.id);
      await saveForgerState("WAITING", "Entry Locator emitted this setup; Entry Forger remains inactive because Locator has precedence.", { riskReward: approvedLevels.riskReward });
    } catch (error) {
      console.warn(`[Scanner] ${asset} ${timeframe} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  const newlyTracked = await trackOpenSignals(userId, seriesCache, createdSignalIds);
  const retriedOutcomes = await retryFailedOutcomeDeliveries(userId);
  if (retriedOutcomes) console.info(`[Tracker] Retried ${retriedOutcomes} previously failed outcome notification(s).`);
  const adjustments = await monitorOpenSignalContradictions(userId, decisions, seriesCache);
  return { created: created.length, tracked: newlyTracked + retriedOutcomes, adjustments, marketData: "available" };
}

async function monitorOpenSignalContradictions(userId: number, decisions: Array<any>, seriesCache: Map<string, MarketSeries>) {
  const db = await getDb();
  if (!db) return 0;
  const openSignals = await listOpenCurrentV5Signals(userId);
  let sent = 0;
  for (const signal of openSignals) {
    try {
      const decision = decisions.find((candidate) => candidate.asset === signal.asset && candidate.timeframe === signal.timeframe);
      const market = decision?.market ?? seriesCache.get(`${signal.asset}:${signal.timeframe}`);
      if (!decision?.direction || !market?.close) continue;
      const contradiction = detectPaperTradeContradiction(signal, Number(market.close), decision);
      if (!contradiction) continue;
      const signalDelivery = await getTelegramDeliveryForSignal(userId, signal.id, "SIGNAL");
      if (signalDelivery?.status !== "DELIVERED" || !signalDelivery.telegramMessageId) continue;
      const selectedRiskReward = Number(decision.decisionTrace?.levelDerivation?.selectedRiskReward);
      const replacementReady = isEligibleContradictoryReplacement(decision);
      const dedupeKey = `adjustment:${signal.id}:${contradiction.fingerprint}:${replacementReady ? "REPLACEMENT" : "WARNING"}`;
      if (await hasTelegramDelivery(dedupeKey)) continue;
      let replacementSignalId: number | null = null;
      let message: string;
      let action: "REVIEW_DIRECTION" | "TIGHTEN_STOP" | "EXIT_PAPER_SETUP" | "UPGRADE_PAPER_SETUP" = contradiction.action;
      let reason = contradiction.reason;
      if (replacementReady) {
        const [replacementResult] = await db.insert(generatedSignals).values({ userId, asset: signal.asset, timeframe: signal.timeframe, direction: contradiction.observedDirection, entry: String(decision.entry), stopLoss: String(decision.stopLoss), takeProfit: String(decision.takeProfit), riskReward: selectedRiskReward.toFixed(2), confidence: String(decision.confidence), confluenceScore: String(decision.confluenceScore), rationale: formatAuditResult(decision, market), intelligenceVersion: "forex-trading-combined-document-v5", generationMode: ENTRY_LOCATOR_V5_GENERATION_MODE, intelligenceComponents: JSON.stringify(decision.decisionTrace?.supportingComponents ?? decision.ruleEvidence ?? []), marketRegime: decision.marketRegime ?? market.replacementMarketRegime ?? null, status: "PENDING" });
        replacementSignalId = Number(replacementResult.insertId);
        action = "UPGRADE_PAPER_SETUP";
        reason = `A contradictory ${contradiction.observedDirection} setup passed the Entry Locator with exact 1:${selectedRiskReward} geometry. The original ${signal.direction} paper setup is preserved for audit history and superseded by replacement signal #${replacementSignalId}.`;
        await supersedeGeneratedSignal(signal.id, replacementSignalId, reason);
        await mirrorToSupabase("generated_signals", { user_id: userId, signal_id: replacementSignalId, asset: signal.asset, timeframe: signal.timeframe, direction: contradiction.observedDirection, entry: decision.entry, stopLoss: decision.stopLoss, takeProfit: decision.takeProfit, riskReward: selectedRiskReward, confidence: decision.confidence, confluence_score: decision.confluenceScore, status: "PENDING", rationale: formatAuditResult(decision, market) });
        message = formatApprovedTelegramMessage({ asset: signal.asset, timeframe: signal.timeframe, direction: contradiction.observedDirection, entry: decision.entry, stopLoss: decision.stopLoss, takeProfit: decision.takeProfit, confidence: decision.confidence, riskReward: selectedRiskReward, adjustments: reason, ruleEvidence: decision.ruleEvidence, confluenceScore: decision.confluenceScore, decisionTrace: decision.decisionTrace, fundamentalContext: market.fundamentalContext });
      } else {
        message = formatPaperTradeContradictionWarningTelegramMessage({ signalId: signal.id, asset: signal.asset, timeframe: signal.timeframe, originalDirection: signal.direction, observedDirection: contradiction.observedDirection, currentPrice: contradiction.evidence.currentPrice, confidence: contradiction.confidence, confluenceScore: contradiction.confluenceScore, reason: `${contradiction.reason} ${decision.contradictionLocatorReason ?? decision.entryLocatorReason ?? "The replacement setup has not qualified."}` });
      }
      await createPaperTradeAdjustment({ userId, signalId: signal.id, asset: signal.asset, timeframe: signal.timeframe, originalDirection: signal.direction, observedDirection: contradiction.observedDirection, currentPrice: String(contradiction.evidence.currentPrice), confidence: String(contradiction.confidence), confluenceScore: String(contradiction.confluenceScore), action, replacementSignalId, reason, evidenceJson: JSON.stringify({ ...contradiction.evidence, replacementReady, entryLocatorReason: decision.contradictionLocatorReason ?? decision.entryLocatorReason ?? null, selectedRiskReward: replacementReady ? selectedRiskReward : null }), dedupeKey });
      const delivery = await sendTelegramMessage(message, signal.asset, { replyToMessageId: signalDelivery.telegramMessageId });
      await recordTelegramDelivery({ userId, signalId: signal.id, kind: "ADJUSTMENT", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey, error: delivery.error });
      if (delivery.delivered && replacementSignalId && delivery.telegramMessageId) await recordTelegramDelivery({ userId, signalId: replacementSignalId, kind: "SIGNAL", status: "DELIVERED", telegramMessageId: delivery.telegramMessageId, dedupeKey: buildSignalDeliveryDedupeKey(replacementSignalId) });
      if (delivery.delivered) sent += 1;
    } catch (error) {
      console.warn(`[Adjustment] ${signal.asset} ${signal.timeframe} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  return sent;
}

export function shouldTrackOpenSignal(signalId: number, excludedSignalIds: ReadonlySet<number>) {
  return !excludedSignalIds.has(signalId);
}

export function shouldUseIntrabarRange(signalOpenedAt: Date | string, candleStartedAt?: string | null) {
  if (!candleStartedAt) return false;
  const openedAt = signalOpenedAt instanceof Date ? signalOpenedAt.getTime() : new Date(signalOpenedAt).getTime();
  const candleStart = new Date(candleStartedAt.includes("T") ? candleStartedAt : `${candleStartedAt.replace(" ", "T")}Z`).getTime();
  return Number.isFinite(openedAt) && Number.isFinite(candleStart) && candleStart >= openedAt;
}

export async function trackOpenSignals(userId: number, seriesCache?: Map<string, MarketSeries>, excludedSignalIds: ReadonlySet<number> = new Set()) {
  const db = await getDb();
  if (!db) return 0;
  const openRows = await listOpenCurrentV5Signals(userId);
  const open = selectOutcomeTrackingBatch(openRows);
  let tracked = 0;
  for (const signal of open) {
    if (!shouldTrackOpenSignal(signal.id, excludedSignalIds)) continue;
    try {
      const timeframe = signal.timeframe === "1H" ? "1H" : "15MIN";
      const cached = seriesCache?.get(`${signal.asset}:${timeframe}`);
      let market: MarketSnapshot;
      if (cached) {
        market = { symbol: signal.asset, price: cached.close, close: cached.close, fetchedAt: cached.fetchedAt, values: cached.values };
      } else {
        const series = await fetchMarketSeries(signal.asset, timeframe === "1H" ? "1h" : "15min");
        market = { ...series, price: series.close };
      }
      const price = market.price;
      const stop = Number(signal.stopLoss);
      const target = Number(signal.takeProfit);
      const evidence = aggregatePostEntryEvidence(signal.direction, signal.openedAt, Number(signal.entry), getOutcomeCandles(market), price);
      const status = resolveOutcomeFromPostEntryEvidence(signal.direction, price, stop, target, Number(signal.entry), evidence, true);
      if (!status) continue;
      const resolutionCandleAt = evidence.latestCandleAt ? new Date(evidence.latestCandleAt.includes("T") ? evidence.latestCandleAt : `${evidence.latestCandleAt.replace(" ", "T")}Z`) : null;
      const note = `Closed from live ${signal.asset} ${signal.timeframe} price ${price}; evidence candle ${resolutionCandleAt?.toISOString() ?? "unavailable"}; cumulative post-entry range ${evidence.usedIntrabar ? "used" : "not used"}.`;
      await db.update(generatedSignals).set({ status, closedAt: new Date(), outcomeNote: note, resolutionCandleAt, resolutionPrice: String(price), resolutionHigh: Number.isFinite(evidence.high) ? String(evidence.high) : null, resolutionLow: Number.isFinite(evidence.low) ? String(evidence.low) : null, resolutionUsedIntrabar: evidence.usedIntrabar }).where(eq(generatedSignals.id, signal.id));
      await mirrorToSupabase("trade_outcomes", { signal_id: signal.id, user_id: userId, status, close_price: price, note });
      const activeVersion = await getActiveIntelligenceVersion(userId);
      const sourceComponents = (() => { try { return JSON.parse(signal.intelligenceComponents ?? "[]") as string[]; } catch { return []; } })();
      const patternKey = `${signal.asset}|${signal.timeframe}|${signal.marketRegime ?? "UNKNOWN"}|${signal.direction}`;
      let lesson: Record<string, unknown> = {
        outcome: status,
        patternKey,
        asset: signal.asset,
        timeframe: signal.timeframe,
        marketRegime: signal.marketRegime ?? "UNKNOWN",
        direction: signal.direction,
        sourceComponents,
        observation: note,
        reinforcement: status === "WIN" ? "Reinforce the compiled components that supported this direction after forward validation." : "Do not promote this failure into active intelligence without repeated evidence.",
        adaptiveAdjustment: status === "WIN" ? { buyDelta: signal.direction === "BUY" ? 0.5 : 0, sellDelta: signal.direction === "SELL" ? 0.5 : 0 } : { buyDelta: signal.direction === "BUY" ? 0 : 1.5, sellDelta: signal.direction === "SELL" ? 0 : 1.5 },
      };
      if (status === "LOSS") {
        try {
          const forensics = normalizeForensicFinding(await forensicAnalysis({ asset: signal.asset, direction: signal.direction, entry: String(signal.entry), stopLoss: String(signal.stopLoss), takeProfit: String(signal.takeProfit) }, market, await getAllRulesText(userId)));
          lesson = { ...lesson, rootCause: forensics.rootCause, lesson: forensics.lesson, guardrail: forensics.guardrail, forensicStatus: "AVAILABLE" };
          await db.update(generatedSignals).set({ outcomeNote: `${note} Proposed lesson: ${forensics.rootCause}` }).where(eq(generatedSignals.id, signal.id));
        } catch (forensicError) {
          lesson = { ...lesson, forensicStatus: "UNAVAILABLE", rootCause: "Forensic analysis unavailable; use only the structured signal pattern and outcome until reviewed.", guardrail: "Do not apply this lesson automatically.", error: forensicError instanceof Error ? forensicError.message : String(forensicError) };
        }
      }
      await createStrategyLesson({ userId, signalId: signal.id, sourceVersionId: activeVersion?.id ?? null, outcome: status, status: "PROPOSED", observation: note, lessonJson: JSON.stringify(lesson) });
      const signalDelivery = await getTelegramDeliveryForSignal(userId, signal.id, "SIGNAL");
      const delivery = await sendTelegramMessage(formatOutcomeTelegramMessage({ asset: signal.asset, timeframe: signal.timeframe, direction: signal.direction, status, entry: signal.entry, stopLoss: signal.stopLoss, takeProfit: signal.takeProfit, closePrice: price, signalId: signal.id, note, generationSource: signal.generationMode === ENTRY_FORGER_V5_GENERATION_MODE ? "ENTRY_FORGER" : "ENTRY_LOCATOR" }), signal.asset, { replyToMessageId: signalDelivery?.status === "DELIVERED" ? signalDelivery.telegramMessageId ?? undefined : undefined });
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
  if (!db) return { users: 0, created: 0, tracked: 0, adjustments: 0, marketData: "not-run" as const, marketDataError: null };
  const allUsers = await db.select({ id: users.id }).from(users);
  let created = 0;
  let tracked = 0;
  let adjustments = 0;
  let marketData: ScanMarketDataStatus = allUsers.length ? "available" : "not-run";
  let marketDataError: string | null = null;
  let sharedMarketData: SharedMarketData | undefined;
  let sharedMarketDataError: string | null = null;
  if (allUsers.length) {
    try {
      sharedMarketData = await fetchSharedMarketData();
    } catch (error) {
      sharedMarketDataError = error instanceof Error ? error.message : String(error);
      marketData = "unavailable";
      marketDataError = `Twelve Data market-data window failed for 15min and/or 1h: ${sharedMarketDataError}`;
    }
  }
  for (const user of allUsers) {
    const result = await scanUser(user.id, sharedMarketData ? { marketData: sharedMarketData } : { marketDataError: sharedMarketDataError });
    created += result.created;
    tracked += result.tracked;
    adjustments += result.adjustments;
    if (result.marketData === "unavailable") {
      marketData = "unavailable";
      if (!marketDataError && result.marketDataError) marketDataError = result.marketDataError;
    } else if (result.marketData === "not-run" && marketData === "available") marketData = "not-run";
  }
  return { users: allUsers.length, created, tracked, adjustments, marketData, marketDataError };
}
