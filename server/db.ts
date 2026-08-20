import { and, desc, eq, gte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { appSettings, auditMessages, auditTrades, cooldownChangeLog, generatedSignals, InsertUser, strategyDecisionLedger, strategyRules, strategyIntelligenceComponents, strategyIntelligenceVersions, strategyLessons, telegramDeliveries, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { filterStrategyDecisions, type DecisionFilters } from "./decision-ledger";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createIntelligenceVersion(input: typeof strategyIntelligenceVersions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(strategyIntelligenceVersions).values(input);
  return { id: Number(result[0].insertId), ...input };
}

export async function listIntelligenceVersions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(strategyIntelligenceVersions).where(eq(strategyIntelligenceVersions.userId, userId)).orderBy(desc(strategyIntelligenceVersions.createdAt));
}

export async function getActiveIntelligenceVersion(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(strategyIntelligenceVersions).where(and(eq(strategyIntelligenceVersions.userId, userId), eq(strategyIntelligenceVersions.status, "ACTIVE"))).orderBy(desc(strategyIntelligenceVersions.createdAt)).limit(1);
  return rows[0];
}

export async function activateIntelligenceVersion(userId: number, versionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(strategyIntelligenceVersions).set({ status: "RETIRED" }).where(and(eq(strategyIntelligenceVersions.userId, userId), eq(strategyIntelligenceVersions.status, "ACTIVE")));
  await db.update(strategyIntelligenceVersions).set({ status: "ACTIVE", activatedAt: new Date() }).where(and(eq(strategyIntelligenceVersions.userId, userId), eq(strategyIntelligenceVersions.id, versionId)));
}

export async function createIntelligenceComponent(input: typeof strategyIntelligenceComponents.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(strategyIntelligenceComponents).values(input);
  return { id: Number(result[0].insertId), ...input };
}

export async function listIntelligenceComponents(userId: number, versionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(strategyIntelligenceComponents).where(and(eq(strategyIntelligenceComponents.userId, userId), eq(strategyIntelligenceComponents.versionId, versionId), eq(strategyIntelligenceComponents.enabled, true)));
}

export async function createStrategyLesson(input: typeof strategyLessons.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(strategyLessons).values(input);
  return { id: Number(result[0].insertId), ...input };
}

export async function listStrategyLessons(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(strategyLessons).where(eq(strategyLessons.userId, userId)).orderBy(desc(strategyLessons.createdAt)).limit(100);
}

export async function updateStrategyLessonStatus(userId: number, lessonId: number, status: "PROPOSED" | "VALIDATING" | "ACCEPTED" | "REJECTED", sourceVersionId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(strategyLessons).set({ status, sourceVersionId: sourceVersionId ?? undefined, validatedAt: status === "ACCEPTED" ? new Date() : null }).where(and(eq(strategyLessons.userId, userId), eq(strategyLessons.id, lessonId)));
}

export async function listStrategyRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(strategyRules).where(eq(strategyRules.userId, userId)).orderBy(desc(strategyRules.createdAt));
}

export async function createStrategyRule(input: typeof strategyRules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(strategyRules).values(input);
  return { id: Number(result[0].insertId), ...input };
}

export async function listAuditMessages(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditMessages).where(eq(auditMessages.userId, userId)).orderBy(desc(auditMessages.createdAt)).limit(50);
}

export function attachTelegramDelivery<T extends { id: number }, D extends { kind: string; signalId?: number | null; auditTradeId?: number | null }>(rows: T[], deliveries: D[], kind: "SIGNAL" | "AUDIT", key: "signalId" | "auditTradeId") {
  return rows.map((row) => ({ ...row, telegramDelivery: deliveries.find((delivery) => delivery.kind === kind && delivery[key] === row.id) ?? null }));
}

export async function listGeneratedSignals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const signals = await db.select().from(generatedSignals).where(eq(generatedSignals.userId, userId)).orderBy(desc(generatedSignals.openedAt)).limit(50);
  const deliveries = await db.select().from(telegramDeliveries).where(eq(telegramDeliveries.userId, userId));
  return attachTelegramDelivery(signals, deliveries, "SIGNAL", "signalId");
}

