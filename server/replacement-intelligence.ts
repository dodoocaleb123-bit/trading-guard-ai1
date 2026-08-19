import type { MarketContext } from "./market-context";
import type { IntelligenceDecisionTrace, IntelligenceStance, IntelligenceTrigger } from "./intelligence";

export type KnowledgeSource = { document: "Forex trading.docx"; section: string; passage: string };
export type KnowledgeNode = {
  id: string;
  concept: string;
  family: "STRUCTURE" | "LEVELS" | "PATTERN" | "INDICATOR" | "VOLUME" | "TIMEFRAME" | "INTERMARKET" | "RISK";
  rule: string;
  prerequisites: string[];
  conflictsWith: string[];
  source: KnowledgeSource;
};

export type ReplacementKnowledgeModel = {
  id: "forex-trading-combined-document-v2";
  sourceDocument: string;
  nodes: KnowledgeNode[];
  decisionPolicy: string;
  learningPolicy: string;
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
};

const source = (section: string, passage: string): KnowledgeSource => ({ document: "Forex trading.docx", section, passage });

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

export function buildReplacementKnowledgeModel(): ReplacementKnowledgeModel {
  return {
    id: "forex-trading-combined-document-v2",
    sourceDocument: "Forex trading.docx",
    nodes: FOREX_KNOWLEDGE_NODES,
    decisionPolicy: "Evaluate source-linked structure, levels, patterns, indicators, volume, timeframe, intermarket, and risk concepts; record conflicts; choose the stronger paper direction; never claim validated profitability from a single outcome.",
    learningPolicy: "WIN/LOSS observations are proposed lessons and may only create a new version after repeated comparable paper evidence and user review.",
  };
}

