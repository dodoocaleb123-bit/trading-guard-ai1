import type { StrategyRule } from "../drizzle/schema";
import type { MarketContext } from "./market-context";

export type IntelligenceTrigger = "MARKET_STRUCTURE" | "MOMENTUM" | "VOLATILITY" | "SUPPORT_RESISTANCE" | "BREAKOUT" | "CANDLE";
export type IntelligenceStance = "BUY" | "SELL" | "NEUTRAL";

export type ExecutableComponent = {
  title: string;
  sourceRuleIds: number[];
  sourceConcept: string;
  trigger: IntelligenceTrigger;
  stance: IntelligenceStance;
  condition: { values: string[]; description: string };
  relationships: { supports: string[]; conflicts: string[]; requires: string[] };
  applicability: { timeframes: string[]; marketStates: string[] };
  weight: number;
};

export type IntelligenceMarket = {
  close: number;
  trend?: "UP" | "DOWN";
  marketContext?: MarketContext | null;
};

export type IntelligenceDecisionTrace = {
  matchedComponents: Array<{ title: string; sourceRuleIds: number[]; sourceConcept: string; trigger: IntelligenceTrigger; stance: IntelligenceStance; weight: number; match: string }>;
  supportingComponents: string[];
  conflictingComponents: string[];
  scoreSummary: { buyScore: number; sellScore: number; dominantDirection: "BUY" | "SELL"; confluenceScore: number };
  levelDerivation: { entry: string; stopLoss: string; takeProfit: string; riskDistance: number; riskReward: number; selectedRiskReward?: number | null; geometryMode?: "RANGE" | "BREAKOUT" | "RANGE_OPPOSING_ZONE" | "BREAKOUT_NEXT_ZONE" | "BREAKOUT_UNCONFIRMED" | "PULLBACK_REACTION" | "LEGACY_2R"; };
};

export type ExecutableJudgment = {
  direction: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  confluenceScore: number;
  ruleEvidence: string[];
  ruleFindings: Array<{ title: string; stance: IntelligenceStance; weight: number }>;
  adjustments: string;
  buyScore: number;
  sellScore: number;
  decisionTrace: IntelligenceDecisionTrace;
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s/-]/g, " ");
}

function inferTrigger(text: string): IntelligenceTrigger {
  if (/breakout|break out|range expansion|resistance break|support break/.test(text)) return "BREAKOUT";
  if (/support|resistance|supply|demand|pivot|retracement|fibonacci/.test(text)) return "SUPPORT_RESISTANCE";
  if (/volatility|atr|average true range|expansion|contraction/.test(text)) return "VOLATILITY";
  if (/momentum|rsi|macd|oscillator|overbought|oversold/.test(text)) return "MOMENTUM";
  if (/candle|candlestick|engulf|pin bar|hammer|doji|wick/.test(text)) return "CANDLE";
  return "MARKET_STRUCTURE";
}

function inferStance(text: string): IntelligenceStance {
  const buy = (text.match(/\b(buy|bullish|long|higher high|uptrend|bounce|support)\b/g) ?? []).length;
  const sell = (text.match(/\b(sell|bearish|short|lower low|downtrend|rejection|resistance)\b/g) ?? []).length;
  if (buy === sell) return "NEUTRAL";
  return buy > sell ? "BUY" : "SELL";
}

function triggerValues(trigger: IntelligenceTrigger, stance: IntelligenceStance) {
  if (trigger === "MARKET_STRUCTURE") return stance === "BUY" ? ["RISING"] : stance === "SELL" ? ["FALLING"] : ["RISING", "FALLING", "RANGE_BOUND"];
  if (trigger === "MOMENTUM") return stance === "BUY" ? ["BULLISH"] : stance === "SELL" ? ["BEARISH"] : ["MIXED"];
  if (trigger === "BREAKOUT") return stance === "BUY" ? ["ABOVE_RESISTANCE"] : stance === "SELL" ? ["BELOW_SUPPORT"] : ["WITHIN_RANGE"];
  if (trigger === "CANDLE") return stance === "BUY" ? ["BULLISH"] : stance === "SELL" ? ["BEARISH"] : ["DOJI"];
  return ["CONTEXTUAL"];
}

