import { and, eq } from "drizzle-orm";
import { generatedSignals, users } from "../drizzle/schema";
import { activateIntelligenceVersion, createIntelligenceComponent, createIntelligenceVersion, createPaperTradeAdjustment, createStrategyDecision, createStrategyLesson, ENTRY_LOCATOR_V4_GENERATION_MODE, getActiveIntelligenceVersion, getAllRulesText, getDb, getEntryLocatorState, getRelevantRulesText, getTelegramDeliveryForSignal, hasOpenGeneratedSignal, hasTelegramDelivery, listAcceptedStrategyLessons, listIntelligenceComponents, listOpenCurrentV4Signals, listStrategyRules, recordStrategyEngineHealth, recordTelegramDelivery, saveEntryLocatorState, supersedeGeneratedSignal, updateStrategyEngineStatus } from "./db";
import { buildMultiTimeframeContext } from "./market-context";
import { fetchOfficialMacroContext } from "./official-macro";
import { buildIntelligenceModel, compileExecutableComponents, evaluateExecutableIntelligence, type ExecutableComponent } from "./intelligence";
import { buildReplacementKnowledgeModelV3, buildReplacementKnowledgeModelV4, detectSetupIndicators, evaluateReplacementIntelligence } from "./replacement-intelligence";
import { advanceEntryLocator, countStrongSetupIndicators, markEntryLocatorEmitted, type EntryLocatorObservation } from "./entry-locator";
import { detectPaperTradeContradiction } from "./paper-trade-adjustments";
import { buildUpgradePaperAdjustmentReason, buildUpgradeTelegramDedupeKey, compareStrongerSameDirectionSetup } from "./paper-trade-upgrades";
import { fetchMarketSeriesBatch, fetchMarketSnapshot, fetchStrategyRulesFromSupabase, forensicAnalysis, formatApprovedTelegramMessage, formatOutcomeTelegramMessage, formatPaperTradeAdjustmentTelegramMessage, formatPaperTradeUpgradeTelegramMessage, formatAuditResult, generateScannerDecisions, mirrorToSupabase, sendTelegramMessage, type MarketSeries } from "./integrations";

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

