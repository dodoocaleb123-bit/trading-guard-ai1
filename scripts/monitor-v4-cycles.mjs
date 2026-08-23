import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { scanUser } from "../server/scanner.ts";

const db = await getDb();
if (!db) throw new Error("Database is unavailable");
const ownerOpenId = process.env.OWNER_OPEN_ID;
if (!ownerOpenId) throw new Error("OWNER_OPEN_ID is unavailable");
const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.openId, ownerOpenId)).limit(1);
if (!owner) throw new Error("Owner account was not found");

const results = [];
for (let cycle = 1; cycle <= 3; cycle += 1) {
  const startedAt = new Date().toISOString();
  const result = await scanUser(owner.id);
  results.push({ cycle, startedAt, finishedAt: new Date().toISOString(), result });
  console.log(JSON.stringify(results.at(-1), null, 2));
  if (cycle < 3) await new Promise((resolve) => setTimeout(resolve, 300_000));
}