export function compileRuleComponent(rule: Pick<StrategyRule, "id" | "title" | "content">): ExecutableComponent {
  const text = normalize(`${rule.title} ${rule.content}`);
  const trigger = inferTrigger(text);
  const stance = inferStance(text);
  const values = triggerValues(trigger, stance);
  const sourceConcept = rule.content.trim().replace(/\s+/g, " ").slice(0, 800);
  const supports = stance === "BUY" ? ["BUY"] : stance === "SELL" ? ["SELL"] : [];
  const conflicts = stance === "BUY" ? ["SELL"] : stance === "SELL" ? ["BUY"] : [];
  const marketStates = trigger === "MARKET_STRUCTURE" ? ["RISING", "FALLING", "RANGE_BOUND"] : trigger === "MOMENTUM" ? ["BULLISH", "BEARISH", "MIXED"] : trigger === "BREAKOUT" ? ["ABOVE_RESISTANCE", "BELOW_SUPPORT", "WITHIN_RANGE"] : ["CONTEXTUAL"];
  return {
    title: rule.title,
    sourceRuleIds: [rule.id],
    sourceConcept,
    trigger,
    stance,
    condition: { values, description: `${trigger} context consistent with ${stance} evidence from source rule.` },
    relationships: { supports, conflicts, requires: [trigger] },
    applicability: { timeframes: ["15MIN", "1H"], marketStates },
    weight: stance === "NEUTRAL" ? 0.5 : 1,
  };
}

export function compileExecutableComponents(rules: Array<Pick<StrategyRule, "id" | "title" | "content">>) {
  return rules.map(compileRuleComponent);
}

export function buildLessonPromotionPlan(lessons: Array<{ id: number; outcome: "WIN" | "LOSS" | "INVALIDATED"; status: string; lessonJson: string }>) {
  const proposed = lessons.filter((lesson) => lesson.status === "PROPOSED" && (lesson.outcome === "WIN" || lesson.outcome === "LOSS"));
  const groups = new Map<string, typeof proposed>();
  for (const lesson of proposed) {
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(lesson.lessonJson) as Record<string, unknown>; } catch { /* use explicit unknown bucket */ }
    const patternKey = typeof parsed.patternKey === "string" ? parsed.patternKey : `UNKNOWN|${lesson.outcome}`;
    const key = `${lesson.outcome}|${patternKey}`;
    groups.set(key, [...(groups.get(key) ?? []), lesson]);
  }
  const patterns = Array.from(groups.entries()).map(([key, group]) => ({ key, outcome: group[0]?.outcome ?? "LOSS", count: group.length, lessonIds: group.map((lesson) => lesson.id), eligible: group.length >= 3 }));
  const eligible = patterns.filter((pattern) => pattern.eligible).flatMap((pattern) => groups.get(pattern.key) ?? []);
  return { eligible, patterns, requiredRepeatedOutcomes: 3, proposedCount: proposed.length, explanation: eligible.length === 0 ? "Collect at least three comparable paper outcomes with the same pattern key before promoting a lesson." : "Repeated comparable paper outcomes are eligible for review; accepted lessons remain paper-only and are applied with provenance." };
}

export function resolveLessonPatternReview(plan: ReturnType<typeof buildLessonPromotionPlan>, input: { outcome: "WIN" | "LOSS"; patternKey: string; decision: "ACCEPT" | "REJECT" }) {
  const pattern = plan.patterns.find((candidate) => candidate.outcome === input.outcome && candidate.key === `${input.outcome}|${input.patternKey}`);
  if (!pattern) return { ok: false as const, error: "Lesson pattern was not found." };
  if (!pattern.eligible) return { ok: false as const, error: "A lesson pattern must contain at least three repeated paper outcomes before review." };
  return { ok: true as const, status: input.decision === "ACCEPT" ? "ACCEPTED" as const : "REJECTED" as const, lessonIds: pattern.lessonIds, pattern };
}

export function buildIntelligenceModel(components: ExecutableComponent[]) {
  return {
    kind: "pdf-derived-trading-intelligence",
    source: "ingested strategy documents",
    concepts: components.map((component) => ({ title: component.title, sourceRuleIds: component.sourceRuleIds, concept: component.sourceConcept, trigger: component.trigger, applicability: component.applicability })),
    relationships: components.map((component) => ({ title: component.title, supports: component.relationships.supports, conflicts: component.relationships.conflicts, requires: component.relationships.requires })),
    decisionProcess: "Evaluate applicable source-linked concepts, reconcile explicit conflicts, choose the stronger BUY or SELL direction, and derive paper-only levels from current market context.",
    learningPolicy: "WIN/LOSS observations remain proposed lessons until repeated paper evidence validates a new intelligence version.",
  };
}