export function buildSetupIdentity(asset: string, timeframe: string, direction: "BUY" | "SELL", marketRegime: string | null | undefined, breakoutState: string | null | undefined) {
  return `${asset}:${timeframe}:${direction}:${marketRegime ?? "UNKNOWN"}:${breakoutState ?? "UNKNOWN"}`;
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

type ScanUserResult = { created: number; tracked: number; adjustments: number; marketData: ScanMarketDataStatus };

async function ensureReplacementIntelligenceVersion(userId: number) {
  const active = await getActiveIntelligenceVersion(userId);
  if (active?.versionLabel?.startsWith("forex-trading-combined-document-v4")) return active;
  const model = buildReplacementKnowledgeModelV4();
  const version = await createIntelligenceVersion({ userId, versionLabel: model.id, status: "ACTIVE", sourceRuleCount: 0, componentCount: model.nodes.length, lessonCount: 0, algorithmJson: JSON.stringify(model), validationJson: JSON.stringify({ status: "UNVALIDATED", reason: "Replacement intelligence v4 is active for paper signals by user instruction; forward validation remains ongoing." }), activatedAt: new Date() });
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
  if (!db) return { created: 0, tracked: 0, adjustments: 0, marketData: "not-run" };

  let series15m: Map<string, MarketSeries>;
  let series1h: Map<string, MarketSeries>;
  try {
    [series15m, series1h] = await Promise.all([
      fetchMarketSeriesBatch(WATCHLIST, "15min"),
      fetchMarketSeriesBatch(WATCHLIST, "1h"),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateStrategyEngineStatus(userId, { status: "UNAVAILABLE", error: message });
    await recordStrategyEngineHealth(userId, { snapshots: 0, completeResponses: 0, retries: 1, unavailableCycle: true });
    console.warn("[Scanner] Market batch unavailable; no signals created:", message);
    return { created: 0, tracked: 0, adjustments: 0, marketData: "unavailable" };
  }
  const seriesCache = new Map<string, MarketSeries>();
  series15m.forEach((series, symbol) => seriesCache.set(`${symbol}:15MIN`, series));
  series1h.forEach((series, symbol) => seriesCache.set(`${symbol}:1H`, series));
  const created: Array<{ id: number; asset: string; timeframe: string; direction: string; entry: number; stopLoss: number; takeProfit: number; riskReward: number; confidence: number }> = [];
  const mirroredRules = await fetchStrategyRulesFromSupabase();
  const mirroredText = mirroredRules.map((rule) => `## ${rule.title ?? "Saved strategy rule"}\n${rule.content ?? ""}`).join("\n\n").slice(0, 6_000);
  await ensureReplacementIntelligenceVersion(userId);
  const replacementModel = buildReplacementKnowledgeModelV4();
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
        const detectedIndicators = market.marketContext ? detectSetupIndicators({ market: { asset, close: series.close, interval: series.interval }, context: market.marketContext, fundamentalContext }, replacementModel) : [];
        const hasDirectionalIndicator = detectedIndicators.some((indicator) => indicator.direction !== "NEUTRAL");
        if (!market.marketContext || !hasDirectionalIndicator) {
          return { asset, timeframe, noDirectionalSetup: true, verdict: "SKIPPED" as const, confidence: 0, confluenceScore: 0, marketRegime: "WAITING/ACCUMULATING", adjustments: "No directional setup indicator detected; accumulating fresh scanner snapshots before constructing a v4 candidate.", direction: "NEUTRAL" as const, entry: null, stopLoss: null, takeProfit: null, ruleEvidence: [], ruleFindings: [], decisionTrace: undefined, setupIndicators: detectedIndicators, market: { ...market, fundamentalContext, setupIndicators: detectedIndicators, replacementIntelligence: undefined, v3BaselineIntelligence: undefined, replacementMarketRegime: "WAITING/ACCUMULATING" } };
        }
        const replacementIntelligence = evaluateReplacementIntelligence({ asset, close: series.close, interval: series.interval, marketContext: market.marketContext, fundamentalContext, acceptedLessons }, replacementModel);
        const v3BaselineIntelligence = market.marketContext ? evaluateReplacementIntelligence({ asset, close: series.close, interval: series.interval, marketContext: market.marketContext, fundamentalContext, acceptedLessons }, replacementBaselineModel) : undefined;
        if (!replacementIntelligence || !v3BaselineIntelligence) throw new Error(`Replacement intelligence could not evaluate ${asset} ${timeframe}.`);
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
          market: { ...market, fundamentalContext, intelligenceSeed: replacementIntelligence, replacementIntelligence, v3BaselineIntelligence, replacementMarketRegime: replacementIntelligence.marketRegime },
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
    return { created: 0, tracked: await trackOpenSignals(userId, seriesCache), adjustments: 0, marketData: "available" };
  }
  const activeCurrentSignals = await listOpenCurrentV4Signals(userId);
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
      conflictingComponents: gated.decisionTrace?.conflictingComponents ?? [],
    };
    const hasOpenSignal = await hasOpenGeneratedSignal(userId, asset, timeframe, replacementModel.id, ENTRY_LOCATOR_V4_GENERATION_MODE);
    const storedLocator = await getEntryLocatorState(userId, asset, timeframe);
    let previousLocator: Record<string, unknown> | null = null;
    try { previousLocator = storedLocator?.stateJson ? JSON.parse(storedLocator.stateJson) : null; } catch { previousLocator = null; }
    const locatorResult = advanceEntryLocator({ previous: previousLocator, observation, hasOpenSignal });
    const activeSignal = activeCurrentSignals.find((signal) => signal.asset === asset && signal.timeframe === timeframe);
    const upgradeLocatorResult = activeSignal
      ? advanceEntryLocator({ previous: previousLocator ? { ...previousLocator, status: "WAITING" } : null, observation, hasOpenSignal: false })
      : null;
    const locatorState = locatorResult.ready ? markEntryLocatorEmitted(locatorResult.state, observation.fingerprint) : locatorResult.state;
    await saveEntryLocatorState({ userId, asset, timeframe, status: locatorState.status, snapshotCount: locatorState.snapshotCount, lastSnapshotAt: locatorState.lastSnapshotAt ? new Date(locatorState.lastSnapshotAt) : null,       lastDirection: observation.direction === "NEUTRAL" ? null : observation.direction, lastConfidence: String(observation.confidence), lastConfluence: String(observation.confluence), evidenceJson: JSON.stringify({ supporting: observation.supportingComponents, conflicting: observation.conflictingComponents }), conflictJson: JSON.stringify(observation.conflictingComponents), stateJson: JSON.stringify(locatorState), lastEmittedAt: locatorResult.ready ? new Date() : storedLocator?.lastEmittedAt ?? null });
    const strongIndicatorCount = countStrongSetupIndicators(observation.supportingComponents);
    const indicatorBucket = strongIndicatorCount === 1 ? "ONE_STRONG" : strongIndicatorCount >= 2 ? "TWO_PLUS" : "NONE";
    const locatorMarket = { ...market, entryLocator: { status: locatorState.status, ready: locatorResult.ready, reason: locatorResult.reason, snapshotCount: locatorState.snapshotCount, fingerprint: observation.fingerprint, strongIndicatorCount, indicatorBucket } };
    const decisionVerdict = locatorResult.ready ? gated.verdict : "SKIPPED" as const;
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
      generatedDirection: locatorResult.ready ? gated.direction : null,
      generatedEntry: locatorResult.ready && gated.entry != null ? String(gated.entry) : null,
      generatedStopLoss: locatorResult.ready && gated.stopLoss != null ? String(gated.stopLoss) : null,
      generatedTakeProfit: locatorResult.ready && gated.takeProfit != null ? String(gated.takeProfit) : null,
      decisionReason: `${gated.adjustments} Entry locator: ${locatorResult.reason}`,
      cooldownKey,
    });
    try {
      if (!locatorResult.ready) {
        console.info(`[Scanner] ${asset} ${timeframe} entry locator waiting: ${locatorResult.reason}`);
        continue;
      }
      if (!shouldNotifyScannerSignal(gated.verdict)) {
        console.info(`[Scanner] ${asset} ${timeframe} candidate rejected by strategy gate: ${gated.adjustments}`);
        continue;
      }
      if (!gated.direction || gated.entry == null || gated.stopLoss == null || gated.takeProfit == null) {
        console.info(`[Scanner] ${asset} ${timeframe} strategy engine returned an incomplete approved outcome; no signal sent.`);
        continue;
      }
      const selectedRiskReward = Number(gated.decisionTrace?.levelDerivation?.selectedRiskReward ?? gated.riskReward ?? 2);
      if (![1, 1.5, 2, 3].includes(selectedRiskReward)) {
        console.info(`[Scanner] ${asset} ${timeframe} has no allowed adaptive ratio; no signal sent.`);
        continue;
      }
      const approvedLevels = { asset, timeframe, direction: gated.direction, entry: gated.entry, stopLoss: gated.stopLoss, takeProfit: gated.takeProfit, riskReward: selectedRiskReward, confidence: gated.confidence };
      if (hasOpenSignal) {
        const upgrade = activeSignal && upgradeLocatorResult?.ready && gated.direction === activeSignal.direction
          ? compareStrongerSameDirectionSetup(activeSignal, { direction: gated.direction, confidence: gated.confidence, confluenceScore: gated.confluenceScore, entry: gated.entry, stopLoss: gated.stopLoss, takeProfit: gated.takeProfit, riskReward: approvedLevels.riskReward, marketRegime: gated.marketRegime, ruleEvidence: gated.ruleEvidence, decisionTrace: gated.decisionTrace })
          : null;
        if (!upgrade || !activeSignal) {
          console.info(`[Scanner] ${asset} ${timeframe} already has an active paper setup; current candidate evaluated immediately but duplicate suppressed.`);
          continue;
        }
        const upgradeDedupeKey = buildUpgradeTelegramDedupeKey(activeSignal.id, upgrade.fingerprint);
        if (await hasTelegramDelivery(upgradeDedupeKey)) {
          console.info(`[Scanner] ${asset} ${timeframe} stronger setup upgrade already delivered; duplicate suppressed.`);
          continue;
        }
        const [replacementResult] = await db.insert(generatedSignals).values({ userId, asset, timeframe, direction: approvedLevels.direction as "BUY" | "SELL", entry: String(approvedLevels.entry), stopLoss: String(approvedLevels.stopLoss), takeProfit: String(approvedLevels.takeProfit), riskReward: approvedLevels.riskReward.toFixed(2), confidence: String(approvedLevels.confidence), confluenceScore: String(gated.confluenceScore ?? 0), rationale: formatAuditResult(gated, market), intelligenceVersion: replacementModel.id, generationMode: ENTRY_LOCATOR_V4_GENERATION_MODE, intelligenceComponents: JSON.stringify(gated.decisionTrace?.supportingComponents ?? gated.ruleEvidence ?? []), marketRegime: gated.marketRegime ?? market.replacementMarketRegime ?? null, status: "PENDING" });
        const replacementSignalId = Number(replacementResult.insertId);
        const upgradeReason = buildUpgradePaperAdjustmentReason(upgrade);
        await supersedeGeneratedSignal(activeSignal.id, replacementSignalId, upgradeReason);
        await createPaperTradeAdjustment({ userId, signalId: activeSignal.id, replacementSignalId, asset, timeframe, originalDirection: activeSignal.direction as "BUY" | "SELL", observedDirection: gated.direction as "BUY" | "SELL", currentPrice: String(market.close), confidence: String(gated.confidence), confluenceScore: String(gated.confluenceScore ?? 0), action: "UPGRADE_PAPER_SETUP", reason: upgradeReason, evidenceJson: JSON.stringify(upgrade.evidence), dedupeKey: upgradeDedupeKey });
        const originalDelivery = await getTelegramDeliveryForSignal(userId, activeSignal.id, "SIGNAL");
        const delivery = await sendTelegramMessage(formatPaperTradeUpgradeTelegramMessage({ signalId: activeSignal.id, replacementSignalId, asset, timeframe, direction: gated.direction, entry: approvedLevels.entry, stopLoss: approvedLevels.stopLoss, takeProfit: approvedLevels.takeProfit, confidence: gated.confidence, riskReward: approvedLevels.riskReward, confluenceScore: gated.confluenceScore, reason: upgradeReason, improvements: upgrade.evidence.improvements }), asset, { replyToMessageId: originalDelivery?.status === "DELIVERED" ? originalDelivery.telegramMessageId ?? undefined : undefined });
        await recordTelegramDelivery({ userId, signalId: activeSignal.id, kind: "ADJUSTMENT", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey: upgradeDedupeKey, error: delivery.error });
        await mirrorToSupabase("generated_signals", { user_id: userId, ...approvedLevels, signal_id: replacementSignalId, status: "PENDING", rationale: formatAuditResult(gated, market), confluence_score: gated.confluenceScore ?? 0 });
        created.push({ id: replacementSignalId, ...approvedLevels });
        console.info(`[Scanner] ${asset} ${timeframe} emitted a stronger setup upgrade linked to signal #${activeSignal.id}.`);
        continue;
      }
      const rationale = formatAuditResult(gated, market);
      const [result] = await db.insert(generatedSignals).values({ userId, asset, timeframe, direction: approvedLevels.direction as "BUY" | "SELL", entry: String(approvedLevels.entry), stopLoss: String(approvedLevels.stopLoss), takeProfit: String(approvedLevels.takeProfit), riskReward: approvedLevels.riskReward.toFixed(2), confidence: String(approvedLevels.confidence), confluenceScore: String(gated.confluenceScore ?? 0), rationale, intelligenceVersion: replacementModel.id, generationMode: ENTRY_LOCATOR_V4_GENERATION_MODE, intelligenceComponents: JSON.stringify(gated.decisionTrace?.supportingComponents ?? gated.ruleEvidence ?? []), marketRegime: gated.marketRegime ?? market.replacementMarketRegime ?? null, status: "PENDING" });
      const signal = { id: Number(result.insertId), ...approvedLevels };
      await mirrorToSupabase("generated_signals", { user_id: userId, ...signal, status: "PENDING", rationale, rule_evidence: gated.ruleEvidence ?? [], confluence_score: gated.confluenceScore ?? 0 });
      const delivery = await sendTelegramMessage(formatApprovedTelegramMessage({ asset, timeframe, direction: approvedLevels.direction, entry: approvedLevels.entry, stopLoss: approvedLevels.stopLoss, takeProfit: approvedLevels.takeProfit, confidence: approvedLevels.confidence, riskReward: approvedLevels.riskReward, adjustments: gated.adjustments, ruleEvidence: gated.ruleEvidence, confluenceScore: gated.confluenceScore, decisionTrace: gated.decisionTrace, fundamentalContext: market.fundamentalContext }), asset);
      await recordTelegramDelivery({ userId, signalId: signal.id, kind: "SIGNAL", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey: `signal:${signal.id}`, error: delivery.error });
      created.push(signal);
    } catch (error) {
      console.warn(`[Scanner] ${asset} ${timeframe} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  const tracked = await trackOpenSignals(userId, seriesCache);
  const adjustments = await monitorOpenSignalContradictions(userId, decisions, seriesCache);
  return { created: created.length, tracked, adjustments, marketData: "available" };
}

async function monitorOpenSignalContradictions(userId: number, decisions: Array<any>, seriesCache: Map<string, MarketSeries>) {
  const openSignals = await listOpenCurrentV4Signals(userId);
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
      const dedupeKey = `adjustment:${signal.id}:${contradiction.fingerprint}`;
      if (await hasTelegramDelivery(dedupeKey)) continue;
      await createPaperTradeAdjustment({ userId, signalId: signal.id, asset: signal.asset, timeframe: signal.timeframe, originalDirection: signal.direction, observedDirection: contradiction.observedDirection, currentPrice: String(contradiction.evidence.currentPrice), confidence: String(contradiction.confidence), confluenceScore: String(contradiction.confluenceScore), action: contradiction.action, reason: contradiction.reason, evidenceJson: JSON.stringify(contradiction.evidence), dedupeKey });
      const delivery = await sendTelegramMessage(formatPaperTradeAdjustmentTelegramMessage({ signalId: signal.id, asset: signal.asset, timeframe: signal.timeframe, originalDirection: signal.direction, observedDirection: contradiction.observedDirection, currentPrice: contradiction.evidence.currentPrice, confidence: contradiction.confidence, confluenceScore: contradiction.confluenceScore, action: contradiction.action, reason: contradiction.reason, evidence: contradiction.evidence }), signal.asset, { replyToMessageId: signalDelivery.telegramMessageId });
      await recordTelegramDelivery({ userId, signalId: signal.id, kind: "ADJUSTMENT", status: delivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: delivery.telegramMessageId, dedupeKey, error: delivery.error });
      if (delivery.delivered) sent += 1;
    } catch (error) {
      console.warn(`[Adjustment] ${signal.asset} ${signal.timeframe} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  return sent;
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
          const forensics = await forensicAnalysis({ asset: signal.asset, direction: signal.direction, entry: String(signal.entry), stopLoss: String(signal.stopLoss), takeProfit: String(signal.takeProfit) }, market, await getAllRulesText(userId));
          lesson = { ...lesson, rootCause: forensics.rootCause, lesson: forensics.lesson, guardrail: forensics.guardrail, forensicStatus: "AVAILABLE" };
          await db.update(generatedSignals).set({ outcomeNote: `${note} Proposed lesson: ${forensics.rootCause}` }).where(eq(generatedSignals.id, signal.id));
        } catch (forensicError) {
          lesson = { ...lesson, forensicStatus: "UNAVAILABLE", rootCause: "Forensic analysis unavailable; use only the structured signal pattern and outcome until reviewed.", guardrail: "Do not apply this lesson automatically.", error: forensicError instanceof Error ? forensicError.message : String(forensicError) };
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
  if (!db) return { users: 0, created: 0, tracked: 0, adjustments: 0, marketData: "not-run" as const };
  const allUsers = await db.select({ id: users.id }).from(users);
  let created = 0;
  let tracked = 0;
  let adjustments = 0;
  let marketData: ScanMarketDataStatus = allUsers.length ? "available" : "not-run";
  for (const user of allUsers) {
    const result = await scanUser(user.id);
    created += result.created;
    tracked += result.tracked;
    adjustments += result.adjustments;
    if (result.marketData === "unavailable") marketData = "unavailable";
    else if (result.marketData === "not-run" && marketData === "available") marketData = "not-run";
  }
  return { users: allUsers.length, created, tracked, adjustments, marketData };
}
