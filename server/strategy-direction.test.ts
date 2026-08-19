import { describe, expect, it, vi } from "vitest";

const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM }));

import { generateScannerDecisions } from "./integrations";

describe("strategy-engine mandatory directional judgment", () => {
  it("creates a directional audit outcome for every raw snapshot when the model omits decisions", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ decisions: [] }) } }] });
    const result = await generateScannerDecisions({
      rules: "## Trend rule\nFollow the dominant market direction.",
      candidates: [{ asset: "EUR/USD", timeframe: "15MIN", market: { symbol: "EUR/USD", price: 1.1, close: 1.1, interval: "15min", trend: "UP", values: [{ close: "1.1" }], fetchedAt: "2026-08-19T00:00:00Z" } }],
    });
    expect(result).toHaveLength(1);
    expect(["BUY", "SELL"]).toContain(result[0].direction);
    expect(result[0].entry).toBeTypeOf("number");
    expect(result[0].stopLoss).toBeTypeOf("number");
    expect(result[0].takeProfit).toBeTypeOf("number");
    expect(result[0].verdict).toBe("DENIED");
    expect(result[0].validationStatus).toBe("UNVALIDATED");
  });
});
