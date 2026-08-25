import { describe, expect, it } from "vitest";

describe("Twelve Data failover credentials", () => {
  it("validates the supplied sixth key without exposing its value", async () => {
    const key = process.env.TWELVE_DATA_API_KEY_6;
    expect(key, "TWELVE_DATA_API_KEY_6 must be configured").toBeTruthy();
    const url = new URL("https://api.twelvedata.com/price");
    url.searchParams.set("symbol", "EUR/USD");
    url.searchParams.set("apikey", key ?? "");
    const response = await fetch(url);
    const body = (await response.json()) as { status?: string; code?: number; message?: string; price?: string };
    const quotaExhausted = response.status === 429 && /credits|quota|limit/i.test(body.message ?? "");
    expect(response.status, body.message ?? "Twelve Data rejected the sixth key").not.toBe(401);
    expect(response.status, body.message ?? "Twelve Data rejected the sixth key").not.toBe(403);
    if (!quotaExhausted) {
      expect(response.status, body.message ?? "Twelve Data sixth-key request failed").toBe(200);
      expect(Number.isFinite(Number(body.price)), body.message ?? "Twelve Data returned no usable price for the sixth key").toBe(true);
    }
  }, 15000);

  it("accepts each configured authorized key or reports quota exhaustion", async () => {
    const keys = [
      process.env.TWELVE_DATA_API_KEY_2,
      process.env.TWELVE_DATA_API_KEY_3,
      process.env.TWELVE_DATA_API_KEY_4,
      process.env.TWELVE_DATA_API_KEY_5,
      process.env.TWELVE_DATA_API_KEY_6,
    ].filter((key): key is string => Boolean(key));

    expect(keys.length, "At least one additional Twelve Data key must be configured").toBeGreaterThan(0);

    for (const key of keys) {
      const url = new URL("https://api.twelvedata.com/price");
      url.searchParams.set("symbol", "EUR/USD");
      url.searchParams.set("apikey", key);
      const response = await fetch(url);
      const body = (await response.json()) as { status?: string; code?: number; message?: string; price?: string };
      const quotaExhausted = response.status === 429 && /credits|quota|limit/i.test(body.message ?? "");

      expect(response.status, body.message ?? "Twelve Data rejected a failover key").not.toBe(401);
      expect(response.status, body.message ?? "Twelve Data rejected a failover key").not.toBe(403);
      if (!quotaExhausted) {
        expect(response.status, body.message ?? "Twelve Data failover request failed").toBe(200);
        expect(Number.isFinite(Number(body.price)), body.message ?? "Twelve Data returned no usable price").toBe(true);
      }
    }
  }, 30000);
});
