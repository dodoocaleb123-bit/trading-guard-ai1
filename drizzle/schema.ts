import { boolean, decimal, int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const strategyRules = mysqlTable("strategy_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["pdf", "docx", "text"]).notNull(),
  sourceFileName: varchar("sourceFileName", { length: 255 }),
  content: mediumtext("content").notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  supabaseId: varchar("supabaseId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditMessages = mysqlTable("audit_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  verdict: mysqlEnum("verdict", ["APPROVED", "DENIED", "PENDING"]),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  asset: varchar("asset", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const generatedSignals = mysqlTable("generated_signals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  asset: varchar("asset", { length: 32 }).notNull(),
  timeframe: varchar("timeframe", { length: 16 }).notNull(),
  direction: mysqlEnum("direction", ["BUY", "SELL"]).notNull(),
  entry: decimal("entry", { precision: 18, scale: 8 }).notNull(),
  stopLoss: decimal("stopLoss", { precision: 18, scale: 8 }).notNull(),
  takeProfit: decimal("takeProfit", { precision: 18, scale: 8 }).notNull(),
  riskReward: decimal("riskReward", { precision: 8, scale: 2 }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  rationale: text("rationale"),
  status: mysqlEnum("status", ["PENDING", "WIN", "LOSS", "INVALIDATED"]).default("PENDING").notNull(),
  outcomeNote: text("outcomeNote"),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export const auditTrades = mysqlTable("audit_trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messageId: int("messageId"),
  asset: varchar("asset", { length: 32 }).notNull(),
  timeframe: varchar("timeframe", { length: 16 }),
  direction: mysqlEnum("direction", ["BUY", "SELL"]),
  entry: decimal("entry", { precision: 18, scale: 8 }),
  stopLoss: decimal("stopLoss", { precision: 18, scale: 8 }),
  takeProfit: decimal("takeProfit", { precision: 18, scale: 8 }),
  verdict: mysqlEnum("verdict", ["APPROVED", "DENIED"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  adjustments: text("adjustments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const telegramDeliveries = mysqlTable("telegram_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  signalId: int("signalId"),
  auditTradeId: int("auditTradeId"),
  kind: mysqlEnum("kind", ["SIGNAL", "AUDIT", "OUTCOME"]).notNull(),
  status: mysqlEnum("status", ["DELIVERED", "FAILED"]).notNull(),
  telegramMessageId: varchar("telegramMessageId", { length: 64 }),
  dedupeKey: varchar("dedupeKey", { length: 255 }).notNull().unique(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
});

export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
  scannerEnabled: boolean("scannerEnabled").default(true).notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StrategyRule = typeof strategyRules.$inferSelect;
export type GeneratedSignal = typeof generatedSignals.$inferSelect;
export type AuditTrade = typeof auditTrades.$inferSelect;
export type TelegramDelivery = typeof telegramDeliveries.$inferSelect;