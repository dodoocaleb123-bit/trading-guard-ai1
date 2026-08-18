import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { appSettings, auditMessages, auditTrades, generatedSignals, InsertUser, strategyRules, users } from "../drizzle/schema";
import { ENV } from './_core/env';

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

export async function listGeneratedSignals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedSignals).where(eq(generatedSignals.userId, userId)).orderBy(desc(generatedSignals.openedAt)).limit(50);
}

export async function listAuditTrades(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditTrades).where(eq(auditTrades.userId, userId)).orderBy(desc(auditTrades.createdAt)).limit(50);
}

export async function getSettings(userId: number) {
  const db = await getDb();
  if (!db) return { onboardingComplete: false, scannerEnabled: true, scheduleCronTaskUid: null };
  const rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(appSettings).values({ userId });
  return { onboardingComplete: false, scannerEnabled: true, scheduleCronTaskUid: null };
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
