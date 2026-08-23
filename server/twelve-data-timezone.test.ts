import { describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("axios", () => ({ default: { get } }));

import { fetchMarketSeriesBatch } from "./integrations";

describe("Twelve Data timestamp normalization", () => {
  it("requests UTC timestamps for batch market series", async () => {
    get.mockResolvedValueOnce({
      data: {
        "EUR/USD": {
          values: [
            { datetime: "2026-08-23 15:00:00", open: "1.1", high: "1.2", low: "1.0", close: "1.1" },
            { datetime: "2026-08-23 15:15:00", open: "1.1", high: "1.3", low: "1.0", close: "1.2" },
            { datetime: "2026-08-23 15:30:00", open: "1.2", high: "1.4", low: "1.1", close: "1.3" },
          ],
        },
      },
    });

    const result = await fetchMarketSeriesBatch(["EUR/USD"], "15min");

    expect(result.has("EUR/USD")).toBe(true);
    expect(get).toHaveBeenCalledWith(
      "https://api.twelvedata.com/time_series",
      expect.objectContaining({
        params: expect.objectContaining({
          symbol: "EUR/USD",
          interval: "15min",
          timezone: "UTC",
        }),
      }),
    );
  });
});
