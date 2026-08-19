import { describe, expect, it, vi } from "vitest";

const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM }));

import { generateScannerDecisions } from "./integrations";

describe("strategy-engine structured response contract", () => {
  it("fails explicitly when the model omits a decision instead of creating a fake placeholder", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ decisions: [] }) } }] });
    await expect(generateScannerDecisions({
      rules: "## Trend rule\nFollow the dominant market direction.",
      candidates: [{ asset: "EUR/USD", timeframe: "15MIN", market: { symbol: "EUR/USD", price: 1.1, close: 1.1, interval: "15min", trend: "UP", values: [{ close: "1.1" }], fetchedAt: "2026-08-19T00:00:00Z" } }],
    })).rejects.toThrow("failed after one retry");
    expect(invokeLLM).toHaveBeenCalledTimes(2);
  });
});