export async function listAuditTrades(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const audits = await db.select().from(auditTrades).where(eq(auditTrades.userId, userId)).orderBy(desc(auditTrades.createdAt)).limit(50);
  const deliveries = await db.select().from(telegramDeliveries).where(eq(telegramDeliveries.userId, userId));
  return attachTelegramDelivery(audits, deliveries, "AUDIT", "auditTradeId");
}

export async function recordTelegramDelivery(input: { userId: number; signalId?: number; auditTradeId?: number; kind: "SIGNAL" | "AUDIT" | "OUTCOME" | "SUMMARY"; status: "DELIVERED" | "FAILED"; telegramMessageId?: string; dedupeKey: string; error?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deliveredAt = input.status === "DELIVERED" ? new Date() : null;
  await db.insert(telegramDeliveries).values({ ...input, deliveredAt }).onDuplicateKeyUpdate({ set: { status: input.status, telegramMessageId: input.telegramMessageId ?? null, error: input.error ?? null, deliveredAt } });
}

export async function hasTelegramDelivery(dedupeKey: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ status: telegramDeliveries.status }).from(telegramDeliveries).where(eq(telegramDeliveries.dedupeKey, dedupeKey)).limit(1);
  return rows[0]?.status === "DELIVERED";
}

export function summarizeDeliveryCounts(signals: Array<{ status: string }>, audits: Array<{ verdict: string }>, deliveries: Array<{ kind: string; status: string }>) {
  const count = (kind: "SIGNAL" | "AUDIT" | "OUTCOME", status?: "DELIVERED" | "FAILED") => deliveries.filter((delivery) => delivery.kind === kind && (!status || delivery.status === status)).length;
  return {
    generated: signals.length,
    pending: signals.filter((signal) => signal.status === "PENDING").length,
    wins: signals.filter((signal) => signal.status === "WIN").length,
    losses: signals.filter((signal) => signal.status === "LOSS").length,
    audits: audits.length,
    approvedAudits: audits.filter((audit) => audit.verdict === "APPROVED").length,
    signalAttempts: count("SIGNAL"), signalDelivered: count("SIGNAL", "DELIVERED"), signalFailed: count("SIGNAL", "FAILED"),
    auditAttempts: count("AUDIT"), auditDelivered: count("AUDIT", "DELIVERED"), auditFailed: count("AUDIT", "FAILED"),
    approvedAuditDelivered: deliveries.filter((delivery) => delivery.kind === "AUDIT" && delivery.status === "DELIVERED").length,
    approvedAuditFailed: deliveries.filter((delivery) => delivery.kind === "AUDIT" && delivery.status === "FAILED").length,
    outcomeAttempts: count("OUTCOME"), outcomeDelivered: count("OUTCOME", "DELIVERED"), outcomeFailed: count("OUTCOME", "FAILED"),
  };
}

export async function getSignalDeliverySummary(userId: number) {
  const db = await getDb();
  if (!db) return summarizeDeliveryCounts([], [], []);
  const signals = await db.select().from(generatedSignals).where(eq(generatedSignals.userId, userId));
  const audits = await db.select().from(auditTrades).where(eq(auditTrades.userId, userId));
  const deliveries = await db.select().from(telegramDeliveries).where(eq(telegramDeliveries.userId, userId));
  return summarizeDeliveryCounts(signals, audits, deliveries);
}

