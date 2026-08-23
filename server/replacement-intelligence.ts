import type { MarketContext } from "./market-context";
import type { IntelligenceDecisionTrace, IntelligenceStance, IntelligenceTrigger } from "./intelligence";

export type KnowledgeSource = { document: "Forex trading.docx" | "What_moves_the_currency_market.pdf"; section: string; passage: string };
export type KnowledgeNode = {
  id: string;
  concept: string;
  family: "STRUCTURE" | "LEVELS" | "PATTERN" | "INDICATOR" | "VOLUME" | "TIMEFRAME" | "INTERMARKET" | "FUNDAMENTAL" | "RISK";
  rule: string;
  prerequisites: string[];
  conflictsWith: string[];
  source: KnowledgeSource;
};

export type ReplacementKnowledgeModel = {
  id: "forex-trading-combined-document-v2" | "forex-trading-combined-document-v3" | "forex-trading-combined-document-v4";
  sourceDocument: string;
  nodes: KnowledgeNode[];
  decisionPolicy: string;
  learningPolicy: string;
};

export type CalendarEventContext = {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual?: string;
};

export type FundamentalContext = {
  status: "AVAILABLE" | "UNAVAILABLE";
  bias: "BUY" | "SELL" | "NEUTRAL";
  summary: string;
  eventRisk?: "HIGH" | "NORMAL";
  interestRateDifferential?: number | null;
  calendarEvents?: CalendarEventContext[];
  calendarStatus?: "AVAILABLE" | "UNAVAILABLE";
  calendarFetchedAt?: string | null;
};

export type AcceptedLesson = {
  id: number;
  outcome: "WIN" | "LOSS" | "INVALIDATED";
  lessonJson: string;
};

type ParsedAcceptedLesson = {
  id: number;
  patternKey?: string;
  asset?: string;
  timeframe?: string;
  marketRegime?: string;
  buyDelta: number;
  sellDelta: number;
  summary: string;
};

export type ReplacementDecision = {
  direction: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  confluenceScore: number;
  riskReward: number;
  marketRegime: string;
  ruleEvidence: string[];
  ruleFindings: Array<{ title: string; stance: IntelligenceStance; weight: number }>;
  adjustments: string;
  buyScore: number;
  sellScore: number;
  score: { buy: number; sell: number; net: number };
  matchedNodes: Array<KnowledgeNode & { observation: string; contribution: number }>;
  conflicts: string[];
  explanation: string;
  sourceTrace: KnowledgeSource[];
  decisionTrace: IntelligenceDecisionTrace;
  fundamentalContext?: FundamentalContext;
  setupIndicators: SetupIndicator[];
};

export type SetupIndicator = {
  id: string;
  family: KnowledgeNode["family"];
  direction: "BUY" | "SELL" | "NEUTRAL";
  strength: "STRONG" | "MODERATE" | "CONTEXT";
  observation: string;
  contribution: number;
  source: KnowledgeSource;
};

const source = (section: string, passage: string): KnowledgeSource => ({ document: "Forex trading.docx", section, passage });
const macroSource = (section: string, passage: string): KnowledgeSource => ({ document: "What_moves_the_currency_market.pdf", section, passage });

