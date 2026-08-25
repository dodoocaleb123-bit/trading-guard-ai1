import { describe, expect, it } from "vitest";
import { isOutcomeDeliveryRetryable, OUTCOME_RETRY_WINDOW_MINUTES } from "./db";

describe("outcome delivery retry window", () => {
  const now = new Date("2026-08-25T05:15:00.000Z");

  it("allows a recent failed outcome to retry", () => {
    const recent = new Date(now.getTime() - 5 * 60_000);
    expect(isOutcomeDeliveryRetryable(recent, now)).toBe(true);
  });

  it("excludes stale historical failures while preserving their records", () => {
    const stale = new Date(now.getTime() - (OUTCOME_RETRY_WINDOW_MINUTES + 1) * 60_000);
    expect(isOutcomeDeliveryRetryable(stale, now)).toBe(false);
  });

  it("does not retry future-dated delivery records", () => {
    const future = new Date(now.getTime() + 60_000);
    expect(isOutcomeDeliveryRetryable(future, now)).toBe(false);
  });
});
