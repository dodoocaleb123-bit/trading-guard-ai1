import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { parse as parseCookie } from "cookie";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { appSettings, auditMessages, auditTrades, generatedSignals } from "../drizzle/schema";
import { activateIntelligenceVersion, createIntelligenceComponent, createIntelligenceVersion, createStrategyRule, getActiveIntelligenceVersion, getDb, getRelevantRulesText, getSettings, getSignalDeliverySummary, listRecentScannerRuns, getScannerCadenceDiagnostics, getStrategyDecisionSummary, getStrategyEngineHealth, getReplacementOutcomeStats, getLocatorV4OutcomeStats, getAdaptiveRatioStats, getWinningRateStats, listExcludedWinningRateSignals, getBestTimeToTradeStats, getBestDaysToTradeStats, getV4MonitoringStats, listEntryLocatorStates, listAcceptedStrategyLessons, listPaperTradeAdjustments, listPaperTradeUpgradeChains, getPaperTradeUpgradeSummary, listAuditMessages, listAuditTrades, listCooldownChanges, listGeneratedSignals, listGeneratedSignalsSince, listIntelligenceComponents, listIntelligenceVersions, listStrategyDecisions, listStrategyLessons, listStrategyRules, markOnboardingComplete, recordCooldownChange, updateSetupCooldown, updateStrategyLessonStatus, updateStrategyLessonPatternStatus } from "./db";
import { serializeDecisionLedgerCsv, serializeDecisionLedgerJson } from "./decision-ledger";
import { extractStrategyText, fetchMarketSeries, fetchStrategyRulesFromSupabase, formatAuditResult, mirrorToSupabase, normalizeAsset, type MarketSnapshot } from "./integrations";
import { buildIntelligenceModel, buildLessonPromotionPlan, compileExecutableComponents, resolveLessonPatternReview } from "./intelligence";
import { buildReplacementKnowledgeModelV4, evaluateReplacementIntelligence, type ReplacementDecision } from "./replacement-intelligence";
import { invokeLLM } from "./_core/llm";
import { fetchOfficialMacroContext } from "./official-macro";
import { storagePut } from "./storage";
import { createHeartbeatJob, listHeartbeatJobs } from "./_core/heartbeat";
import { buildCallbackStatus, selectScannerSchedulerJob } from "./scheduler-status";
import { getSessionCookieOptions } from "./_core/cookies";

const CHAT_ASSETS = [{ symbol: "EUR/USD", label: "Euro / US dollar" }, { symbol: "XAU/USD", label: "Gold / US dollar" }, { symbol: "GBP/USD", label: "Pound / US dollar" }, { symbol: "BTC/USD", label: "Bitcoin / US dollar" }] as const;

export function summarizeChatSignals(signals: Array<{ asset: string; status: string }>) {
  return Array.from(new Set(signals.map((signal) => signal.asset))).map((asset) => {
    const rows = signals.filter((signal) => signal.asset === asset);
    const resolved = rows.filter((signal) => signal.status === "WIN" || signal.status === "LOSS");
    const wins = rows.filter((signal) => signal.status === "WIN").length;
    return { asset, generated: rows.length, resolved: resolved.length, wins, losses: rows.filter((signal) => signal.status === "LOSS").length, winRate: resolved.length ? Math.round((wins / resolved.length) * 100) : null };
  });
}

export function normalizeChatResponseContent(content: unknown): string {
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const text: string = content.map((part) => normalizeChatResponseContent(part)).filter(Boolean).join("\n").trim();
    if (text) return text;
  }
  if (content && typeof content === "object") {
    const candidate = content as { text?: unknown; content?: unknown };
    const text: string = normalizeChatResponseContent(candidate.text ?? candidate.content);
    if (text) return text;
  }
  return "The assistant returned no readable text for this question. Please try again; no trade decision was created.";
}
import { systemRouter } from "./_core/systemRouter";