export const FOREX_KNOWLEDGE_NODES: KnowledgeNode[] = [
  { id: "structure-uptrend", concept: "Uptrend is higher peaks and higher troughs", family: "STRUCTURE", rule: "RISING market structure supports BUY", prerequisites: ["marketStructure=RISING"], conflictsWith: ["structure-downtrend"], source: source("Chapter II, 2.2 Types of Trends", "An uptrend is defined as a series of higher peaks and higher troughs.") },
  { id: "structure-downtrend", concept: "Downtrend is lower peaks and lower troughs", family: "STRUCTURE", rule: "FALLING market structure supports SELL", prerequisites: ["marketStructure=FALLING"], conflictsWith: ["structure-uptrend"], source: source("Chapter II, 2.2 Types of Trends", "A downtrend is formed of lower peaks and lower troughs.") },
  { id: "structure-sideways", concept: "Sideways trend has horizontal peaks and troughs", family: "STRUCTURE", rule: "Range-bound structure reduces directional conviction and requires level context", prerequisites: ["marketStructure=RANGE_BOUND"], conflictsWith: [], source: source("Chapter II, 2.2 Types of Trends", "A sideways trend is constituted of many horizontal peaks and troughs, and there is no obvious indication of trend.") },
  { id: "reversal-prior-trend", concept: "Reversal patterns require a prior trend", family: "PATTERN", rule: "Do not treat a reversal pattern as valid without a preceding trend", prerequisites: ["priorTrend"], conflictsWith: [], source: source("Chapter III, 3.3 Chart Patterns", "There must be a prior trend for the formation of a reversal pattern; if it is not preceded by a trend, there can be nothing to reverse.") },
  { id: "reversal-confirmation", concept: "Reversal requires a level violation", family: "PATTERN", rule: "A reversal is stronger after support or resistance breaks", prerequisites: ["breakoutState"], conflictsWith: [], source: source("Chapter III, Reversal Chart Patterns", "The pattern is not complete unless the security breaks the relevant support or resistance level.") },
  { id: "volume-confirmation", concept: "Volume confirms pattern completion", family: "VOLUME", rule: "Pattern and breakout evidence is stronger when volume expands", prerequisites: ["volume.available", "volume.trendConfirmation=CONFIRMED"], conflictsWith: [], source: source("Chapter III, 3.4 Importance of Volume", "The completion of each pattern should be accompanied by certain increase in volume.") },
  { id: "higher-timeframe-first", concept: "Review larger timeframes before a session", family: "TIMEFRAME", rule: "Use opposing timeframe context to qualify lower-timeframe direction", prerequisites: ["multiTimeframeContext"], conflictsWith: [], source: source("Bigger Perspectives", "It is important to start off each trading session by reviewing the larger time frame charts.") },
  { id: "support-resistance", concept: "Support and resistance are decision levels", family: "LEVELS", rule: "Near support favors a BUY reaction; near resistance favors a SELL reaction unless broken", prerequisites: ["supportResistance"], conflictsWith: [], source: source("Chapter II, 2.3 Support and Resistance Levels", "Support and resistance levels define areas where price movement may pause or reverse.") },
  { id: "bollinger-breakout", concept: "Bollinger bands can act as breakout boundaries", family: "INDICATOR", rule: "Band expansion and price outside a band support continuation, not automatic mean reversion", prerequisites: ["indicators.bollinger"], conflictsWith: [], source: source("Bollinger Bandit Trading Strategy", "Bollinger Bands worked better as a breakout indicator than simply as a resistance point.") },
  { id: "momentum-confirmation", concept: "Momentum should agree with direction", family: "INDICATOR", rule: "Aligned momentum and MACD support the corresponding direction", prerequisites: ["momentum", "indicators.macd"], conflictsWith: [], source: source("Chapter IV, Major Technical Indicators", "Indicators are used to help identify and confirm market trend and momentum.") },
  { id: "moving-average-alignment", concept: "Moving averages confirm trend direction", family: "INDICATOR", rule: "Price and shorter moving average alignment should agree with the broader trend", prerequisites: ["indicators.ema20", "indicators.ema50"], conflictsWith: [], source: source("Chapter IV, Major Technical Indicators", "Moving averages help identify the direction of the trend and smooth price action.") },
  { id: "oscillator-confirmation", concept: "Oscillators confirm momentum condition", family: "INDICATOR", rule: "RSI and stochastic alignment qualifies directional momentum without acting alone", prerequisites: ["indicators.rsi14", "indicators.stochastic"], conflictsWith: [], source: source("Chapter IV, Major Technical Indicators", "Oscillators help identify momentum and potential overbought or oversold conditions.") },
  { id: "fakeout-warning", concept: "Fakeouts require caution", family: "PATTERN", rule: "A failed breakout weakens continuation and requires opposing evidence", prerequisites: ["priceAction.breakoutOrFakeout=FAKEOUT"], conflictsWith: [], source: source("Chapter III, Reversal Chart Patterns", "The pattern is not complete unless the security breaks the relevant support or resistance level.") },
  { id: "volatility-regime", concept: "Volatility changes risk conditions", family: "RISK", rule: "Expanding volatility supports confirmed movement but requires measured risk geometry", prerequisites: ["volatility.regime", "atr"], conflictsWith: [], source: source("Chapter 1, Trading in Action", "Trading decisions must account for the cost and risk of the position before entry.") },
  { id: "higher-timeframe-alignment", concept: "Higher timeframe context qualifies direction", family: "TIMEFRAME", rule: "Aligned larger-timeframe structure and momentum strengthen the working direction", prerequisites: ["multiTimeframeAlignment"], conflictsWith: [], source: source("Bigger Perspectives", "It is important to start off each trading session by reviewing the larger time frame charts.") },
  { id: "session-activity", concept: "Higher activity sessions offer more opportunity", family: "TIMEFRAME", rule: "Session activity is context, not a direction by itself", prerequisites: ["timestamp"], conflictsWith: [], source: source("Chapter 1, When?", "The European session is the most active, followed by the American session, while the Asian session is least active.") },
  { id: "currency-relativity", concept: "Common-currency pairs can provide advance context", family: "INTERMARKET", rule: "Related pair movement can qualify a currency direction when synchronized", prerequisites: ["relatedPairs"], conflictsWith: [], source: source("Relativity", "Multiple chart views can show an added dimension of market activity and provide warning of potential movement.") },
  { id: "risk-geometry", concept: "Risk must be defined before a position", family: "RISK", rule: "Every paper outcome requires a finite stop and target derived from observed range/volatility", prerequisites: ["atr"], conflictsWith: [], source: source("Chapter 1, Trading in Action", "Trading decisions must account for the cost and risk of the position before entry.") },
];