export function evaluateReplacementIntelligence(market: { close: number; interval?: string; marketContext: MarketContext }, model = buildReplacementKnowledgeModel()): ReplacementDecision {
  const context = market.marketContext;
  const matched: Array<KnowledgeNode & { observation: string; contribution: number }> = [];
  const add = (id: string, observation: string, contribution: number) => {
    const node = model.nodes.find((candidate) => candidate.id === id);
    if (node) matched.push({ ...node, observation, contribution });
  };
  if (context.marketStructure === "RISING") add("structure-uptrend", "Calculated structure is RISING.", 3);
  if (context.marketStructure === "FALLING") add("structure-downtrend", "Calculated structure is FALLING.", -3);
  if (context.marketStructure === "RANGE_BOUND") add("structure-sideways", "Calculated structure is RANGE_BOUND.", 0);
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
  if (context.volatility.regime === "EXPANDING" && context.priceAction.breakoutOrFakeout === "BREAKOUT") add("volatility-regime", "Volatility is expanding during a confirmed breakout.", context.priceAction.trendDirection === "UP" ? 1 : -1);
  if (context.volatility.regime === "CONTRACTING") add("volatility-regime", "Volatility is contracting; risk geometry is retained but directional conviction is moderated.", 0);
  const alignment = context.multiTimeframeAlignment;
  if (alignment?.structure === "ALIGNED" && alignment.momentum !== "OPPOSED") add("higher-timeframe-alignment", "Higher-timeframe structure and momentum align with the working direction.", context.marketStructure === "RISING" ? 2 : context.marketStructure === "FALLING" ? -2 : 0);
  if (alignment?.structure === "OPPOSED" || alignment?.momentum === "OPPOSED") add("higher-timeframe-alignment", "Higher-timeframe context opposes the local structure or momentum.", context.marketStructure === "RISING" ? -2 : context.marketStructure === "FALLING" ? 2 : 0);
  const buy = matched.reduce((sum, node) => sum + Math.max(0, node.contribution), 0);
  const sell = matched.reduce((sum, node) => sum + Math.max(0, -node.contribution), 0);
  const direction: "BUY" | "SELL" = buy >= sell ? "BUY" : "SELL";
  const conflicts = matched.filter((node) => node.contribution > 0 && direction === "SELL" || node.contribution < 0 && direction === "BUY").map((node) => node.concept);
  const entry = Number(market.close.toFixed(5));
  const risk = Math.max(context.volatility.atr, Math.abs(entry * 0.0012));
  const stopLoss = Number((direction === "BUY" ? entry - risk : entry + risk).toFixed(5));
  const takeProfit = Number((direction === "BUY" ? entry + risk * 2 : entry - risk * 2).toFixed(5));
  const dominant = Math.max(buy, sell);
  const total = buy + sell;
  const confluenceScore = total ? Math.round((dominant / total) * 100) : 0;
  const alignmentBonus = alignment?.structure === "ALIGNED" && alignment?.momentum !== "OPPOSED" ? 5 : alignment?.structure === "OPPOSED" || alignment?.momentum === "OPPOSED" ? -4 : 0;
  const conflictPenalty = Math.min(10, conflicts.length * 2);
  const confidence = Math.max(40, Math.min(94, Math.round(50 + Math.min(30, dominant * 3) + (confluenceScore >= 70 ? 7 : 0) + alignmentBonus - conflictPenalty)));
  const ruleEvidence = matched.filter((node) => Math.sign(node.contribution) === (direction === "BUY" ? 1 : -1)).slice(0, 8).map((node) => `${node.source.section}: ${node.concept}`);
  const ruleFindings = matched.slice(0, 8).map((node) => ({ title: node.concept, stance: node.contribution >= 0 ? "BUY" as const : "SELL" as const, weight: Math.max(1, Math.abs(node.contribution)) }));
  const familyToTrigger = (family: KnowledgeNode["family"]): IntelligenceTrigger => family === "STRUCTURE" ? "MARKET_STRUCTURE" : family === "LEVELS" ? "SUPPORT_RESISTANCE" : family === "PATTERN" ? "BREAKOUT" : family === "INDICATOR" ? "MOMENTUM" : family === "VOLUME" ? "VOLATILITY" : "CANDLE";
  const matchedComponents = matched.slice(0, 8).map((node) => ({ title: node.concept, sourceRuleIds: [], sourceConcept: node.source.passage, trigger: familyToTrigger(node.family), stance: node.contribution >= 0 ? "BUY" as const : "SELL" as const, weight: Math.max(1, Math.abs(node.contribution)), match: node.observation }));
  const explanation = `Replacement PDF-derived intelligence selected ${direction} from ${matched.length} source-linked observations: ${matched.map((node) => `${node.concept} (${node.observation})`).join("; ") || "no matched directional observations"}.`;
  const decisionTrace: IntelligenceDecisionTrace = {
    matchedComponents,
    supportingComponents: matched.filter((node) => Math.sign(node.contribution) === (direction === "BUY" ? 1 : -1)).map((node) => node.concept),
    conflictingComponents: conflicts,
    scoreSummary: { buyScore: buy, sellScore: sell, dominantDirection: direction, confluenceScore },
    levelDerivation: { entry: "Latest enriched raw close rounded to provider precision.", stopLoss: `One ATR or 0.12% volatility floor from the replacement risk geometry (${risk}).`, takeProfit: "Two risk distances for 1:2 paper geometry.", riskDistance: risk, riskReward: 2 },
  };
  const marketRegime = `${context.marketStructure}/${context.volatility.regime}/${context.breakoutState}/${alignment?.structure ?? "UNAVAILABLE"}`;
  const adjustments = `${explanation} Regime-aware confluence used ${context.marketStructure} structure, ${context.volatility.regime} volatility, ${context.breakoutState} breakout state, EMA/oscillator alignment, and ${alignment?.structure ?? "UNAVAILABLE"} higher-timeframe context. ${conflicts.length ? `Conflicts were retained for audit: ${conflicts.join("; ")}.` : "No opposing source-linked components were matched."} Source-linked replacement v1 is authoritative for this paper outcome; validation remains UNVALIDATED.`;
  return { direction, entry, stopLoss, takeProfit, confidence, confluenceScore, riskReward: 2, marketRegime, ruleEvidence, ruleFindings, adjustments, buyScore: buy, sellScore: sell, score: { buy, sell, net: buy - sell }, matchedNodes: matched, conflicts, explanation, sourceTrace: matched.map((node) => node.source), decisionTrace };
}
