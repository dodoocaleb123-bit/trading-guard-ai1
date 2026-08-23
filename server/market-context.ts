export type MarketCandle = {
  datetime?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type MarketContext = {
  chartDetails: { chartType: "JAPANESE_CANDLESTICK"; currentCandleStructure: string; previousCandles: string; visiblePatterns: string[] };
  priceAction: { trendDirection: "UP" | "DOWN" | "NEUTRAL_RANGE"; breakoutOrFakeout: "BREAKOUT" | "FAKEOUT" | "NONE"; wickActivity: "LOW" | "MODERATE" | "HIGH" };
  indicators: { ema20: number; ema50: number; rsi14: number; macd: { line: number; signal: number; histogram: number }; stochastic: { k: number; d: number }; bollinger: { middle: number; upper: number; lower: number; bandwidthPercent: number } };
  volume: { available: boolean; latest: number | null; average20: number | null; relativeToAverage: number | null; trendConfirmation: "CONFIRMED" | "NOT_CONFIRMED" | "UNAVAILABLE" };
  sampleSize: number;
  latestCandle: {
    direction: "BULLISH" | "BEARISH" | "DOJI";
    body: number;
    range: number;
    upperWick: number;
    lowerWick: number;
    bodyPercentOfRange: number;
  };
  recentCandles: {
    lookback: number;
    bullish: number;
    bearish: number;
    doji: number;
    averageBodyPercentOfRange: number;
  };
  marketStructure: "RISING" | "FALLING" | "RANGE_BOUND";
  volatility: {
    atr: number;
    atrPercent: number;
    regime: "EXPANDING" | "CONTRACTING" | "STABLE";
  };
  supportResistance: {
    lookback: number;
    support: number;
    resistance: number;
    supportZone: [number, number];
    resistanceZone: [number, number];
  };
  /** Known historical opposing levels outside the active lookback; null means no target zone was observed. */
  nextResistance: number | null;
  nextSupport: number | null;
  momentum: {
    change5: number;
    change10: number;
    direction: "BULLISH" | "BEARISH" | "MIXED";
  };
  breakoutState: "ABOVE_RESISTANCE" | "BELOW_SUPPORT" | "WITHIN_RANGE";
  multiTimeframeAlignment?: { companionInterval: string; structure: "ALIGNED" | "OPPOSED" | "MIXED" | "UNAVAILABLE"; momentum: "ALIGNED" | "OPPOSED" | "MIXED" | "UNAVAILABLE"; breakout: "ALIGNED" | "OPPOSED" | "MIXED" | "UNAVAILABLE" };
  summary: string;
};

function finite(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(value: number, base: number) {
  return base === 0 ? 0 : round((value / base) * 100, 3);
}

function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function ema(values: number[], length: number) {
  if (!values.length) return 0;
  const alpha = 2 / (length + 1);
  return values.reduce((current, value, index) => index === 0 ? value : (value * alpha) + (current * (1 - alpha)), values[0]);
}
function rsi(values: number[], length = 14) {
  if (values.length < 2) return 50;
  const changes = values.slice(1).map((value, index) => value - values[index]);
  const recent = changes.slice(-length);
  const gains = average(recent.filter((value) => value > 0));
  const losses = average(recent.filter((value) => value < 0).map(Math.abs));
  if (losses === 0) return gains === 0 ? 50 : 100;
  return 100 - (100 / (1 + gains / losses));
}

export function parseMarketCandles(values: Array<Record<string, unknown>>): MarketCandle[] {
  return values.flatMap((value) => {
    const open = finite(value.open);
    const high = finite(value.high);
    const low = finite(value.low);
    const close = finite(value.close);
    if (open == null || high == null || low == null || close == null) return [];
    const normalizedHigh = Math.max(open, high, low, close);
    const normalizedLow = Math.min(open, high, low, close);
    return [{ datetime: typeof value.datetime === "string" ? value.datetime : undefined, open, high: normalizedHigh, low: normalizedLow, close, volume: finite(value.volume) ?? undefined }];
  });
}

export function calculateMarketContext(values: Array<Record<string, unknown>>): MarketContext | null {
  const candles = parseMarketCandles(values);
  if (candles.length < 3) return null;
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const recentLookback = Math.min(20, candles.length);
  const recent = candles.slice(-recentLookback);
  const shortLookback = Math.min(10, candles.length);
  const short = candles.slice(-shortLookback);
  const latestRange = Math.max(0, latest.high - latest.low);
  const body = Math.abs(latest.close - latest.open);
  const latestDirection = body <= latestRange * 0.1 ? "DOJI" : latest.close >= latest.open ? "BULLISH" : "BEARISH";
  const upperWick = Math.max(0, latest.high - Math.max(latest.open, latest.close));
  const lowerWick = Math.max(0, Math.min(latest.open, latest.close) - latest.low);
  const candleStats = short.reduce((stats, candle) => {
    const range = Math.max(0, candle.high - candle.low);
    const candleBody = Math.abs(candle.close - candle.open);
    if (candleBody <= range * 0.1) stats.doji += 1;
    else if (candle.close >= candle.open) stats.bullish += 1;
    else stats.bearish += 1;
    stats.bodyPercent += range === 0 ? 0 : candleBody / range;
    return stats;
  }, { bullish: 0, bearish: 0, doji: 0, bodyPercent: 0 });
  const trueRanges = recent.map((candle, index) => {
    const prior = index === 0 ? candle : recent[index - 1];
    return Math.max(candle.high - candle.low, Math.abs(candle.high - prior.close), Math.abs(candle.low - prior.close));
  });
  const atr = trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
  const priorWindow = candles.slice(Math.max(0, candles.length - recentLookback * 2), Math.max(0, candles.length - recentLookback));
  const priorAtr = priorWindow.length ? priorWindow.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / priorWindow.length : atr;
  const rangeHigh = Math.max(...recent.map((candle) => candle.high));
  const rangeLow = Math.min(...recent.map((candle) => candle.low));
  const priorCandles = candles.slice(0, Math.max(0, candles.length - recentLookback));
  const nextResistance = priorCandles.filter((candle) => candle.high > rangeHigh).reduce<number | null>((nearest, candle) => nearest == null ? candle.high : Math.min(nearest, candle.high), null);
  const nextSupport = priorCandles.filter((candle) => candle.low < rangeLow).reduce<number | null>((nearest, candle) => nearest == null ? candle.low : Math.max(nearest, candle.low), null);
  const rangeSize = Math.max(rangeHigh - rangeLow, Math.abs(latest.close) * 0.000001);
  const supportZone: [number, number] = [round(rangeLow), round(rangeLow + rangeSize * 0.2)];
  const resistanceZone: [number, number] = [round(rangeHigh - rangeSize * 0.2), round(rangeHigh)];
  const firstRecent = recent[0];
  const slope = latest.close - firstRecent.close;
  const normalizedSlope = Math.abs(slope) / rangeSize;
  const positionInRange = (latest.close - rangeLow) / rangeSize;
  const marketStructure: MarketContext["marketStructure"] = normalizedSlope < 0.25 && positionInRange > 0.2 && positionInRange < 0.8 ? "RANGE_BOUND" : slope >= 0 ? "RISING" : "FALLING";
  const change5 = percent(latest.close - candles[Math.max(0, candles.length - 6)].close, candles[Math.max(0, candles.length - 6)].close);
  const change10 = percent(latest.close - candles[Math.max(0, candles.length - 11)].close, candles[Math.max(0, candles.length - 11)].close);
  const momentumDirection = change5 > 0.05 && change10 > 0.05 ? "BULLISH" : change5 < -0.05 && change10 < -0.05 ? "BEARISH" : "MIXED";
  const breakoutState: MarketContext["breakoutState"] = latest.close > resistanceZone[1] ? "ABOVE_RESISTANCE" : latest.close < supportZone[0] ? "BELOW_SUPPORT" : "WITHIN_RANGE";
  const volatilityRegime = atr > priorAtr * 1.15 ? "EXPANDING" : atr < priorAtr * 0.85 ? "CONTRACTING" : "STABLE";
  const closes = candles.map((candle) => candle.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12 - ema26;
  const macdHistory = closes.slice(0, -1).map((_, index) => ema(closes.slice(0, index + 1), 12) - ema(closes.slice(0, index + 1), 26)).slice(-9);
  const macdSignal = ema([...macdHistory, macdLine], 9);
  const lowest14 = Math.min(...candles.slice(-14).map((candle) => candle.low));
  const highest14 = Math.max(...candles.slice(-14).map((candle) => candle.high));
  const stochasticK = highest14 === lowest14 ? 50 : ((latest.close - lowest14) / (highest14 - lowest14)) * 100;
  const stochasticD = average(candles.slice(-3).map((candle) => highest14 === lowest14 ? 50 : ((candle.close - lowest14) / (highest14 - lowest14)) * 100));
  const bollingerWindow = closes.slice(-20);
  const bollingerMiddle = average(bollingerWindow);
  const standardDeviation = Math.sqrt(average(bollingerWindow.map((value) => (value - bollingerMiddle) ** 2)));
  const bollingerUpper = bollingerMiddle + standardDeviation * 2;
  const bollingerLower = bollingerMiddle - standardDeviation * 2;
  const volumeValues = recent.map((candle) => candle.volume).filter((value): value is number => value != null);
  const averageVolume = volumeValues.length ? average(volumeValues) : null;
  const latestVolume = latest.volume ?? null;
  const relativeVolume = latestVolume != null && averageVolume ? latestVolume / averageVolume : null;
  const volumeTrendConfirmation = relativeVolume == null ? "UNAVAILABLE" : relativeVolume >= 1.1 ? "CONFIRMED" : "NOT_CONFIRMED";
  const wickRatio = latestRange === 0 ? 0 : (upperWick + lowerWick) / latestRange;
  const wickActivity = wickRatio > 0.65 ? "HIGH" : wickRatio > 0.3 ? "MODERATE" : "LOW";
  const breakoutOrFakeout = breakoutState === "WITHIN_RANGE" ? "NONE" : (latestDirection === "BULLISH" && breakoutState === "ABOVE_RESISTANCE") || (latestDirection === "BEARISH" && breakoutState === "BELOW_SUPPORT") ? "BREAKOUT" : "FAKEOUT";
  const previousCandles = `${candleStats.bullish} bullish, ${candleStats.bearish} bearish, ${candleStats.doji} doji across the previous ${short.length} candles`;
  const currentCandleStructure = `${latestDirection.toLowerCase()} candle with ${round(percent(body, latestRange), 1)}% body-to-range and upper/lower wicks ${round(upperWick)} / ${round(lowerWick)}`;
  const visiblePatterns = [marketStructure === "RANGE_BOUND" ? "RANGE_CONSOLIDATION" : null, breakoutOrFakeout === "BREAKOUT" ? "BREAKOUT" : null, latestDirection === "DOJI" ? "DOJI" : null, lowerWick > body * 1.5 ? "LOWER_WICK_REJECTION" : null, upperWick > body * 1.5 ? "UPPER_WICK_REJECTION" : null].filter((value): value is string => value != null);
  const summary = [
    `Market structure: ${marketStructure.toLowerCase().replace("_", " ")}.`,
    `Volatility: ${volatilityRegime.toLowerCase()} with ATR ${round(atr)} (${round(percent(atr, latest.close), 3)}% of price).`,
    `Support: ${supportZone[0]}–${supportZone[1]}; resistance: ${resistanceZone[0]}–${resistanceZone[1]}.`,
    `Latest candle: ${latestDirection.toLowerCase()} with ${round(percent(body, latestRange), 1)}% body-to-range and upper/lower wicks ${round(upperWick)} / ${round(lowerWick)}.`,
    `Recent candles: ${candleStats.bullish} bullish, ${candleStats.bearish} bearish, ${candleStats.doji} doji across ${short.length}.`,
    `Momentum: ${momentumDirection.toLowerCase()} (${round(change5, 3)}% over 5 candles; ${round(change10, 3)}% over 10). Breakout state: ${breakoutState.toLowerCase().replaceAll("_", " ")}.`,
    `EMA20/EMA50: ${round(ema20)} / ${round(ema50)}; RSI14: ${round(rsi(closes), 2)}; MACD histogram: ${round(macdLine - macdSignal)}; Bollinger bandwidth: ${round(percent(bollingerUpper - bollingerLower, bollingerMiddle), 2)}%.`,
    `Volume: ${volumeTrendConfirmation.toLowerCase()}${relativeVolume == null ? "" : ` at ${round(relativeVolume, 2)}x average`}. Wick activity: ${wickActivity.toLowerCase()}.`,
  ].join(" ");
  return {
    chartDetails: { chartType: "JAPANESE_CANDLESTICK", currentCandleStructure, previousCandles, visiblePatterns },
    priceAction: { trendDirection: marketStructure === "RISING" ? "UP" : marketStructure === "FALLING" ? "DOWN" : "NEUTRAL_RANGE", breakoutOrFakeout, wickActivity },
    indicators: { ema20: round(ema20), ema50: round(ema50), rsi14: round(rsi(closes), 2), macd: { line: round(macdLine), signal: round(macdSignal), histogram: round(macdLine - macdSignal) }, stochastic: { k: round(stochasticK, 2), d: round(stochasticD, 2) }, bollinger: { middle: round(bollingerMiddle), upper: round(bollingerUpper), lower: round(bollingerLower), bandwidthPercent: round(percent(bollingerUpper - bollingerLower, bollingerMiddle), 3) } },
    volume: { available: volumeValues.length > 0, latest: latestVolume == null ? null : round(latestVolume), average20: averageVolume == null ? null : round(averageVolume), relativeToAverage: relativeVolume == null ? null : round(relativeVolume, 3), trendConfirmation: volumeTrendConfirmation },
    sampleSize: candles.length,
    latestCandle: { direction: latestDirection, body: round(body), range: round(latestRange), upperWick: round(upperWick), lowerWick: round(lowerWick), bodyPercentOfRange: round(percent(body, latestRange), 2) },
    recentCandles: { lookback: short.length, bullish: candleStats.bullish, bearish: candleStats.bearish, doji: candleStats.doji, averageBodyPercentOfRange: round((candleStats.bodyPercent / short.length) * 100, 2) },
    marketStructure,
    volatility: { atr: round(atr), atrPercent: round(percent(atr, latest.close), 3), regime: volatilityRegime },
    supportResistance: { lookback: recent.length, support: round(rangeLow), resistance: round(rangeHigh), supportZone, resistanceZone },
    nextResistance: nextResistance == null ? null : round(nextResistance),
    nextSupport: nextSupport == null ? null : round(nextSupport),
    momentum: { change5: round(change5, 3), change10: round(change10, 3), direction: momentumDirection },
    breakoutState,
    summary,
  };
}

export function buildMultiTimeframeContext(contexts: Array<{ interval: string; context: MarketContext | null }>, currentInterval: string) {
  return contexts.filter((item) => item.interval !== currentInterval && item.context).map((item) => `${item.interval}: ${item.context?.summary}`).join("\n") || "No additional timeframe context available.";
}

export function formatMarketContextForPrompt(context: MarketContext | null, multiTimeframeContext = "") {
  if (!context) return "No derived context available; use the raw OHLCV values directly.";
  return JSON.stringify({ ...context, multiTimeframeContext }, null, 2);
}

