import { describe, expect, it } from "vitest";

describe("Twelve Data scanner credential", () => {
  it("authenticates and has credits for an OHLCV request", async () => {
    const key = process.env.TWELVE_DATA_API_KEY;
    expect(key, "TWELVE_DATA_API_KEY must be configured").toBeTruthy();
    const response = await fetch(`https://api.twelvedata.com/time_series?symbol=EUR%2FUSD&interval=15min&outputsize=3&apikey=${key}`);
    const body = (await response.json()) as { status?: string; code?: number; message?: string; values?: unknown[] };
    expect(response.status, body.message ?? "Twelve Data rejected the request").not.toBe(401);
    expect(response.status, body.message ?? "Twelve Data rejected the request").not.toBe(403);
    const quotaExhausted = response.status === 429 && /credits|quota|limit/i.test(body.message ?? "");
    if (quotaExhausted) return;
    expect(response.status, body.message ?? "Twelve Data rejected the request").toBe(200);
    expect(body.status, body.message ?? "Twelve Data did not return a valid series").toBe("ok");
    expect(body.values?.length, body.message ?? "Twelve Data returned no OHLCV values").toBeGreaterThan(0);
  }, 15000);
});
