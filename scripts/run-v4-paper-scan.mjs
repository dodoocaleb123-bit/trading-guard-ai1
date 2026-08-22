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
const result = await scanUser(owner.id);
console.log(JSON.stringify({ userId: owner.id, ...result }, null, 2));
