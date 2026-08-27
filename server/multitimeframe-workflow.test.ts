import { describe, expect, it } from "vitest";
import { calculateMarketContext } from "./market-context";
import { buildReplacementKnowledgeModelV5 } from "./replacement-intelligence";
import { evaluateHierarchicalWorkflow } from "./multitimeframe-workflow";

const candle = (open: number, high: number, low: number, close: number, datetime: string) => ({ open: String(open), high: String(high), low: String(low), close: String(close), datetime });
const series = (interval: "4h" | "1h" | "15min", values: Array<Record<string, unknown>>) => ({ interval, values, close: Number(values.at(-1)?.close), marketContext: calculateMarketContext(values) });

function risingContextValues(count = 40) {
  return Array.from({ length: count }, (_, index) => candle(90 + index, 91 + index, 89.5 + index, 90.8 + index, `2026-08-27 ${String(index).padStart(2, "0")}:00:00`));
}

function qualifiedEntryValues() {
  const values = Array.from({ length: 12 }, (_, index) => candle(99.4 + index * 0.02, 99.7 + index * 0.02, 99.2 + index * 0.02, 99.5 + index * 0.02, `2026-08-27 00:${String(index).padStart(2, "2")}:00`));
  values.push(candle(99.8, 100.0, 99.5, 99.9, "2026-08-27 00:12:00"));
  values.push(candle(99.9, 102.2, 99.7, 101.9, "2026-08-27 00:13:00"));
  values.push(candle(99.8, 100.2, 99.7, 100.0, "2026-08-27 00:14:00"));
  values.push(candle(99.7, 100.1, 99.6, 99.9, "2026-08-27 00:15:00"));
  values.push(candle(104.8, 105.1, 104.3, 104.6, "2026-08-27 00:16:00"));
  values.push(candle(104.6, 104.8, 101.3, 101.5, "2026-08-27 00:17:00"));
  values.push(candle(104.4, 104.9, 104.2, 104.5, "2026-08-27 00:18:00"));
  values.push(candle(104.5, 104.7, 103.8, 104.0, "2026-08-27 00:19:00"));
  values.push(candle(100.0, 100.2, 99.8, 100.05, "2026-08-27 00:20:00"));
  values.push(candle(100.0, 100.15, 99.2, 99.95, "2026-08-27 00:21:00"));
  values.push(candle(99.9, 100.0, 98.9, 99.95, "2026-08-27 00:22:00"));
  return values;
}

describe("hierarchical supply-and-demand workflow", () => {
  it("qualifies a direction only after 4H/1H alignment, validated zones, and 15M confirmation", () => {
    const fourHour = series("4h", risingContextValues());
    const oneHour = series("1h", risingContextValues());
    const fifteenMinute = series("15min", qualifiedEntryValues());
    const decision = evaluateHierarchicalWorkflow({ asset: "EUR/USD", timeframe: "15MIN", primary: fifteenMinute, series4h: fourHour, series1h: oneHour, series15m: fifteenMinute, fundamentalContext: undefined, acceptedLessons: [] }, buildReplacementKnowledgeModelV5());

    expect(decision.workflow.dominant4h).toBe("BUY");
    expect(decision.workflow.trend1h).toBe("BUY");
    expect(decision.workflow.zones.filter((zone) => zone.kind === "DEMAND").length).toBeGreaterThan(0);
    expect(decision.workflow.zones.filter((zone) => zone.kind === "SUPPLY").length).toBeGreaterThan(0);
    expect(decision.workflow.confirmation.kind).toBe("REJECTION");
    expect(decision.workflow.confirmation.direction).toBe("BUY");
    expect(decision.workflow.eligible).toBe(true);
    expect(decision.takeProfit).not.toBeNull();
    expect(decision.stopLoss).not.toBeNull();
    expect(decision.riskReward).toBeGreaterThan(0);
    expect(decision.decisionTrace.levelDerivation.takeProfit).toContain("opposing supply");
  });

  it("waits instead of forcing a trade when no validated opposing zone has 30-pip clearance", () => {
    const fourHour = series("4h", risingContextValues());
    const oneHour = series("1h", risingContextValues());
    const entry = series("15min", qualifiedEntryValues().map((raw) => ({ ...raw, high: "100.10", low: "99.00" })));
    const decision = evaluateHierarchicalWorkflow({ asset: "EUR/USD", timeframe: "15MIN", primary: entry, series4h: fourHour, series1h: oneHour, series15m: entry, fundamentalContext: undefined, acceptedLessons: [] }, buildReplacementKnowledgeModelV5());

    expect(decision.workflow.eligible).toBe(false);
    expect(decision.workflow.status).toBe("WAITING");
    expect(decision.workflow.explanation).toContain("30 pips");
    expect(decision.takeProfit).not.toBeNull();
  });
});