export const V4_KNOWLEDGE_NODES: KnowledgeNode[] = [
  { id: "v4-fibonacci-pullback", concept: "Fibonacci retracement is secondary pullback context", family: "LEVELS", rule: "A pullback near a deterministic 38.2%–61.8% swing retracement can qualify an existing structural direction but cannot decide alone", prerequisites: ["supportResistance", "marketStructure"], conflictsWith: ["v4-no-fib-signal"], source: source("Fibonacci Retracement", "Retracement levels are contextual reference points and should be interpreted with the broader trend and other evidence.") },
  { id: "v4-evidence-family-cap", concept: "Correlated indicators are one evidence family", family: "RISK", rule: "Moving averages, oscillators, and band readings must be capped so correlated measurements do not create artificial confluence", prerequisites: ["indicators"], conflictsWith: [], source: source("Chapter IV, Major Technical Indicators", "Indicators help identify and confirm trend and momentum, but a trading plan must avoid conflicting or excessive information.") },
  { id: "v4-intermarket-availability", concept: "Intermarket context is conditional", family: "INTERMARKET", rule: "Related-market evidence is neutral unless timestamp-aligned proxy data is actually available", prerequisites: ["relatedPairs"], conflictsWith: [], source: source("Intermarket Analysis", "Related markets can provide early warnings, but the analysis depends on actual related-market data.") },
  { id: "v4-session-context", concept: "Session activity is a context modifier", family: "TIMEFRAME", rule: "Higher-activity sessions may modify confidence and execution context but never determine direction", prerequisites: ["timestamp"], conflictsWith: [], source: source("Chapter 1, When?", "The European session is described as more active than the American and Asian sessions.") },
];

export const MACRO_FUNDAMENTAL_KNOWLEDGE_NODES: KnowledgeNode[] = [
  { id: "macro-interest-rates", concept: "Interest-rate decisions drive currency demand", family: "FUNDAMENTAL", rule: "A current interest-rate differential or policy surprise can confirm or oppose the technical direction", prerequisites: ["macro.interestRates"], conflictsWith: [], source: macroSource("Fundamentals for long-term trading", "Analysts consider interest rates when forecasting currency markets; interest-rate decisions can indicate changes in the economic environment.") },
  { id: "macro-employment-inflation", concept: "Employment and inflation are major currency catalysts", family: "FUNDAMENTAL", rule: "Current employment and inflation surprises can strengthen or weaken the directional case", prerequisites: ["macro.employment", "macro.inflation"], conflictsWith: [], source: macroSource("Fundamentals for short-term trading", "Economic releases including unemployment and inflation can impact exchange rates rapidly.") },
  { id: "macro-technical-alignment", concept: "Technical and fundamental arguments should align", family: "FUNDAMENTAL", rule: "When fundamental bias agrees with technical structure, confluence improves; disagreement is recorded as a conflict", prerequisites: ["macro.bias", "marketContext"], conflictsWith: [], source: macroSource("Implications for currency trading", "The most successful trading scenarios tend to be supported by both technical/quantitative and fundamental arguments.") },
  { id: "macro-event-reaction", concept: "Economic-release reactions can be rapid and overextended", family: "FUNDAMENTAL", rule: "Near-event conditions require caution because the initial move may overshoot and correct", prerequisites: ["macro.eventRisk"], conflictsWith: [], source: macroSource("Fundamentals for short-term trading", "Exchange-rate adjustment after releases can be very rapid, and reactions beyond the immediate window may reflect overreaction or customer flow.") },
  { id: "macro-carry-trade", concept: "Interest-rate differentials support carry context", family: "FUNDAMENTAL", rule: "Carry context is directional only when current rate differential and risk conditions are available", prerequisites: ["macro.interestDifferential", "macro.riskAppetite"], conflictsWith: [], source: macroSource("Fundamentals for long-term trading", "The carry trade exploits the interest-rate differential between currencies while seeking capital appreciation.") },
];

export function buildReplacementKnowledgeModelV4(): ReplacementKnowledgeModel {
  const v3 = buildReplacementKnowledgeModelV3();
  return {
    ...v3,
    id: "forex-trading-combined-document-v4",
    sourceDocument: "Forex trading.docx + What_moves_the_currency_market.pdf + v4 normalized concept catalog",
    nodes: [...v3.nodes, ...V4_KNOWLEDGE_NODES],
    decisionPolicy: "Evaluate the complete v3 technical, macro, event, exhaustion, setup-identity, and structure-aware risk foundation; add only bounded v4 document-derived context with family caps, preserve conflicts, keep unavailable intermarket data neutral, and emit paper BUY or SELL output with full provenance.",
    learningPolicy: "WIN/LOSS observations remain proposed, source-linked lessons. Only repeated comparable paper outcomes reviewed and accepted by the user may create a rollback-safe v4-derived version.",
  };
}

export function buildReplacementKnowledgeModelV3(): ReplacementKnowledgeModel {
  const base = buildReplacementKnowledgeModel();
  return {
    ...base,
    id: "forex-trading-combined-document-v3",
    sourceDocument: "Forex trading.docx + What_moves_the_currency_market.pdf",
    nodes: [...base.nodes, ...MACRO_FUNDAMENTAL_KNOWLEDGE_NODES],
    decisionPolicy: "Evaluate all combined-document v2 technical, price-action, timeframe, intermarket, and risk concepts first; then incorporate current macro/fundamental evidence from the new PDF layer when available. Preserve conflicts, never fabricate unavailable macro data, select a paper BUY or SELL direction, and remain UNVALIDATED.",
    learningPolicy: "WIN/LOSS observations become structured, source-linked proposals. Only repeated comparable outcomes reviewed and accepted by the user may adjust v3 paper scoring, with pattern matching, provenance, and rollback.",
  };
}