export function buildStrategyRuleRecord(input: { userId: number; title: string; sourceType: "pdf" | "docx" | "text"; fileName: string; content: string; storageKey: string; supabaseId: string | null }) {
  return { userId: input.userId, title: input.title, sourceType: input.sourceType, sourceFileName: input.fileName, content: input.content, storageKey: input.storageKey, supabaseId: input.supabaseId };
}

export function buildReplacementManualAuditResult(signal: string, asset: string, timeframe: "15MIN" | "1H", market: MarketSnapshot, decision: ReplacementDecision) {
  const submittedDirection = signal.match(/\b(BUY|SELL)\b/i)?.[1]?.toUpperCase() as "BUY" | "SELL" | undefined;
  const directionMatches = !submittedDirection || submittedDirection === decision.direction;
  const directionReason = submittedDirection
    ? directionMatches
      ? `Submitted ${submittedDirection} direction matches Replacement Intelligence v4.`
      : `Submitted ${submittedDirection} direction conflicts with Replacement Intelligence v4 ${decision.direction} judgment.`
    : `No explicit direction was detected in the submitted signal; the audit uses the intelligence direction ${decision.direction}.`;
  const trace = `Score: BUY ${decision.score.buy} vs SELL ${decision.score.sell}; confluence ${decision.confluenceScore}%; market regime ${decision.marketRegime}. ${decision.conflicts.length ? `Conflicting components: ${decision.conflicts.join("; ")}.` : "No conflicting components were matched."}`;
  const adjustments = `${directionReason} ${decision.explanation} ${trace} Additive source-linked replacement v4 is authoritative for this paper audit; it retains the complete v2 foundation and uses verified macro/fundamental evidence when available. Validation remains UNVALIDATED.`;
  return {
    verdict: directionMatches ? "APPROVED" as const : "DENIED" as const,
    confidence: decision.confidence,
    adjustments,
    asset,
    timeframe,
    direction: decision.direction,
    entry: decision.entry,
    stopLoss: decision.stopLoss,
    takeProfit: decision.takeProfit,
    ruleEvidence: decision.ruleEvidence,
    ruleFindings: decision.ruleFindings,
    confluenceScore: decision.confluenceScore,
    validationStatus: "UNVALIDATED" as const,
    market,
  };
}