export async function getSettings(userId: number) {
  const db = await getDb();
  if (!db) return { onboardingComplete: false, scannerEnabled: true, setupCooldownMinutes: 30, strategyEngineStatus: "NOT_RUN" as const, strategyEngineLastRunAt: null, strategyEngineLastError: null, strategyEngineTotalSnapshots: 0, strategyEngineCompleteResponses: 0, strategyEngineRetryCount: 0, strategyEngineUnavailableCycles: 0, scheduleCronTaskUid: null };
  const rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(appSettings).values({ userId });
  return { onboardingComplete: false, scannerEnabled: true, setupCooldownMinutes: 30, strategyEngineStatus: "NOT_RUN" as const, strategyEngineLastRunAt: null, strategyEngineLastError: null, strategyEngineTotalSnapshots: 0, strategyEngineCompleteResponses: 0, strategyEngineRetryCount: 0, strategyEngineUnavailableCycles: 0, scheduleCronTaskUid: null };
}

export async function updateStrategyEngineStatus(userId: number, input: { status: "AVAILABLE" | "UNAVAILABLE" | "NOT_RUN"; error?: string | null }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(appSettings).values({ userId, strategyEngineStatus: input.status, strategyEngineLastRunAt: new Date(), strategyEngineLastError: input.error ?? null }).onDuplicateKeyUpdate({ set: { strategyEngineStatus: input.status, strategyEngineLastRunAt: new Date(), strategyEngineLastError: input.error ?? null } });
}

export async function recordStrategyEngineHealth(userId: number, input: { snapshots: number; completeResponses: number; retries: number; unavailableCycle?: boolean }) {
  const db = await getDb();
  if (!db) return;
  const current = await db.select({ total: appSettings.strategyEngineTotalSnapshots, complete: appSettings.strategyEngineCompleteResponses, retries: appSettings.strategyEngineRetryCount, unavailable: appSettings.strategyEngineUnavailableCycles }).from(appSettings).where(eq(appSettings.userId, userId)).limit(1);
  const row = current[0] ?? { total: 0, complete: 0, retries: 0, unavailable: 0 };
  await db.insert(appSettings).values({ userId, strategyEngineTotalSnapshots: row.total + input.snapshots, strategyEngineCompleteResponses: row.complete + input.completeResponses, strategyEngineRetryCount: row.retries + input.retries, strategyEngineUnavailableCycles: row.unavailable + (input.unavailableCycle ? 1 : 0) }).onDuplicateKeyUpdate({ set: { strategyEngineTotalSnapshots: row.total + input.snapshots, strategyEngineCompleteResponses: row.complete + input.completeResponses, strategyEngineRetryCount: row.retries + input.retries, strategyEngineUnavailableCycles: row.unavailable + (input.unavailableCycle ? 1 : 0) } });
}

export async function updateSetupCooldown(userId: number, minutes: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(appSettings).values({ userId, setupCooldownMinutes: minutes }).onDuplicateKeyUpdate({ set: { setupCooldownMinutes: minutes } });
}

export async function createStrategyDecision(input: typeof strategyDecisionLedger.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(strategyDecisionLedger).values(input);
  return { id: Number(result[0].insertId), ...input };
}

export async function listStrategyDecisions(userId: number, filters: DecisionFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(strategyDecisionLedger).where(eq(strategyDecisionLedger.userId, userId)).orderBy(desc(strategyDecisionLedger.createdAt)).limit(500);
  return filterStrategyDecisions(rows, filters);
}

export async function listStrategyDecisionsSince(userId: number, since: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(strategyDecisionLedger).where(and(eq(strategyDecisionLedger.userId, userId), gte(strategyDecisionLedger.createdAt, since))).orderBy(desc(strategyDecisionLedger.createdAt)).limit(500);
}

export async function hasRecentStrategyDecision(userId: number, cooldownKey: string, since: Date) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: strategyDecisionLedger.id }).from(strategyDecisionLedger).where(and(eq(strategyDecisionLedger.userId, userId), eq(strategyDecisionLedger.cooldownKey, cooldownKey), gte(strategyDecisionLedger.createdAt, since))).limit(1);
  return rows.length > 0;
}