export function buildReplacementKnowledgeModel(): ReplacementKnowledgeModel {
  return {
    id: "forex-trading-combined-document-v2",
    sourceDocument: "Forex trading.docx",
    nodes: FOREX_KNOWLEDGE_NODES,
    decisionPolicy: "Evaluate source-linked structure, levels, patterns, indicators, volume, timeframe, intermarket, and risk concepts; record conflicts; choose the stronger paper direction; never claim validated profitability from a single outcome.",
    learningPolicy: "WIN/LOSS observations are proposed lessons and may only create a new version after repeated comparable paper evidence and user review.",
  };
}

function marketContextMatchesRegime(regime: string, context: MarketContext) {
  const [structure, volatility, breakout] = regime.split("/");
  return (!structure || structure === context.marketStructure) && (!volatility || volatility === context.volatility.regime) && (!breakout || breakout === context.breakoutState);
}

function parseAcceptedLesson(lesson: AcceptedLesson): ParsedAcceptedLesson | null {
  try {
    const parsed = JSON.parse(lesson.lessonJson) as Record<string, unknown>;
    const adjustment = parsed.adaptiveAdjustment as Record<string, unknown> | undefined;
    if (!adjustment) return null;
    const buyDelta = Number(adjustment.buyDelta ?? 0);
    const sellDelta = Number(adjustment.sellDelta ?? 0);
    if (!Number.isFinite(buyDelta) || !Number.isFinite(sellDelta) || (buyDelta === 0 && sellDelta === 0)) return null;
    return {
      id: lesson.id,
      patternKey: typeof parsed.patternKey === "string" ? parsed.patternKey : undefined,
      asset: typeof parsed.asset === "string" ? parsed.asset : undefined,
      timeframe: typeof parsed.timeframe === "string" ? parsed.timeframe : undefined,
      marketRegime: typeof parsed.marketRegime === "string" ? parsed.marketRegime : undefined,
      buyDelta,
      sellDelta,
      summary: typeof parsed.lesson === "string" ? parsed.lesson : typeof parsed.reinforcement === "string" ? parsed.reinforcement : "Accepted lesson adjustment applied.",
    };
  } catch {
    return null;
  }
}

function pricePrecision(asset?: string) {
  return asset === "BTC/USD" ? 2 : asset === "XAU/USD" ? 4 : 5;
}

export const ALLOWED_RISK_REWARD_RATIOS = [3, 2, 1.5, 1] as const;

export function selectAdaptiveRiskReward(riskDistance: number, availableReward: number): number | null {
  if (!Number.isFinite(riskDistance) || riskDistance <= 0 || !Number.isFinite(availableReward) || availableReward <= 0) return null;
  return ALLOWED_RISK_REWARD_RATIOS.find((ratio) => availableReward >= riskDistance * ratio) ?? null;
}

type StructureAwareLevels = {
  stopLoss: number;
  takeProfit: number;
  riskDistance: number;
  riskReward: number;
  selectedRiskReward: number | null;
  stopDescription: string;
  targetDescription: string;
  usedFallbackTarget: boolean;
};

function breakoutIsConfirmed(entry: number, direction: "BUY" | "SELL", context: MarketContext, buffer: number) {
  const isDirectionalBreakout = direction === "BUY"
    ? context.breakoutState === "ABOVE_RESISTANCE" && context.priceAction.breakoutOrFakeout === "BREAKOUT"
    : context.breakoutState === "BELOW_SUPPORT" && context.priceAction.breakoutOrFakeout === "BREAKOUT";
  if (!isDirectionalBreakout) return false;
  const candleAgrees = direction === "BUY" ? context.latestCandle.direction === "BULLISH" : context.latestCandle.direction === "BEARISH";
  const momentumAgrees = direction === "BUY" ? context.momentum.direction === "BULLISH" : context.momentum.direction === "BEARISH";
  const beyondBoundary = direction === "BUY"
    ? entry > context.supportResistance.resistance + buffer
    : entry < context.supportResistance.support - buffer;
  const volumeAgrees = !context.volume.available || context.volume.trendConfirmation === "CONFIRMED";
  return candleAgrees && momentumAgrees && beyondBoundary && context.latestCandle.bodyPercentOfRange >= 35 && volumeAgrees;
}

