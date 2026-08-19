import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { appSettings, auditMessages, auditTrades, generatedSignals } from "../drizzle/schema";
import { activateIntelligenceVersion, createIntelligenceComponent, createIntelligenceVersion, createStrategyRule, getActiveIntelligenceVersion, getDb, getRelevantRulesText, getSettings, getSignalDeliverySummary, getStrategyDecisionSummary, getStrategyEngineHealth, listAuditMessages, listAuditTrades, listCooldownChanges, listGeneratedSignals, listIntelligenceComponents, listIntelligenceVersions, listStrategyDecisions, listStrategyLessons, listStrategyRules, markOnboardingComplete, recordCooldownChange, recordTelegramDelivery, updateSetupCooldown } from "./db";
import { serializeDecisionLedgerCsv, serializeDecisionLedgerJson } from "./decision-ledger";
import { auditWithLLM, extractStrategyText, fetchMarketSnapshot, fetchStrategyRulesFromSupabase, formatApprovedTelegramMessage, formatAuditResult, mirrorToSupabase, shouldNotifyApprovedAudit, normalizeAsset, sendTelegramMessage } from "./integrations";
import { buildIntelligenceModel, compileExecutableComponents } from "./intelligence";
import { storagePut } from "./storage";
import { createHeartbeatJob } from "./_core/heartbeat";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";

export function buildStrategyRuleRecord(input: { userId: number; title: string; sourceType: "pdf" | "docx" | "text"; fileName: string; content: string; storageKey: string; supabaseId: string | null }) {
  return { userId: input.userId, title: input.title, sourceType: input.sourceType, sourceFileName: input.fileName, content: input.content, storageKey: input.storageKey, supabaseId: input.supabaseId };
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
      return { active, versions, components, lessons };
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
    run: protectedProcedure.input(z.object({ signal: z.string().min(8) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(auditMessages).values({ userId: ctx.user.id, role: "user", content: input.signal });
      const assetMatch = input.signal.match(/(?:asset|symbol)\s*:\s*([A-Za-z/]+)|\b(EUR\/?USD|GBP\/?USD|XAU\/?USD|BTC\/?USD)\b/i);
      const asset = normalizeAsset(assetMatch?.[1] ?? assetMatch?.[2] ?? "EUR/USD");
      try {
        const market = await fetchMarketSnapshot(asset);
        const localRules = await getRelevantRulesText(ctx.user.id, input.signal);
        const mirroredRules = await fetchStrategyRulesFromSupabase();
        const result = await auditWithLLM({ tradeSignal: input.signal, rules: buildStrategyContext(localRules, mirroredRules), market });
        const assistantText = formatAuditResult(result, market);
        await db.insert(auditMessages).values({ userId: ctx.user.id, role: "assistant", content: assistantText, verdict: result.verdict, confidence: String(result.confidence), asset });
        const [auditTradeInsert] = await db.insert(auditTrades).values({ userId: ctx.user.id, asset, timeframe: result.timeframe || "15MIN", direction: result.direction, entry: result.entry ? String(result.entry) : null, stopLoss: result.stopLoss ? String(result.stopLoss) : null, takeProfit: result.takeProfit ? String(result.takeProfit) : null, verdict: result.verdict, confidence: String(result.confidence), adjustments: result.adjustments });
        const auditTradeId = Number(auditTradeInsert.insertId);
        await mirrorToSupabase("audited_signals", { user_id: ctx.user.id, signal: input.signal, verdict: result.verdict, confidence: result.confidence, adjustments: result.adjustments, asset });
        const telegramDelivery = shouldNotifyApprovedAudit(result.verdict)
          ? await sendTelegramMessage(formatApprovedTelegramMessage({
              asset,
              timeframe: result.timeframe || "15MIN",
              direction: result.direction || "UNKNOWN",
              entry: result.entry,
              stopLoss: result.stopLoss,
              takeProfit: result.takeProfit,
              confidence: Number(result.confidence ?? 0),
              adjustments: result.adjustments || "No adjustments.",
              ruleEvidence: result.ruleEvidence,
              confluenceScore: result.confluenceScore,
            }))
          : { delivered: false, error: "Not an approved audit" };
        if (shouldNotifyApprovedAudit(result.verdict)) {
          await recordTelegramDelivery({ userId: ctx.user.id, auditTradeId, kind: "AUDIT", status: telegramDelivery.delivered ? "DELIVERED" : "FAILED", telegramMessageId: telegramDelivery.telegramMessageId, dedupeKey: `audit:${auditTradeId}`, error: telegramDelivery.error });
        }
        const telegramDelivered = telegramDelivery.delivered;
        if (shouldNotifyApprovedAudit(result.verdict)) {
          console.info(`[Telegram] Approved audit delivery ${telegramDelivered ? "succeeded" : "was unavailable"} for user ${ctx.user.id}`);
        }
        return { role: "assistant" as const, content: assistantText, verdict: result.verdict, confidence: result.confidence, telegramDelivered };
      } catch (error) {
        const content = `TRADE DENIED\\n\\nConfidence level: 0%\\n\\nAdjustments: Live market data or strategy rules were unavailable. No decision should be made without a verified market snapshot.`;
        await db.insert(auditMessages).values({ userId: ctx.user.id, role: "assistant", content, verdict: "DENIED", confidence: "0", asset });
        return { role: "assistant" as const, content, verdict: "DENIED" as const, confidence: 0, error: error instanceof Error ? error.message : "Audit unavailable" };
      }
    }),
  }),
  signals: router({
    list: protectedProcedure.query(({ ctx }) => listGeneratedSignals(ctx.user.id)),
    audits: protectedProcedure.query(({ ctx }) => listAuditTrades(ctx.user.id)),
    deliverySummary: protectedProcedure.query(({ ctx }) => getSignalDeliverySummary(ctx.user.id)),
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