export function summarizeStrategyEngineHealth(input: { strategyEngineTotalSnapshots?: number | null; strategyEngineCompleteResponses?: number | null; strategyEngineRetryCount?: number | null; strategyEngineUnavailableCycles?: number | null; strategyEngineStatus?: string | null; strategyEngineLastRunAt?: Date | null; strategyEngineLastError?: string | null }) {
  const snapshots = Number(input.strategyEngineTotalSnapshots ?? 0);
  const completeResponses = Number(input.strategyEngineCompleteResponses ?? 0);
  return {
    status: input.strategyEngineStatus ?? "NOT_RUN",
    totalSnapshots: snapshots,
    completeResponses,
    completenessPercent: snapshots ? Math.round((completeResponses / snapshots) * 100) : 0,
    retryCount: Number(input.strategyEngineRetryCount ?? 0),
    unavailableCycles: Number(input.strategyEngineUnavailableCycles ?? 0),
    lastRunAt: input.strategyEngineLastRunAt ?? null,
    lastError: input.strategyEngineLastError ?? null,
  };
}

export function summarizeStrategyDecisions(decisions: Array<{ verdict: string }>) {
  return {
    total: decisions.length,
    approved: decisions.filter((decision) => decision.verdict === "APPROVED").length,
    denied: decisions.filter((decision) => decision.verdict === "DENIED").length,
    skipped: decisions.filter((decision) => decision.verdict === "SKIPPED").length,
    unavailable: decisions.filter((decision) => decision.verdict === "UNAVAILABLE").length,
  };
}

export function summarizeJudgmentAlertBridge(judgment: { total: number; approved: number }, delivery: { signalDelivered: number }) {
  return {
    directionalJudgments: judgment.total,
    approvedJudgments: judgment.approved,
    telegramDelivered: delivery.signalDelivered,
  };
}

export async function getStrategyEngineHealth(userId: number) {
  return summarizeStrategyEngineHealth(await getSettings(userId));
}

export async function getStrategyDecisionSummary(userId: number) {
  const db = await getDb();
  if (!db) return summarizeStrategyDecisions([]);
  const decisions = await db.select({ verdict: strategyDecisionLedger.verdict }).from(strategyDecisionLedger).where(eq(strategyDecisionLedger.userId, userId));
  return summarizeStrategyDecisions(decisions);
}

export async function recordCooldownChange(input: { userId: number; previousMinutes: number; newMinutes: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(cooldownChangeLog).values(input);
  return { id: Number(result[0].insertId), ...input };
}

export async function listCooldownChanges(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cooldownChangeLog).where(eq(cooldownChangeLog.userId, userId)).orderBy(desc(cooldownChangeLog.changedAt)).limit(20);
}

export async function markOnboardingComplete(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(appSettings).values({ userId, onboardingComplete: true }).onDuplicateKeyUpdate({ set: { onboardingComplete: true } });
}

export async function getAllRulesText(userId: number) {
  const rules = await listStrategyRules(userId);
  return rules.map((rule) => `## ${rule.title}\n${rule.content}`).join("\n\n");
}