export function deriveStructureAwareLevels(asset: string | undefined, entry: number, direction: "BUY" | "SELL", context: MarketContext, options: { adaptive?: boolean } = {}): StructureAwareLevels {
  const adaptive = options.adaptive ?? true;
  const precision = pricePrecision(asset);
  const atr = Math.max(0, context.volatility.atr);
  const volatilityFloor = Math.abs(entry * 0.0012);
  const minimumRisk = Math.max(atr, volatilityFloor);
  const buffer = Math.max(atr * 0.25, Math.abs(entry) * 0.0002);
  const structuralStop = direction === "BUY" ? context.supportResistance.support - buffer : context.supportResistance.resistance + buffer;
  const structureDistance = direction === "BUY" ? entry - structuralStop : structuralStop - entry;
  const riskDistance = Math.max(minimumRisk, Number.isFinite(structureDistance) && structureDistance > 0 ? structureDistance : minimumRisk);
  const stopLoss = Number((direction === "BUY" ? entry - riskDistance : entry + riskDistance).toFixed(precision));
  const breakoutStateMatches = adaptive && (direction === "BUY" ? context.breakoutState === "ABOVE_RESISTANCE" : context.breakoutState === "BELOW_SUPPORT");
  const breakoutConfirmed = adaptive && breakoutIsConfirmed(entry, direction, context, buffer);
  const breakoutBoundary = direction === "BUY" ? context.nextResistance : context.nextSupport;
  const rangeBoundary = direction === "BUY" ? context.supportResistance.resistance : context.supportResistance.support;
  const targetBoundary = breakoutStateMatches && breakoutConfirmed ? breakoutBoundary : rangeBoundary;
  const clearance = Math.max(atr * 0.1, Math.abs(entry) * 0.0001);
  const availableReward = targetBoundary == null ? 0 : direction === "BUY" ? targetBoundary - entry - clearance : entry - targetBoundary - clearance;
  const selectedRiskReward = !adaptive ? 2 : breakoutStateMatches && !breakoutConfirmed ? null : selectAdaptiveRiskReward(riskDistance, availableReward);
  const effectiveRiskReward = selectedRiskReward ?? 1;
  const takeProfit = Number((direction === "BUY" ? entry + riskDistance * effectiveRiskReward : entry - riskDistance * effectiveRiskReward).toFixed(precision));
  const breakoutDescription = !adaptive
    ? "Legacy replacement geometry retains the exact 1:2 paper target."
    : breakoutStateMatches
    ? breakoutConfirmed
      ? breakoutBoundary == null ? "Confirmed breakout has no next untouched opposing zone in the supplied history; no target was fabricated." : `Confirmed ${direction === "BUY" ? "bullish" : "bearish"} breakout uses the next untouched opposing zone beyond the broken ${direction === "BUY" ? "resistance" : "support"}.`
      : `Breakout indication is not confirmed by a directional close, momentum, candle body, and available volume; waiting instead of projecting continuation.`
    : "Range-bound geometry uses the nearest opposing support/resistance zone.";
  const ratioDescription = selectedRiskReward == null
    ? `No allowed ratio fits the available cleared space after a ${Number(clearance.toFixed(precision))} clearance buffer; the diagnostic 1:1 level is not eligible for emission.`
    : `Selected the highest cleared allowed ratio of 1:${selectedRiskReward} after a ${Number(clearance.toFixed(precision))} clearance buffer.`;
  return {
    stopLoss,
    takeProfit,
    riskDistance: Number(riskDistance.toFixed(precision)),
    riskReward: effectiveRiskReward,
    selectedRiskReward,
    stopDescription: `Structure invalidation beyond ${direction === "BUY" ? "support" : "resistance"} with ATR buffer ${Number(buffer.toFixed(precision))}; minimum risk floor ${Number(minimumRisk.toFixed(precision))}.`,
    targetDescription: `${breakoutDescription} ${ratioDescription}`,
    usedFallbackTarget: adaptive && selectedRiskReward == null,
  };
}