function contextMatches(component: ExecutableComponent, market: IntelligenceMarket) {
  const context = market.marketContext;
  if (!context) return component.trigger === "MARKET_STRUCTURE" && ((component.stance === "BUY" && market.trend === "UP") || (component.stance === "SELL" && market.trend === "DOWN"));
  if (component.trigger === "MARKET_STRUCTURE") return component.stance === "BUY" ? context.marketStructure === "RISING" : component.stance === "SELL" ? context.marketStructure === "FALLING" : context.marketStructure === "RANGE_BOUND";
  if (component.trigger === "MOMENTUM") return component.stance === "BUY" ? context.momentum.direction === "BULLISH" : component.stance === "SELL" ? context.momentum.direction === "BEARISH" : context.momentum.direction === "MIXED";
  if (component.trigger === "BREAKOUT") return component.stance === "BUY" ? context.breakoutState === "ABOVE_RESISTANCE" : component.stance === "SELL" ? context.breakoutState === "BELOW_SUPPORT" : context.breakoutState === "WITHIN_RANGE";
  if (component.trigger === "CANDLE") return component.stance === "BUY" ? context.latestCandle.direction === "BULLISH" : component.stance === "SELL" ? context.latestCandle.direction === "BEARISH" : context.latestCandle.direction === "DOJI";
  if (component.trigger === "SUPPORT_RESISTANCE") {
    const price = market.close;
    const nearSupport = Math.abs(price - context.supportResistance.support) <= context.volatility.atr;
    const nearResistance = Math.abs(price - context.supportResistance.resistance) <= context.volatility.atr;
    return component.stance === "BUY" ? nearSupport : component.stance === "SELL" ? nearResistance : nearSupport || nearResistance;
  }
  return true;
}

export function evaluateExecutableIntelligence(market: IntelligenceMarket, components: ExecutableComponent[]): ExecutableJudgment {
  const active = components.filter((component) => component.stance !== "NEUTRAL" && contextMatches(component, market));
  const buyScore = active.filter((component) => component.stance === "BUY").reduce((sum, component) => sum + component.weight, 0);
  const sellScore = active.filter((component) => component.stance === "SELL").reduce((sum, component) => sum + component.weight, 0);
  const direction: "BUY" | "SELL" = buyScore >= sellScore ? "BUY" : "SELL";
  const dominant = Math.max(buyScore, sellScore);
  const total = buyScore + sellScore;
  const confluenceScore = total ? Math.round((dominant / total) * 100) : 0;
  const confidence = Math.min(94, Math.round(52 + Math.min(38, dominant * 3) + (confluenceScore >= 70 ? 8 : 0)));
  const entry = Number(market.close.toFixed(5));
  const atr = market.marketContext?.volatility.atr ?? Math.abs(entry * 0.0012);
  const risk = Math.max(atr, Math.abs(entry * 0.0012));
  const stopLoss = Number((direction === "BUY" ? entry - risk : entry + risk).toFixed(5));
  const takeProfit = Number((direction === "BUY" ? entry + risk * 2 : entry - risk * 2).toFixed(5));
  const evidence = active.filter((component) => component.stance === direction).slice(0, 8);
  const conflicting = active.filter((component) => component.stance !== direction).slice(0, 8);
  const findings = active.slice(0, 8).map((component) => ({ title: component.title, stance: component.stance, weight: component.weight }));
  const decisionTrace: IntelligenceDecisionTrace = {
    matchedComponents: active.slice(0, 8).map((component) => ({ title: component.title, sourceRuleIds: component.sourceRuleIds, sourceConcept: component.sourceConcept, trigger: component.trigger, stance: component.stance, weight: component.weight, match: component.condition.description })),
    supportingComponents: evidence.map((component) => component.title),
    conflictingComponents: conflicting.map((component) => component.title),
    scoreSummary: { buyScore, sellScore, dominantDirection: direction, confluenceScore },
    levelDerivation: { entry: "Latest raw close rounded to provider precision.", stopLoss: `${direction} stop at one volatility risk distance (${risk}).`, takeProfit: `${direction} target at two volatility risk distances for 1:2 paper geometry.`, riskDistance: risk, riskReward: 2 },
  };
  const adjustments = total === 0
    ? "Executable intelligence selected the better-supported direction from the compiled strategy components, but no component matched the current context; paper validation required."
    : `Executable intelligence selected ${direction} from ${evidence.length} matching source-linked components. Confluence ${confluenceScore}%; paper validation required.`;
  return { direction, entry, stopLoss, takeProfit, confidence, confluenceScore, ruleEvidence: evidence.map((component) => component.title), ruleFindings: findings, adjustments, buyScore, sellScore, decisionTrace };
}