export function buildStrategyContext(localRules: string, supabaseRules: Array<{ title?: string; content?: string }>) {
  const mirrored = supabaseRules.filter((rule) => rule.content).map((rule) => `## ${rule.title ?? "Saved strategy rule"}\n${rule.content}`).join("\n\n");
  return [localRules, mirrored].filter(Boolean).join("\n\n");
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  settings: router({
    get: protectedProcedure.query(({ ctx }) => getSettings(ctx.user.id)),
  }),
  intelligence: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const active = await getActiveIntelligenceVersion(ctx.user.id);
      const versions = await listIntelligenceVersions(ctx.user.id);
      const components = active ? await listIntelligenceComponents(ctx.user.id, active.id) : [];
      const lessons = await listStrategyLessons(ctx.user.id);
      const promotionPlan = buildLessonPromotionPlan(lessons);
      return { active, versions, components, lessons, promotionPlan, acceptedLessonCount: lessons.filter((lesson) => lesson.status === "ACCEPTED").length };
    }),
    replacementPreview: protectedProcedure.query(async ({ ctx }) => {
      const model = buildReplacementKnowledgeModelV4();
      const active = await getActiveIntelligenceVersion(ctx.user.id);
      return { id: model.id, sourceDocument: model.sourceDocument, nodeCount: model.nodes.length, nodes: model.nodes, decisionPolicy: model.decisionPolicy, learningPolicy: model.learningPolicy, active: active?.versionLabel?.startsWith(model.id) ?? false, activeVersionId: active?.id ?? null };
    }),
    replacementOutcomeStats: protectedProcedure.query(({ ctx }) => getReplacementOutcomeStats(ctx.user.id)),
    locatorV4OutcomeStats: protectedProcedure.query(({ ctx }) => getLocatorV4OutcomeStats(ctx.user.id)),
    adaptiveRatioStats: protectedProcedure.input(z.object({ asset: z.string().optional(), timeframe: z.enum(["15MIN", "1H"]).optional() }).optional()).query(({ ctx, input }) => getAdaptiveRatioStats(ctx.user.id, input ?? {})),
    v4Monitoring: protectedProcedure.query(({ ctx }) => getV4MonitoringStats(ctx.user.id)),
    entryLocator: protectedProcedure.query(({ ctx }) => listEntryLocatorStates(ctx.user.id)),
    winningRateStats: protectedProcedure.query(({ ctx }) => getWinningRateStats(ctx.user.id)),
    excludedWinningRateSignals: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional()).query(({ ctx, input }) => listExcludedWinningRateSignals(ctx.user.id, input?.limit ?? 100)),
    bestTimeToTradeStats: protectedProcedure.query(({ ctx }) => getBestTimeToTradeStats(ctx.user.id)),
    bestDaysToTradeStats: protectedProcedure.query(({ ctx }) => getBestDaysToTradeStats(ctx.user.id)),
    macroStatus: protectedProcedure.query(async () => {
      const assets = ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"] as const;
      return Promise.all(assets.map(async (asset) => ({ asset, context: await fetchOfficialMacroContext(asset) })));
    }),
    reviewLessonPattern: protectedProcedure.input(z.object({ outcome: z.enum(["WIN", "LOSS"]), patternKey: z.string().min(1), decision: z.enum(["ACCEPT", "REJECT"]) })).mutation(async ({ ctx, input }) => {
      const lessons = await listStrategyLessons(ctx.user.id);
      const plan = buildLessonPromotionPlan(lessons);
      const reviewDecision = resolveLessonPatternReview(plan, input);
      if (!reviewDecision.ok) throw new Error(reviewDecision.error);
      const status = reviewDecision.status;
      const result = await updateStrategyLessonPatternStatus(ctx.user.id, input.outcome, input.patternKey, status);
      return { ...result, outcome: input.outcome, patternKey: input.patternKey, status, explanation: input.decision === "ACCEPT" ? "Pattern accepted for paper-only v3 learning; it remains UNVALIDATED." : "Pattern rejected; its proposed lessons will not influence future v3 decisions." };
    }),
    promoteLessons: protectedProcedure.mutation(async ({ ctx }) => {
      const lessons = await listStrategyLessons(ctx.user.id);
      const plan = buildLessonPromotionPlan(lessons);
      if (plan.eligible.length === 0) return { promoted: false, ...plan };
      const model = buildReplacementKnowledgeModelV4();
      const version = await createIntelligenceVersion({ userId: ctx.user.id, versionLabel: `forex-trading-combined-document-v4-lessons-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`, status: "ACTIVE", sourceRuleCount: 0, componentCount: model.nodes.length, lessonCount: plan.eligible.length, algorithmJson: JSON.stringify({ ...model, promotedLessonIds: plan.eligible.map((lesson) => lesson.id), learning: { status: "paper-only", application: "accepted-lessons-are-applied-by-v4-with-pattern-matching" } }), validationJson: JSON.stringify({ status: "UNVALIDATED", reason: "Accepted loss-learning adjustments remain paper-validation only and can be rolled back by retiring this version." }), activatedAt: new Date() });
      const triggerFor = (family: string) => family === "STRUCTURE" ? "MARKET_STRUCTURE" : family === "LEVELS" ? "SUPPORT_RESISTANCE" : family === "PATTERN" ? "BREAKOUT" : family === "INDICATOR" ? "MOMENTUM" : family === "VOLUME" ? "VOLATILITY" : "CANDLE";
      for (const node of model.nodes) await createIntelligenceComponent({ userId: ctx.user.id, versionId: version.id, title: node.concept, sourceRuleIds: JSON.stringify([]), trigger: triggerFor(node.family) as any, stance: "NEUTRAL", conditionJson: JSON.stringify({ values: node.prerequisites, description: node.rule }), weight: "1", enabled: true });
      await activateIntelligenceVersion(ctx.user.id, version.id);
      for (const lesson of plan.eligible) await updateStrategyLessonStatus(ctx.user.id, lesson.id, "ACCEPTED", version.id);
      return { promoted: true, versionId: version.id, promotedLessonIds: plan.eligible.map((lesson) => lesson.id), explanation: plan.explanation };
    }),
    rebuild: protectedProcedure.mutation(async ({ ctx }) => {
      const rules = await listStrategyRules(ctx.user.id);
      const components = compileExecutableComponents(rules);
      const version = await createIntelligenceVersion({ userId: ctx.user.id, versionLabel: `intelligence-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`, status: "ACTIVE", sourceRuleCount: rules.length, componentCount: components.length, lessonCount: 0, algorithmJson: JSON.stringify({ ...buildIntelligenceModel(components), learning: { status: "paper-only", promotion: "validated-lessons-only" } }), validationJson: JSON.stringify({ status: "UNVALIDATED", reason: "Requires forward paper-validation evidence before claiming accuracy." }), activatedAt: new Date() });
      for (const component of components) await createIntelligenceComponent({ userId: ctx.user.id, versionId: version.id, title: component.title, sourceRuleIds: JSON.stringify(component.sourceRuleIds), trigger: component.trigger, stance: component.stance, conditionJson: JSON.stringify(component.condition), weight: String(component.weight), enabled: true });
      await activateIntelligenceVersion(ctx.user.id, version.id);
      return { versionId: version.id, sourceRuleCount: rules.length, componentCount: components.length };
    }),
  }),
  rules: router({
    list: protectedProcedure.query(({ ctx }) => listStrategyRules(ctx.user.id)),
    supabaseList: protectedProcedure.query(() => fetchStrategyRulesFromSupabase()),
    ingest: protectedProcedure
      .input(z.object({ fileName: z.string(), mimeType: z.string(), sourceType: z.enum(["pdf", "docx", "text"]), title: z.string().min(1), contentBase64: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.contentBase64, "base64");
        const content = await extractStrategyText(buffer, input.mimeType, input.fileName);
        if (!content) throw new Error("No readable strategy text was found in this file");
        const stored = await storagePut(`${ctx.user.id}/strategy-rules/${input.fileName}`, buffer, input.mimeType || "application/octet-stream");
        const supabase = await mirrorToSupabase("strategy_rules", { title: input.title, content, source_file_name: input.fileName, source_type: input.sourceType, storage_key: stored.key });
        const rule = await createStrategyRule(buildStrategyRuleRecord({ userId: ctx.user.id, title: input.title, sourceType: input.sourceType, fileName: input.fileName, content, storageKey: stored.key, supabaseId: supabase?.id ? String(supabase.id) : null }));
        await markOnboardingComplete(ctx.user.id);
        return rule;
      }),
  }),
  audit: router({
    history: protectedProcedure.query(({ ctx }) => listAuditMessages(ctx.user.id)),
    clearConversation: protectedProcedure.mutation(async ({ ctx }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.delete(auditMessages).where(eq(auditMessages.userId, ctx.user.id)); return { cleared: true }; }),
    run: protectedProcedure.input(z.object({ signal: z.string().min(8) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(auditMessages).values({ userId: ctx.user.id, role: "user", content: input.signal });
      const assetMatch = input.signal.match(/(?:asset|symbol)\s*:\s*([A-Za-z/]+)|\b(EUR\/?USD|GBP\/?USD|XAU\/?USD|BTC\/?USD)\b/i);
      const asset = normalizeAsset(assetMatch?.[1] ?? assetMatch?.[2] ?? "EUR/USD");
      const timeframeMatch = input.signal.match(/(?:timeframe|tf)\s*[:=]\s*(15\s*MIN|1\s*H|15M|1H)\b/i) ?? input.signal.match(/\b(15\s*MIN|1\s*H|15M|1H)\b/i);
      const timeframe: "15MIN" | "1H" = timeframeMatch?.[1]?.replace(/\s+/g, "").toUpperCase() === "1H" ? "1H" : "15MIN";
      try {
        const series = await fetchMarketSeries(asset, timeframe === "1H" ? "1h" : "15min");
        if (!series.marketContext) throw new Error("Latest scanner market context is unavailable");
        const fundamentalContext = await fetchOfficialMacroContext(asset);
        const market: MarketSnapshot = { symbol: series.symbol, price: series.close, close: series.close, fetchedAt: series.fetchedAt, interval: timeframe === "1H" ? "1h" : "15min", trend: series.trend, values: series.values, marketContext: series.marketContext, fundamentalContext };
        const acceptedLessons = await listAcceptedStrategyLessons(ctx.user.id);
        const decision = evaluateReplacementIntelligence({ asset, close: series.close, interval: series.interval, marketContext: series.marketContext, fundamentalContext, acceptedLessons }, buildReplacementKnowledgeModelV4());
        const result = buildReplacementManualAuditResult(input.signal, asset, timeframe, market, decision);
        const assistantText = formatAuditResult(result, market);
        await db.insert(auditMessages).values({ userId: ctx.user.id, role: "assistant", content: assistantText, verdict: result.verdict, confidence: String(result.confidence), asset });
        const [auditTradeInsert] = await db.insert(auditTrades).values({ userId: ctx.user.id, asset, timeframe: result.timeframe || "15MIN", direction: result.direction, entry: result.entry ? String(result.entry) : null, stopLoss: result.stopLoss ? String(result.stopLoss) : null, takeProfit: result.takeProfit ? String(result.takeProfit) : null, verdict: result.verdict, confidence: String(result.confidence), adjustments: result.adjustments });
        const auditTradeId = Number(auditTradeInsert.insertId);
        await mirrorToSupabase("audited_signals", { user_id: ctx.user.id, signal: input.signal, verdict: result.verdict, confidence: result.confidence, adjustments: result.adjustments, asset });
        return { role: "assistant" as const, content: assistantText, verdict: result.verdict, confidence: result.confidence, telegramDelivered: false };
      } catch (error) {
        const content = `TRADE DENIED\\n\\nConfidence level: 0%\\n\\nAdjustments: Live market data or strategy rules were unavailable. No decision should be made without a verified market snapshot.`;
        await db.insert(auditMessages).values({ userId: ctx.user.id, role: "assistant", content, verdict: "DENIED", confidence: "0", asset });
        return { role: "assistant" as const, content, verdict: "DENIED" as const, confidence: 0, error: error instanceof Error ? error.message : "Audit unavailable" };
      }
    }),
    conversation: protectedProcedure.input(z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12000) })).min(1).max(24) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const latest = input.messages[input.messages.length - 1].content;
      await db.insert(auditMessages).values({ userId: ctx.user.id, role: "user", content: latest });
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const assetMatch = latest.match(/\b(EUR\/?USD|GBP\/?USD|XAU\/?USD|BTC\/?USD)\b/i);
      const requestedAsset = assetMatch ? normalizeAsset(assetMatch[1]) : null;
      const [signals, rulesText, judgment] = await Promise.all([listGeneratedSignalsSince(ctx.user.id, since, 500), getRelevantRulesText(ctx.user.id, latest, 12000), getStrategyDecisionSummary(ctx.user.id)]);
      let marketText = "No live market snapshot was requested or available.";
      if (requestedAsset) {
        try {
          const series = await fetchMarketSeries(requestedAsset, latest.toLowerCase().includes("1h") || latest.toLowerCase().includes("hour") ? "1h" : "15min");
          marketText = JSON.stringify({ symbol: series.symbol, close: series.close, trend: series.trend, interval: series.interval, fetchedAt: series.fetchedAt, marketContext: series.marketContext });
        } catch (error) { marketText = `Live snapshot unavailable for ${requestedAsset}: ${error instanceof Error ? error.message : "provider error"}`; }
      }
      const assetPerformance = summarizeChatSignals(signals).map((item) => `${item.asset}: ${item.generated} generated, ${item.resolved} resolved, ${item.wins} TP hits, ${item.winRate == null ? "—" : `${item.winRate}%`} win rate`).join("; ") || "No signals recorded in the last 24 hours.";
      const system = `You are TradingGuardAI's interactive trading assistant. Have a natural, useful conversation about trading, market structure, risk, the user's ingested rules, and this app's paper-trading records. Answer questions such as which asset appears more predictable from the available sample, the current paper context for gold, and recent wins. Never invent live prices or performance. Distinguish clearly between live market observations, persisted paper outcomes, and general educational explanations. Use the supplied strategy-rule excerpts as the user's source of truth when relevant. Every response must state or preserve that this is analysis only, paper trading only, and UNVALIDATED; never place trades, promise accuracy, or present financial advice. If a requested fact is unavailable, say so plainly.

Matched strategy rules:\n${rulesText || "No matching rule excerpt was found."}\n\nPaper outcomes in last 24 hours:\n${assetPerformance}\n\nStrategy judgment totals:\n${JSON.stringify(judgment)}\n\nRequested live market context:\n${marketText}`;
      const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: system }, ...input.messages] , maxTokens: 1400 });
      const content = normalizeChatResponseContent(response.choices[0]?.message.content);
      await db.insert(auditMessages).values({ userId: ctx.user.id, role: "assistant", content });
      return { role: "assistant" as const, content, verdict: null, confidence: null, telegramDelivered: false };
    }),
  }),
  signals: router({
    list: protectedProcedure.query(({ ctx }) => listGeneratedSignals(ctx.user.id)),
    audits: protectedProcedure.query(({ ctx }) => listAuditTrades(ctx.user.id)),
    deliverySummary: protectedProcedure.query(({ ctx }) => getSignalDeliverySummary(ctx.user.id)),
    adjustments: protectedProcedure.query(({ ctx }) => listPaperTradeAdjustments(ctx.user.id)),
    upgradeChains: protectedProcedure.query(({ ctx }) => listPaperTradeUpgradeChains(ctx.user.id)),
    upgradeSummary: protectedProcedure.query(({ ctx }) => getPaperTradeUpgradeSummary(ctx.user.id)),
  }),
  scanner: router({
    status: protectedProcedure.query(({ ctx }) => getSettings(ctx.user.id)),
    decisions: protectedProcedure.input(z.object({ asset: z.string().optional(), timeframe: z.enum(["15MIN", "1H"]).optional(), verdict: z.enum(["APPROVED", "DENIED", "SKIPPED", "UNAVAILABLE"]).optional() }).optional()).query(({ ctx, input }) => listStrategyDecisions(ctx.user.id, input ?? {})),
    export: protectedProcedure.input(z.object({ format: z.enum(["csv", "json"]), asset: z.string().optional(), timeframe: z.enum(["15MIN", "1H"]).optional(), verdict: z.enum(["APPROVED", "DENIED", "SKIPPED", "UNAVAILABLE"]).optional() })).query(async ({ ctx, input }) => {
      const rows = await listStrategyDecisions(ctx.user.id, { asset: input.asset, timeframe: input.timeframe, verdict: input.verdict });
      return { format: input.format, filename: `strategy-decisions-${new Date().toISOString().slice(0, 10)}.${input.format}`, content: input.format === "csv" ? serializeDecisionLedgerCsv(rows) : serializeDecisionLedgerJson(rows) };
    }),
    summary: protectedProcedure.query(({ ctx }) => getStrategyDecisionSummary(ctx.user.id)),
    health: protectedProcedure.query(({ ctx }) => getStrategyEngineHealth(ctx.user.id)),
    cadence: protectedProcedure.query(({ ctx }) => getScannerCadenceDiagnostics(ctx.user.id)),
    callbackStatus: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getSettings(ctx.user.id);
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      let registryAvailable = false;
      let schedulerJob = null;
      let taskUid = settings.scheduleCronTaskUid;
      try {
        const ownerJobs = await listHeartbeatJobs("", { pageSize: 100 });
        const selected = selectScannerSchedulerJob(taskUid, ownerJobs.jobs);
        taskUid = selected.taskUid;
        schedulerJob = selected.job;
        registryAvailable = true;
      } catch {
        try {
          const userJobs = await listHeartbeatJobs(session, { pageSize: 100 });
          const selected = selectScannerSchedulerJob(taskUid, userJobs.jobs);
          taskUid = selected.taskUid;
          schedulerJob = selected.job;
          registryAvailable = true;
        } catch {
          registryAvailable = false;
        }
      }
      if (registryAvailable && taskUid && taskUid !== settings.scheduleCronTaskUid) {
        const db = await getDb();
        if (db) await db.update(appSettings).set({ scheduleCronTaskUid: taskUid }).where(eq(appSettings.userId, ctx.user.id));
      }
      const status = buildCallbackStatus({ scannerEnabled: settings.scannerEnabled, scheduleCronTaskUid: taskUid, strategyEngineStatus: settings.strategyEngineStatus, strategyEngineLastRunAt: settings.strategyEngineLastRunAt, schedulerJob, schedulerRegistryAvailable: registryAvailable });
      const recentRuns = taskUid ? await listRecentScannerRuns(taskUid, 5) : [];
      const latestRun = recentRuns[0] ?? null;
      const stale = Boolean(schedulerJob?.isEnable && schedulerJob.nextExecutionAt && new Date(schedulerJob.nextExecutionAt).getTime() < Date.now() - 120000);
      return { ...status, recentRuns, latestRun, staleCycle: stale };
    }),
    cooldownHistory: protectedProcedure.query(({ ctx }) => listCooldownChanges(ctx.user.id)),
    updateCooldown: protectedProcedure.input(z.object({ minutes: z.number().int().min(0).max(1440) })).mutation(async ({ ctx, input }) => {
      const current = await getSettings(ctx.user.id);
      const previousMinutes = current.setupCooldownMinutes ?? 30;
      if (previousMinutes !== input.minutes) {
        await updateSetupCooldown(ctx.user.id, input.minutes);
        await recordCooldownChange({ userId: ctx.user.id, previousMinutes, newMinutes: input.minutes });
      }
      return { minutes: input.minutes };
    }),
    toggle: protectedProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(appSettings).values({ userId: ctx.user.id, scannerEnabled: input.enabled }).onDuplicateKeyUpdate({ set: { scannerEnabled: input.enabled } });
      return { enabled: input.enabled };
    }),
    activate: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const job = await createHeartbeatJob({ name: `trading-guard-scanner-${ctx.user.id}`, cron: "0 */5 * * * *", path: "/api/scheduled/trading-guard-scanner", description: "TradingGuardAI five-minute market scanner and outcome tracker with multi-key Twelve Data failover" }, session);
      await db.insert(appSettings).values({ userId: ctx.user.id, scannerEnabled: true, scheduleCronTaskUid: job.taskUid }).onDuplicateKeyUpdate({ set: { scannerEnabled: true, scheduleCronTaskUid: job.taskUid } });
      return job;
    }),
  }),
});

export type AppRouter = typeof appRouter;