export function detectSetupIndicators(input: { market: { asset?: string; close: number; interval?: string }; context: MarketContext; fundamentalContext?: FundamentalContext }, model = buildReplacementKnowledgeModel()): SetupIndicator[] {
  const { market, context, fundamentalContext } = input;
  const indicators: SetupIndicator[] = [];
  const add = (id: string, observation: string, contribution: number, strength: SetupIndicator["strength"] = Math.abs(contribution) >= 2 ? "STRONG" : contribution === 0 ? "CONTEXT" : "MODERATE") => {
    const node = model.nodes.find((candidate) => candidate.id === id);
    if (!node) return;
    indicators.push({ id, family: node.family, direction: contribution > 0 ? "BUY" : contribution < 0 ? "SELL" : "NEUTRAL", strength, observation, contribution, source: node.source });
  };
  if (context.marketStructure === "RISING") add("structure-uptrend", "Calculated structure is RISING.", 3);
  if ((model.id === "forex-trading-combined-document-v3" || model.id === "forex-trading-combined-document-v4") && fundamentalContext?.status === "AVAILABLE") {
    if (fundamentalContext.bias === "BUY") add("macro-technical-alignment", `Verified macro context supports BUY: ${fundamentalContext.summary}`, 2);
    if (fundamentalContext.bias === "SELL") add("macro-technical-alignment", `Verified macro context supports SELL: ${fundamentalContext.summary}`, -2);
    if (fundamentalContext.eventRisk === "HIGH") add("macro-event-reaction", "A verified high-impact economic event is active; initial reactions may overshoot and correct.", 0);
    if (fundamentalContext.interestRateDifferential != null) add("macro-interest-rates", `Verified interest-rate differential available: ${fundamentalContext.interestRateDifferential}.`, fundamentalContext.bias === "BUY" ? 1 : fundamentalContext.bias === "SELL" ? -1 : 0);
  }
  if (context.marketStructure === "FALLING") add("structure-downtrend", "Calculated structure is FALLING.", -3);
  if (context.marketStructure === "RANGE_BOUND") add("structure-sideways", "Calculated structure is RANGE_BOUND.", 0);
  if (model.id === "forex-trading-combined-document-v4") {
    const range = context.supportResistance.resistance - context.supportResistance.support;
    const retracement = range > 0 ? (market.close - context.supportResistance.support) / range : 0.5;
    if (retracement >= 0.382 && retracement <= 0.618 && context.marketStructure === "RISING") add("v4-fibonacci-pullback", `Price sits in a deterministic 38.2%–61.8% pullback zone of the calculated range (${retracement.toFixed(3)}).`, 1);
    if (retracement >= 0.382 && retracement <= 0.618 && context.marketStructure === "FALLING") add("v4-fibonacci-pullback", `Price sits in a deterministic 38.2%–61.8% pullback zone of the calculated range (${retracement.toFixed(3)}).`, -1);
    add("v4-evidence-family-cap", "Technical indicators are treated as correlated evidence families rather than independent guarantees.", 0);
    add("v4-intermarket-availability", "No timestamp-aligned related-market proxy was supplied; intermarket evidence remains neutral.", 0);
  }
  const nearSupport = Math.abs(market.close - context.supportResistance.support) <= context.volatility.atr;
  const nearResistance = Math.abs(market.close - context.supportResistance.resistance) <= context.volatility.atr;
  if (nearSupport) add("support-resistance", "Price is within one ATR of calculated support.", 2);
  if (nearResistance) add("support-resistance", "Price is within one ATR of calculated resistance.", -2);
  if (context.momentum.direction === "BULLISH" && context.indicators.macd.histogram > 0) add("momentum-confirmation", "Momentum and MACD histogram are bullish.", 2);
  if (context.momentum.direction === "BEARISH" && context.indicators.macd.histogram < 0) add("momentum-confirmation", "Momentum and MACD histogram are bearish.", -2);
  const emaBullish = market.close > context.indicators.ema20 && context.indicators.ema20 >= context.indicators.ema50;
  const emaBearish = market.close < context.indicators.ema20 && context.indicators.ema20 <= context.indicators.ema50;
  if (emaBullish) add("moving-average-alignment", "Price is above EMA20 and EMA20 is at or above EMA50.", 2);
  if (emaBearish) add("moving-average-alignment", "Price is below EMA20 and EMA20 is at or below EMA50.", -2);
  const oscillatorBullish = context.indicators.rsi14 >= 52 && context.indicators.stochastic.k >= context.indicators.stochastic.d;
  const oscillatorBearish = context.indicators.rsi14 <= 48 && context.indicators.stochastic.k <= context.indicators.stochastic.d;
  if (oscillatorBullish) add("oscillator-confirmation", "RSI14 and stochastic are aligned bullishly.", 1);
  if (oscillatorBearish) add("oscillator-confirmation", "RSI14 and stochastic are aligned bearishly.", -1);
  if (context.volume.trendConfirmation === "CONFIRMED") add("volume-confirmation", "Latest volume is at least 1.1x its recent average.", context.latestCandle.direction === "BULLISH" ? 1 : -1);
  if (context.breakoutState !== "WITHIN_RANGE") add("reversal-confirmation", `${context.breakoutState} confirms a level event.`, context.breakoutState === "ABOVE_RESISTANCE" ? 2 : -2);
  if (context.priceAction.breakoutOrFakeout === "BREAKOUT") add("bollinger-breakout", "Price-action breakout state is confirmed by the snapshot.", context.priceAction.trendDirection === "UP" ? 1 : -1);
  if (context.priceAction.breakoutOrFakeout === "FAKEOUT") add("fakeout-warning", "The latest price-action event is classified as a fakeout; continuation conviction is reduced.", context.priceAction.trendDirection === "UP" ? -2 : 2);
  const bullishBreakoutExhaustion = context.breakoutState === "ABOVE_RESISTANCE" && (context.latestCandle.upperWick > context.latestCandle.body * 1.5 || context.momentum.direction !== "BULLISH" || context.latestCandle.direction === "BEARISH");
  const bearishBreakoutExhaustion = context.breakoutState === "BELOW_SUPPORT" && (context.latestCandle.lowerWick > context.latestCandle.body * 1.5 || context.momentum.direction !== "BEARISH" || context.latestCandle.direction === "BULLISH");
  if (bullishBreakoutExhaustion) add("fakeout-warning", "Upward liquidity breakout shows exhaustion evidence: rejection wick, weakened momentum, or a bearish latest candle.", 2);
  if (bearishBreakoutExhaustion) add("fakeout-warning", "Downward liquidity breakout shows exhaustion evidence: rejection wick, weakened momentum, or a bullish latest candle.", -2);
  if (context.volatility.regime === "EXPANDING" && context.priceAction.breakoutOrFakeout === "BREAKOUT") add("volatility-regime", "Volatility is expanding during a confirmed breakout.", context.priceAction.trendDirection === "UP" ? 1 : -1);
  if (context.volatility.regime === "CONTRACTING") add("volatility-regime", "Volatility is contracting; risk geometry is retained but directional conviction is moderated.", 0);
  const alignment = context.multiTimeframeAlignment;
  if (alignment?.structure === "ALIGNED" && alignment.momentum !== "OPPOSED") add("higher-timeframe-alignment", "Higher-timeframe structure and momentum align with the working direction.", context.marketStructure === "RISING" ? 2 : context.marketStructure === "FALLING" ? -2 : 0);
  if (alignment?.structure === "OPPOSED" || alignment?.momentum === "OPPOSED") add("higher-timeframe-alignment", "Higher-timeframe context opposes the local structure or momentum.", context.marketStructure === "RISING" ? -2 : context.marketStructure === "FALLING" ? 2 : 0);
  return indicators;
}

