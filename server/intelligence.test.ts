import { describe, expect, it } from "vitest";
import { buildIntelligenceModel, buildLessonPromotionPlan, compileExecutableComponents, evaluateExecutableIntelligence, resolveLessonPatternReview } from "./intelligence";

describe("executable trading intelligence", () => {
  it("compiles source rules into executable components with provenance", () => {
    const components = compileExecutableComponents([
      { id: 1, title: "Rising structure BUY", content: "Buy when the market forms higher highs and bullish momentum." },
      { id: 2, title: "Falling structure SELL", content: "Sell when the market forms lower lows and bearish momentum." },
    ]);
    expect(components).toHaveLength(2);
    expect(components[0].sourceRuleIds).toEqual([1]);
    expect(components[0].stance).toBe("BUY");
    expect(components[1].stance).toBe("SELL");
    expect(components[0].sourceConcept).toContain("Buy");
    expect(components[0].relationships.conflicts).toContain("SELL");
    expect(components[0].applicability.timeframes).toEqual(["15MIN", "1H"]);
    const model = buildIntelligenceModel(components);
    expect(model.concepts).toHaveLength(2);
    expect(model.relationships[0].supports).toContain("BUY");
    expect(model.learningPolicy).toContain("WIN/LOSS");
  });

  it("does not promote a lesson until three comparable paper outcomes exist", () => {
    const lesson = (id: number, outcome: "WIN" | "LOSS", patternKey = "EUR/USD|1H|RISING/STABLE/WITHIN_RANGE|BUY") => ({ id, outcome, status: "PROPOSED", lessonJson: JSON.stringify({ outcome, patternKey }) });
    expect(buildLessonPromotionPlan([lesson(1, "WIN"), lesson(2, "WIN")]).eligible).toHaveLength(0);
    const plan = buildLessonPromotionPlan([lesson(1, "WIN"), lesson(2, "WIN"), lesson(3, "WIN")]);
    expect(plan.eligible.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(plan.patterns[0]).toMatchObject({ count: 3, eligible: true });
    expect(plan.explanation).toContain("Repeated comparable paper outcomes");
  });

  it("accepts or rejects only an eligible recurring lesson pattern", () => {
    const lesson = (id: number, status = "PROPOSED", patternKey = "EUR/USD|1H|RISING/STABLE/WITHIN_RANGE|BUY") => ({ id, outcome: "LOSS" as const, status, lessonJson: JSON.stringify({ patternKey }) });
    const eligiblePlan = buildLessonPromotionPlan([lesson(1), lesson(2), lesson(3)]);
    expect(resolveLessonPatternReview(eligiblePlan, { outcome: "LOSS", patternKey: "EUR/USD|1H|RISING/STABLE/WITHIN_RANGE|BUY", decision: "ACCEPT" })).toMatchObject({ ok: true, status: "ACCEPTED", lessonIds: [1, 2, 3] });
    expect(resolveLessonPatternReview(eligiblePlan, { outcome: "LOSS", patternKey: "EUR/USD|1H|RISING/STABLE/WITHIN_RANGE|BUY", decision: "REJECT" })).toMatchObject({ ok: true, status: "REJECTED" });
    const incompletePlan = buildLessonPromotionPlan([lesson(1), lesson(2)]);
    expect(resolveLessonPatternReview(incompletePlan, { outcome: "LOSS", patternKey: "EUR/USD|1H|RISING/STABLE/WITHIN_RANGE|BUY", decision: "ACCEPT" })).toMatchObject({ ok: false, error: expect.stringContaining("three repeated") });
  });

  it("selects the better-supported direction from matching compiled components", () => {
    const components = compileExecutableComponents([
      { id: 1, title: "Rising structure BUY", content: "Buy in a rising market structure." },
      { id: 2, title: "Bullish momentum BUY", content: "Buy when momentum is bullish." },
      { id: 3, title: "Falling structure SELL", content: "Sell in a falling market structure." },
    ]);
    const result = evaluateExecutableIntelligence({
      close: 100,
      trend: "UP",
      marketContext: {
        sampleSize: 30,
        latestCandle: { direction: "BULLISH", body: 1, range: 2, upperWick: 0.5, lowerWick: 0.5, bodyPercentOfRange: 50 },
        recentCandles: { lookback: 10, bullish: 7, bearish: 3, doji: 0, averageBodyPercentOfRange: 40 },
        marketStructure: "RISING",
        volatility: { atr: 1, atrPercent: 1, regime: "STABLE" },
        supportResistance: { lookback: 20, support: 98, resistance: 104, supportZone: [98, 99], resistanceZone: [103, 104] },
        momentum: { change5: 0.5, change10: 0.8, direction: "BULLISH" },
        breakoutState: "WITHIN_RANGE",
        summary: "rising and bullish",
      },
    }, components);
    expect(result.direction).toBe("BUY");
    expect(result.ruleEvidence.length).toBeGreaterThan(0);
    expect(result.entry).toBe(100);
    expect(result.takeProfit).toBeGreaterThan(result.entry);
  });
});
