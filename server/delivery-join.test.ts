import { describe, expect, it } from "vitest";
import { attachTelegramDelivery } from "./db";

describe("Telegram delivery joins", () => {
  it("attaches the matching delivery status to signals and audits", () => {
    const deliveries = [
      { kind: "SIGNAL", signalId: 7, auditTradeId: null, status: "DELIVERED", deliveredAt: new Date("2026-08-18T20:00:00Z") },
      { kind: "AUDIT", signalId: null, auditTradeId: 11, status: "FAILED", deliveredAt: null },
    ];
    const signals = attachTelegramDelivery([{ id: 7 }, { id: 8 }], deliveries, "SIGNAL", "signalId");
    const audits = attachTelegramDelivery([{ id: 11 }, { id: 12 }], deliveries, "AUDIT", "auditTradeId");

    expect(signals[0]?.telegramDelivery?.status).toBe("DELIVERED");
    expect(signals[0]?.telegramDelivery?.deliveredAt).toEqual(new Date("2026-08-18T20:00:00Z"));
    expect(signals[1]?.telegramDelivery).toBeNull();
    expect(audits[0]?.telegramDelivery?.status).toBe("FAILED");
    expect(audits[1]?.telegramDelivery).toBeNull();
  });
});
