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

  it("evaluates each snapshot in an independent single-candidate call", async () => {
    invokeLLM.mockClear();
    let callIndex = 0;
    invokeLLM.mockImplementation(async () => {
      const candidate = callIndex++ === 0
        ? { asset: "EUR/USD", timeframe: "15MIN", market: { close: 1.1 } }
        : { asset: "GBP/USD", timeframe: "1H", market: { close: 1.2 } };
      return { choices: [{ message: { content: [{ type: "text", text: JSON.stringify({ decisions: [{ asset: candidate.asset, timeframe: candidate.timeframe, verdict: "DENIED", confidence: 60, adjustments: "Evidence is recorded for paper validation.", direction: "BUY", entry: candidate.market.close, stopLoss: candidate.market.close - 0.001, takeProfit: candidate.market.close + 0.002, ruleEvidence: ["Trend rule"], ruleFindings: [{ title: "Trend rule", stance: "BUY", weight: 3 }] }] }) }] } }] };
    });
    const result = await generateScannerDecisions({ rules: "## Trend rule\\nFollow the dominant market direction.", candidates: [
      { asset: "EUR/USD", timeframe: "15MIN", market: { symbol: "EUR/USD", price: 1.1, close: 1.1, interval: "15min", trend: "UP", values: [{ close: "1.1" }], fetchedAt: "2026-08-19T00:00:00Z" } },
      { asset: "GBP/USD", timeframe: "1H", market: { symbol: "GBP/USD", price: 1.2, close: 1.2, interval: "1h", trend: "DOWN", values: [{ close: "1.2" }], fetchedAt: "2026-08-19T00:00:00Z" } },
    ] });
    expect(result).toHaveLength(2);
    expect(result.metrics).toEqual({ snapshots: 2, completeResponses: 2, retries: 0 });
    expect(invokeLLM).toHaveBeenCalledTimes(2);
    expect(invokeLLM.mock.calls.every(([params]: any[]) => params.maxTokens === 2048)).toBe(true);
  });
});
