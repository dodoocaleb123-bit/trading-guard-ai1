import { describe, expect, it } from "vitest";
import { buildReplacementKnowledgeModel, buildReplacementKnowledgeModelV3, buildReplacementKnowledgeModelV4, evaluateReplacementIntelligence } from "./replacement-intelligence";
import { calculateMarketContext } from "./market-context";

describe("replacement PDF-derived intelligence", () => {
  const candles = Array.from({ length: 40 }, (_, index) => {
    const close = 1.1 + index * 0.001;
    return { datetime: `2026-08-18 ${String(index).padStart(2, "0")}:00:00`, open: close - 0.0004, high: close + 0.0007, low: close - 0.0006, close, volume: 1000 + index * 50 };
  });

  it("contains source-linked concepts from the combined Forex document", () => {
    const model = buildReplacementKnowledgeModel();
    expect(model.sourceDocument).toBe("Forex trading.docx");
    expect(model.id).toBe("forex-trading-combined-document-v2");
    expect(model.nodes.length).toBeGreaterThan(8);
    expect(model.nodes.some((node) => node.concept.includes("higher peaks"))).toBe(true);
    expect(model.nodes.every((node) => node.source.passage.length > 20)).toBe(true);
  });

  it("builds v3 by retaining every v2 node and adding the new PDF layer", () => {
    const v2 = buildReplacementKnowledgeModel();
    const v3 = buildReplacementKnowledgeModelV3();
    expect(v3.id).toBe("forex-trading-combined-document-v3");
    expect(v3.sourceDocument).toContain("Forex trading.docx");
    expect(v3.sourceDocument).toContain("What_moves_the_currency_market.pdf");
    expect(v3.nodes.length).toBeGreaterThan(v2.nodes.length);
    expect(v2.nodes.every((node) => v3.nodes.some((candidate) => candidate.id === node.id))).toBe(true);
    expect(v3.nodes.some((node) => node.id === "macro-technical-alignment" && node.source.document === "What_moves_the_currency_market.pdf")).toBe(true);
  });

  it("uses verified macro context as additive evidence and does not fabricate it when unavailable", () => {
    const marketContext = calculateMarketContext(candles)!;
    const unavailable = evaluateReplacementIntelligence({ close: candles.at(-1)!.close, interval: "1h", marketContext, fundamentalContext: { status: "UNAVAILABLE", bias: "NEUTRAL", summary: "No verified macro feed" } }, buildReplacementKnowledgeModelV3());
    const available = evaluateReplacementIntelligence({ close: candles.at(-1)!.close, interval: "1h", marketContext, fundamentalContext: { status: "AVAILABLE", bias: "BUY", summary: "Policy and employment context support the currency", eventRisk: "NORMAL" } }, buildReplacementKnowledgeModelV3());
    expect(unavailable.direction).toMatch(/BUY|SELL/);
    expect(unavailable.matchedNodes.some((node) => node.source.document === "What_moves_the_currency_market.pdf")).toBe(false);
    expect(unavailable.adjustments).toContain("Macro/fundamental layer: UNAVAILABLE");
    expect(available.matchedNodes.some((node) => node.id === "macro-technical-alignment")).toBe(true);
    expect(available.sourceTrace.some((source) => source.document === "What_moves_the_currency_market.pdf")).toBe(true);
  });

  it("builds v4 additively with document-derived provenance and bounded context", () => {
    const v3 = buildReplacementKnowledgeModelV3();
    const v4 = buildReplacementKnowledgeModelV4();
    expect(v4.id).toBe("forex-trading-combined-document-v4");
    expect(v4.nodes.length).toBeGreaterThan(v3.nodes.length);
    expect(v4.sourceDocument).toContain("v4 normalized concept catalog");
    expect(v4.nodes.find((node) => node.id === "v4-fibonacci-pullback")?.source.document).toBe("Forex trading.docx");
    const decision = evaluateReplacementIntelligence({ asset: "EUR/USD", close: candles.at(-1)!.close, interval: "1h", marketContext: calculateMarketContext(candles)! }, v4);
    expect(decision.direction).toMatch(/BUY|SELL/);
    expect(decision.matchedNodes.some((node) => node.id === "v4-intermarket-availability")).toBe(true);
    expect(decision.explanation).toContain("Correlated indicators are one evidence family");
  });

  it("constructs candidate evidence from explicit setup indicators first", () => {
    const model = buildReplacementKnowledgeModelV4();
    const decision = evaluateReplacementIntelligence({ asset: "EUR/USD", close: candles.at(-1)!.close, interval: "1h", marketContext: calculateMarketContext(candles)! }, model);
    expect(decision.setupIndicators.length).toBeGreaterThan(0);
    expect(decision.setupIndicators.every((indicator) => indicator.source.document === "Forex trading.docx" || indicator.source.document === "What_moves_the_currency_market.pdf")).toBe(true);
    expect(decision.matchedNodes.map((node) => node.id)).toEqual(decision.setupIndicators.map((indicator) => indicator.id));
    expect(decision.explanation).toContain("source-linked observations");
  });

  it("does not construct a candidate when no setup-indicator catalog is available", () => {
    const model = buildReplacementKnowledgeModelV4();
    expect(() => evaluateReplacementIntelligence({ close: candles.at(-1)!.close, interval: "1h", marketContext: calculateMarketContext(candles)! }, { ...model, nodes: [] })).toThrow("No directional setup indicators detected");
  });

  it("reduces v3 confidence around high-impact events while retaining a direction", () => {
    const marketContext = calculateMarketContext(candles)!;
    const normal = evaluateReplacementIntelligence({ asset: "EUR/USD", close: candles.at(-1)!.close, interval: "1h", marketContext, fundamentalContext: { status: "AVAILABLE", bias: "NEUTRAL", summary: "Verified calendar context", eventRisk: "NORMAL" } }, buildReplacementKnowledgeModelV3());
    const highRisk = evaluateReplacementIntelligence({ asset: "EUR/USD", close: candles.at(-1)!.close, interval: "1h", marketContext, fundamentalContext: { status: "AVAILABLE", bias: "NEUTRAL", summary: "Verified high-impact calendar event", eventRisk: "HIGH" } }, buildReplacementKnowledgeModelV3());
    expect(highRisk.direction).toMatch(/BUY|SELL/);
    expect(highRisk.confidence).toBeLessThan(normal.confidence);
    expect(highRisk.adjustments).toContain("High-impact calendar risk reduced confidence");
  });

  it("makes a paper direction from enriched market context and preserves a source trace", () => {
    const marketContext = calculateMarketContext(candles);
    expect(marketContext?.indicators.rsi14).toBeDefined();
    expect(marketContext?.chartDetails.chartType).toBe("JAPANESE_CANDLESTICK");
    const decision = evaluateReplacementIntelligence({ close: candles.at(-1)!.close, interval: "1h", marketContext: { ...marketContext!, multiTimeframeAlignment: { companionInterval: "15min", structure: "ALIGNED", momentum: "ALIGNED", breakout: "ALIGNED" } } });
    expect(["BUY", "SELL"]).toContain(decision.direction);
    expect(decision.matchedNodes.some((node) => node.id === "moving-average-alignment" || node.id === "oscillator-confirmation" || node.id === "higher-timeframe-alignment")).toBe(true);
    expect(decision.marketRegime).toContain("ALIGNED");
    expect(decision.matchedNodes.length).toBeGreaterThan(0);
    expect(decision.sourceTrace[0]?.document).toBe("Forex trading.docx");
    expect(decision.explanation).toContain("source-linked observations");
    expect(decision.adjustments).toContain("replacement v2");
  });

  it("produces a SELL from bearish structure and momentum instead of a generic BUY fallback", () => {
    const bearishCandles = Array.from({ length: 40 }, (_, index) => {
      const close = 1.2 - index * 0.001;
      return { datetime: `2026-08-18 ${String(index).padStart(2, "0")}:00:00`, open: close + 0.0004, high: close + 0.0006, low: close - 0.0007, close, volume: 1400 + index * 30 };
    });
    const marketContext = calculateMarketContext(bearishCandles);
    const decision = evaluateReplacementIntelligence({ close: bearishCandles.at(-1)!.close, interval: "1h", marketContext: { ...marketContext!, multiTimeframeAlignment: { companionInterval: "15min", structure: "ALIGNED", momentum: "ALIGNED", breakout: "ALIGNED" } } });
    expect(decision.direction).toBe("SELL");
    expect(decision.matchedNodes.some((node) => node.id === "structure-downtrend")).toBe(true);
    expect(decision.explanation).toContain("Downtrend is lower peaks and lower troughs");
  });

  it("applies an accepted lesson with explicit provenance only to its matching context", () => {
    const marketContext = calculateMarketContext(candles)!;
    const lesson = { id: 77, outcome: "LOSS" as const, lessonJson: JSON.stringify({ patternKey: "EUR/USD|1H|BUY", asset: "EUR/USD", timeframe: "1H", lesson: "Repeated BUY losses in this pattern require stronger confirmation.", adaptiveAdjustment: { buyDelta: 0, sellDelta: 1.5 } }) };
    const matched = evaluateReplacementIntelligence({ asset: "EUR/USD", close: candles.at(-1)!.close, interval: "1h", marketContext, acceptedLessons: [lesson] }, buildReplacementKnowledgeModelV3());
    const unmatched = evaluateReplacementIntelligence({ asset: "GBP/USD", close: candles.at(-1)!.close, interval: "1h", marketContext, acceptedLessons: [lesson] }, buildReplacementKnowledgeModelV3());
    expect(matched.sellScore).toBeGreaterThan(unmatched.sellScore);
    expect(matched.adjustments).toContain("Accepted lesson #77");
    expect(unmatched.adjustments).toContain("No accepted lesson adjustments matched");
  });

  it("derives structure-aware levels and preserves at least 1:2 paper geometry", () => {
    const marketContext = calculateMarketContext(candles)!;
    const decision = evaluateReplacementIntelligence({ asset: "EUR/USD", close: candles.at(-1)!.close, interval: "1h", marketContext });
    const risk = Math.abs(decision.entry - decision.stopLoss);
    const reward = decision.direction === "BUY" ? decision.takeProfit - decision.entry : decision.entry - decision.takeProfit;
    expect(risk).toBeGreaterThan(0);
    expect(reward / risk).toBeGreaterThanOrEqual(2);
    expect(decision.decisionTrace.levelDerivation.stopLoss).toContain("Structure invalidation");
    expect(decision.adjustments).toContain("Target/stop geometry");
  });

  it("records early exhaustion evidence after an upward liquidity breakout", () => {
    const base = calculateMarketContext(candles)!;
    const marketContext = {
      ...base,
      breakoutState: "ABOVE_RESISTANCE" as const,
      latestCandle: { ...base.latestCandle, direction: "BEARISH" as const, body: 0.0002, upperWick: 0.002 },
      momentum: { ...base.momentum, direction: "BEARISH" as const },
    };
    const decision = evaluateReplacementIntelligence({ asset: "EUR/USD", close: candles.at(-1)!.close, interval: "1h", marketContext }, buildReplacementKnowledgeModelV3());
    expect(decision.matchedNodes.some((node) => node.concept.includes("fakeout") || node.observation.includes("exhaustion"))).toBe(true);
    expect(decision.explanation).toContain("exhaustion");
  });

  it("documents a source-grounded tie break rather than silently defaulting to BUY", () => {
    const marketContext = calculateMarketContext(candles);
    const decision = evaluateReplacementIntelligence({ close: candles.at(-1)!.close, interval: "1h", marketContext: { ...marketContext!, multiTimeframeAlignment: { companionInterval: "15min", structure: "ALIGNED", momentum: "ALIGNED", breakout: "ALIGNED" } } });
    if (decision.buyScore === decision.sellScore) expect(decision.explanation).toContain("source-grounded tie-break");
  });
});