export function evaluateReplacementIntelligence(market: { asset?: string; close: number; interval?: string; marketContext: MarketContext; fundamentalContext?: FundamentalContext; acceptedLessons?: AcceptedLesson[] }, model = buildReplacementKnowledgeModel()): ReplacementDecision {
  const context = market.marketContext;
  const fundamentalContext = market.fundamentalContext;
  const setupIndicators = detectSetupIndicators({ market, context, fundamentalContext }, model);
  const matched: Array<KnowledgeNode & { observation: string; contribution: number }> = setupIndicators.flatMap((indicator) => {
    const node = model.nodes.find((candidate) => candidate.id === indicator.id);
    return node ? [{ ...node, observation: indicator.observation, contribution: indicator.contribution }] : [];
  });
  const directionalIndicators = setupIndicators.filter((indicator) => indicator.direction !== "NEUTRAL");
  if (!directionalIndicators.length) throw new Error("No directional setup indicators detected");
  const alignment = context.multiTimeframeAlignment;
  let buy = matched.reduce((sum, node) => sum + Math.max(0, node.contribution), 0);
  let sell = matched.reduce((sum, node) => sum + Math.max(0, -node.contribution), 0);
  const lessonAdjustments: string[] = [];
  const appliedLessonPatterns = new Set<string>();
  if (model.id === "forex-trading-combined-document-v3" || model.id === "forex-trading-combined-document-v4") {
    for (const rawLesson of market.acceptedLessons ?? []) {
      const lesson = parseAcceptedLesson(rawLesson);
      if (!lesson) continue;
      const lessonPattern = lesson.patternKey ?? `lesson:${lesson.id}`;
      if (appliedLessonPatterns.has(lessonPattern)) continue;
      if (lesson.asset && market.asset && lesson.asset !== market.asset) continue;
      if (lesson.timeframe && market.interval && lesson.timeframe !== market.interval.toUpperCase()) continue;
      if (lesson.marketRegime && !marketContextMatchesRegime(lesson.marketRegime, context)) continue;
      appliedLessonPatterns.add(lessonPattern);
      buy += lesson.buyDelta;
      sell += lesson.sellDelta;
      lessonAdjustments.push(`Accepted lesson #${lesson.id}: BUY ${lesson.buyDelta >= 0 ? "+" : ""}${lesson.buyDelta}, SELL ${lesson.sellDelta >= 0 ? "+" : ""}${lesson.sellDelta} — ${lesson.summary}`);
    }
  }
  const tieBreakDirection: "BUY" | "SELL" = context.marketStructure === "FALLING" || (context.marketStructure === "RANGE_BOUND" && context.momentum.direction === "BEARISH") || (context.marketStructure === "RANGE_BOUND" && context.latestCandle.direction === "BEARISH") ? "SELL" : "BUY";
  const direction: "BUY" | "SELL" = buy === sell ? tieBreakDirection : buy > sell ? "BUY" : "SELL";
  const tieBreakNote = buy === sell ? `Directional scores tied at ${buy}-${sell}; source-grounded tie-break selected ${direction} from ${context.marketStructure} structure and ${context.momentum.direction} momentum.` : "";
  const conflicts = matched.filter((node) => node.contribution > 0 && direction === "SELL" || node.contribution < 0 && direction === "BUY").map((node) => node.concept);
  const entry = Number(market.close.toFixed(pricePrecision(market.asset)));
  const levels = deriveStructureAwareLevels(market.asset, entry, direction, context, { adaptive: model.id === "forex-trading-combined-document-v4" });
  const risk = levels.riskDistance;
  const stopLoss = levels.stopLoss;
  const takeProfit = levels.takeProfit;
  const dominant = Math.max(buy, sell);
  const total = buy + sell;
  const confluenceScore = total ? Math.round((dominant / total) * 100) : 0;
  const alignmentBonus = alignment?.structure === "ALIGNED" && alignment?.momentum !== "OPPOSED" ? 5 : alignment?.structure === "OPPOSED" || alignment?.momentum === "OPPOSED" ? -4 : 0;
  const conflictPenalty = Math.min(10, conflicts.length * 2);
  const eventRiskPenalty = (model.id === "forex-trading-combined-document-v3" || model.id === "forex-trading-combined-document-v4") && fundamentalContext?.eventRisk === "HIGH" ? 8 : 0;
  const geometryDowngrade = levels.usedFallbackTarget ? 6 : 0;
  const confidence = Math.max(40, Math.min(94, Math.round(50 + Math.min(30, dominant * 3) + (confluenceScore >= 70 ? 7 : 0) + alignmentBonus - conflictPenalty - eventRiskPenalty - geometryDowngrade)));
  const ruleEvidence = matched.filter((node) => Math.sign(node.contribution) === (direction === "BUY" ? 1 : -1)).slice(0, 8).map((node) => `${node.source.section}: ${node.concept}`);
  const ruleFindings = matched.slice(0, 8).map((node) => ({ title: node.concept, stance: node.contribution >= 0 ? "BUY" as const : "SELL" as const, weight: Math.max(1, Math.abs(node.contribution)) }));
  const familyToTrigger = (family: KnowledgeNode["family"]): IntelligenceTrigger => family === "STRUCTURE" ? "MARKET_STRUCTURE" : family === "LEVELS" ? "SUPPORT_RESISTANCE" : family === "PATTERN" ? "BREAKOUT" : family === "INDICATOR" ? "MOMENTUM" : family === "VOLUME" ? "VOLATILITY" : family === "FUNDAMENTAL" ? "CANDLE" : "CANDLE";
  const matchedComponents = matched.slice(0, 8).map((node) => ({ title: node.concept, sourceRuleIds: [], sourceConcept: node.source.passage, trigger: familyToTrigger(node.family), stance: node.contribution >= 0 ? "BUY" as const : "SELL" as const, weight: Math.max(1, Math.abs(node.contribution)), match: node.observation }));
  const explanation = `Replacement PDF-derived intelligence selected ${direction} from ${matched.length} source-linked observations: ${matched.map((node) => `${node.concept} (${node.observation})`).join("; ") || "no matched directional observations"}.${tieBreakNote ? ` ${tieBreakNote}` : ""}${lessonAdjustments.length ? ` Accepted loss-learning adjustments were applied: ${lessonAdjustments.join("; ")}.` : ""}`;
  const decisionTrace: IntelligenceDecisionTrace = {
    matchedComponents,
    supportingComponents: matched.filter((node) => Math.sign(node.contribution) === (direction === "BUY" ? 1 : -1)).map((node) => node.concept),
    conflictingComponents: conflicts,
    scoreSummary: { buyScore: buy, sellScore: sell, dominantDirection: direction, confluenceScore },
    levelDerivation: { entry: "Latest enriched raw close rounded to provider precision.", stopLoss: levels.stopDescription, takeProfit: levels.targetDescription, riskDistance: risk, riskReward: levels.riskReward, selectedRiskReward: levels.selectedRiskReward, geometryMode: context.breakoutState === "WITHIN_RANGE" ? "RANGE" : "BREAKOUT" },
  };
  const marketRegime = `${context.marketStructure}/${context.volatility.regime}/${context.breakoutState}/${alignment?.structure ?? "UNAVAILABLE"}`;
  const macroNote = (model.id === "forex-trading-combined-document-v3" || model.id === "forex-trading-combined-document-v4") ? ` Macro/fundamental layer: ${fundamentalContext?.status === "AVAILABLE" ? fundamentalContext.summary : "UNAVAILABLE; no macro direction was fabricated, so the complete v2 intelligence remains the decision base."}` : "";
  const adjustments = `${explanation} Regime-aware confluence used ${context.marketStructure} structure, ${context.volatility.regime} volatility, ${context.breakoutState} breakout state, EMA/oscillator alignment, and ${alignment?.structure ?? "UNAVAILABLE"} higher-timeframe context.${eventRiskPenalty ? ` High-impact calendar risk reduced confidence by ${eventRiskPenalty} points; event volatility may overshoot and correct.` : ""}${geometryDowngrade ? ` Adaptive target geometry did not qualify an allowed ratio, so confidence was downgraded by ${geometryDowngrade} points and the diagnostic level was not eligible for emission.` : ""} ${conflicts.length ? `Conflicts were retained for audit: ${conflicts.join("; ")}.` : "No opposing source-linked components were matched."}${lessonAdjustments.length ? ` Learning trace: ${lessonAdjustments.join("; ")}.` : " No accepted lesson adjustments matched this context."}${macroNote} Target/stop geometry: ${levels.stopDescription} ${levels.targetDescription} Source-linked replacement ${model.id.endsWith("v4") ? "v4" : model.id.endsWith("v3") ? "v3" : "v2"} is authoritative for this paper outcome; validation remains UNVALIDATED.`;
  return { direction, entry, stopLoss, takeProfit, confidence, confluenceScore, riskReward: levels.riskReward, marketRegime, ruleEvidence, ruleFindings, adjustments, buyScore: buy, sellScore: sell, score: { buy, sell, net: buy - sell }, matchedNodes: matched, conflicts, explanation, sourceTrace: matched.map((node) => node.source), decisionTrace, fundamentalContext, setupIndicators };
}