export async function getRelevantRulesText(userId: number, query: string, maxChars = 120_000) {
  const rules = await listStrategyRules(userId);
  const queryTokens = new Set((query.toLowerCase().match(/[a-z0-9%/]+/g) ?? []).filter((token) => token.length > 2));
  const scored = rules.map((rule) => {
    const titleAndContent = `${rule.title} ${rule.content}`.toLowerCase();
    const titleTokens = new Set((rule.title.toLowerCase().match(/[a-z0-9%/]+/g) ?? []).filter((token) => token.length > 2));
    const queryTokenList = Array.from(queryTokens);
    const overlap = queryTokenList.filter((token) => titleAndContent.includes(token)).length;
    const titleOverlap = queryTokenList.filter((token) => titleTokens.has(token)).length;
    const paragraphs = rule.content.split(/\n\s*\n|(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
    const excerpts = paragraphs.filter((part) => Array.from(queryTokens).some((token) => part.toLowerCase().includes(token))).slice(0, 6);
    return { rule, score: overlap + titleOverlap * 3, excerpts: excerpts.length ? excerpts : paragraphs.slice(0, 2) };
  }).sort((a, b) => b.score - a.score || b.rule.createdAt.getTime() - a.rule.createdAt.getTime());
  const sections: string[] = [];
  let chars = 0;
  for (const item of scored) {
    const section = `## ${item.rule.title}\nSource: ${item.rule.sourceFileName ?? "saved strategy rule"}\n${item.excerpts.join(" ")}`;
    if (chars + section.length > maxChars && sections.length > 0) continue;
    sections.push(section);
    chars += section.length + 2;
    if (chars >= maxChars) break;
  }
  return sections.join("\n\n");
}


type ReplacementOutcomeRow = { status: string; intelligenceComponents: string | null; marketRegime: string | null; confidence?: string | number | null };
type ReplacementOutcomeBucket = { key: string; total: number; wins: number; losses: number; pending: number; invalidated: number };
export function summarizeReplacementOutcomes(rows: ReplacementOutcomeRow[]) {
  const componentMap = new Map<string, ReplacementOutcomeBucket>();
  const regimeMap = new Map<string, ReplacementOutcomeBucket>();
  const confidenceMap = new Map<string, ReplacementOutcomeBucket>();
  const add = (map: Map<string, ReplacementOutcomeBucket>, key: string, status: string) => {
    const bucket = map.get(key) ?? { key, total: 0, wins: 0, losses: 0, pending: 0, invalidated: 0 };
    bucket.total += 1;
    if (status === "WIN") bucket.wins += 1;
    else if (status === "LOSS") bucket.losses += 1;
    else if (status === "INVALIDATED") bucket.invalidated += 1;
    else bucket.pending += 1;
    map.set(key, bucket);
  };
  for (const row of rows) {
    const components = (() => { try { const parsed = JSON.parse(row.intelligenceComponents ?? "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })();
    for (const component of components) if (typeof component === "string" && component.trim()) add(componentMap, component, row.status);
    add(regimeMap, row.marketRegime ?? "UNKNOWN", row.status);
    const confidence = Number(row.confidence);
    const confidenceBand = Number.isFinite(confidence) ? confidence >= 90 ? "90-94" : confidence >= 75 ? "75-89" : confidence >= 60 ? "60-74" : "40-59" : "UNKNOWN";
    add(confidenceMap, confidenceBand, row.status);
  }
  const withRate = (bucket: ReplacementOutcomeBucket) => ({ ...bucket, resolved: bucket.wins + bucket.losses, winRate: bucket.wins + bucket.losses ? Math.round((bucket.wins / (bucket.wins + bucket.losses)) * 100) : null });
  const wins = rows.filter((row) => row.status === "WIN").length;
  const losses = rows.filter((row) => row.status === "LOSS").length;
  const resolved = wins + losses;
  return { version: "replacement-forex-v2", total: rows.length, components: Array.from(componentMap.values()).map(withRate).sort((a, b) => b.total - a.total), regimes: Array.from(regimeMap.values()).map(withRate).sort((a, b) => b.total - a.total), confidenceBands: Array.from(confidenceMap.values()).map(withRate).sort((a, b) => a.key.localeCompare(b.key)), validation: { resolved, wins, losses, pending: rows.filter((row) => row.status === "PENDING").length, invalidated: rows.filter((row) => row.status === "INVALIDATED").length, winRate: resolved ? Math.round((wins / resolved) * 100) : null, reviewThreshold: 50, reviewReady: resolved >= 50, reviewStatus: resolved >= 50 ? "READY_FOR_REVIEW" as const : "COLLECTING_EVIDENCE" as const } };
}

export async function getReplacementOutcomeStats(userId: number) {
  const db = await getDb();
  if (!db) return summarizeReplacementOutcomes([]);
  const rows = await db.select({ status: generatedSignals.status, intelligenceComponents: generatedSignals.intelligenceComponents, marketRegime: generatedSignals.marketRegime, confidence: generatedSignals.confidence }).from(generatedSignals).where(and(eq(generatedSignals.userId, userId), eq(generatedSignals.intelligenceVersion, "forex-trading-combined-document-v2")));
  return summarizeReplacementOutcomes(rows);
}

type WinningRateRow = { version: string; asset: string; timeframe: string; confidence: string | number | null; status: string };
export type WinningRateMetric = { generated: number; resolved: number; wins: number; losses: number; winRate: number | null };
export type WinningRateBucket = WinningRateMetric & { key: string };
const WINNING_RATE_ASSETS = ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"] as const;
const WINNING_RATE_TIMEFRAMES = ["15MIN", "1H"] as const;
const WINNING_RATE_BANDS = ["100-90", "89-80", "79-70", "69-60", "59-40"] as const;
const WINNING_RATE_VERSIONS = ["replacement-forex-v1", "forex-trading-combined-document-v2"] as const;

function emptyWinningRateMetric(): WinningRateMetric { return { generated: 0, resolved: 0, wins: 0, losses: 0, winRate: null }; }
function updateWinningRateMetric(metric: WinningRateMetric, status: string) {
  metric.generated += 1;
  if (status === "WIN") metric.wins += 1;
  if (status === "LOSS") metric.losses += 1;
  metric.resolved = metric.wins + metric.losses;
  metric.winRate = metric.resolved ? Math.round((metric.wins / metric.resolved) * 100) : null;
}
function confidenceBand(value: string | number | null) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return "UNKNOWN";
  if (confidence >= 90) return "100-90";
  if (confidence >= 80) return "89-80";
  if (confidence >= 70) return "79-70";
  if (confidence >= 60) return "69-60";
  if (confidence >= 40) return "59-40";
  return "BELOW-40";
}
export function summarizeWinningRate(rows: WinningRateRow[]) {
  const byVersion = WINNING_RATE_VERSIONS.map((version) => {
    const versionRows = rows.filter((row) => row.version === version);
    const overall = emptyWinningRateMetric();
    versionRows.forEach((row) => updateWinningRateMetric(overall, row.status));
    const assets = WINNING_RATE_ASSETS.map((asset) => { const metric = emptyWinningRateMetric(); versionRows.filter((row) => row.asset === asset).forEach((row) => updateWinningRateMetric(metric, row.status)); return { key: asset, ...metric }; });
    const timeframes = WINNING_RATE_ASSETS.flatMap((asset) => WINNING_RATE_TIMEFRAMES.map((timeframe) => { const metric = emptyWinningRateMetric(); versionRows.filter((row) => row.asset === asset && row.timeframe === timeframe).forEach((row) => updateWinningRateMetric(metric, row.status)); return { key: `${asset} · ${timeframe}`, asset, timeframe, ...metric }; }));
    const confidenceBands = [...WINNING_RATE_BANDS, "UNKNOWN"].map((band) => { const metric = emptyWinningRateMetric(); versionRows.filter((row) => confidenceBand(row.confidence) === band).forEach((row) => updateWinningRateMetric(metric, row.status)); return { key: band, ...metric }; });
    return { version, overall, assets, timeframes, confidenceBands };
  });
  return { versions: byVersion, confidenceBandLabels: [...WINNING_RATE_BANDS], assets: [...WINNING_RATE_ASSETS], timeframes: [...WINNING_RATE_TIMEFRAMES] };
}
export async function getWinningRateStats(userId: number) {
  const db = await getDb();
  if (!db) return summarizeWinningRate([]);
  const rows = await db.select({ version: generatedSignals.intelligenceVersion, asset: generatedSignals.asset, timeframe: generatedSignals.timeframe, confidence: generatedSignals.confidence, status: generatedSignals.status }).from(generatedSignals).where(and(eq(generatedSignals.userId, userId), or(eq(generatedSignals.intelligenceVersion, "replacement-forex-v1"), eq(generatedSignals.intelligenceVersion, "forex-trading-combined-document-v2"))));
  return summarizeWinningRate(rows.map((row) => ({ ...row, version: row.version ?? "" })));
}
