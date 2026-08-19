import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routersSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const auditProcedure = routersSource.slice(routersSource.indexOf("  audit: router({"), routersSource.indexOf("  signals: router({"));

describe("manual audit channel policy", () => {
  it("keeps manual audit responses in Chat Audit instead of sending them to Telegram", () => {
    expect(auditProcedure).toContain('return { role: "assistant" as const, content: assistantText');
    expect(auditProcedure).toContain("telegramDelivered: false");
    expect(auditProcedure).not.toContain("sendTelegramMessage");
    expect(auditProcedure).not.toContain("recordTelegramDelivery");
  });
});

// Autonomous scanner delivery remains covered by scanner.behavior.test.ts and telegram-routing.test.ts.
