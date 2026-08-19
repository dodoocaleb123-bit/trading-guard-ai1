export type MarketCandle = {
  datetime?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type MarketContext = {
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
  momentum: {
    change5: number;
    change10: number;
    direction: "BULLISH" | "BEARISH" | "MIXED";
  };
  breakoutState: "ABOVE_RESISTANCE" | "BELOW_SUPPORT" | "WITHIN_RANGE";
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
  const summary = [
    `Market structure: ${marketStructure.toLowerCase().replace("_", " ")}.`,
    `Volatility: ${volatilityRegime.toLowerCase()} with ATR ${round(atr)} (${round(percent(atr, latest.close), 3)}% of price).`,
    `Support: ${supportZone[0]}–${supportZone[1]}; resistance: ${resistanceZone[0]}–${resistanceZone[1]}.`,
    `Latest candle: ${latestDirection.toLowerCase()} with ${round(percent(body, latestRange), 1)}% body-to-range and upper/lower wicks ${round(upperWick)} / ${round(lowerWick)}.`,
    `Recent candles: ${candleStats.bullish} bullish, ${candleStats.bearish} bearish, ${candleStats.doji} doji across ${short.length}.`,
    `Momentum: ${momentumDirection.toLowerCase()} (${round(change5, 3)}% over 5 candles; ${round(change10, 3)}% over 10). Breakout state: ${breakoutState.toLowerCase().replaceAll("_", " ")}.`,
  ].join(" ");
  return {
    sampleSize: candles.length,
    latestCandle: { direction: latestDirection, body: round(body), range: round(latestRange), upperWick: round(upperWick), lowerWick: round(lowerWick), bodyPercentOfRange: round(percent(body, latestRange), 2) },
    recentCandles: { lookback: short.length, bullish: candleStats.bullish, bearish: candleStats.bearish, doji: candleStats.doji, averageBodyPercentOfRange: round((candleStats.bodyPercent / short.length) * 100, 2) },
    marketStructure,
    volatility: { atr: round(atr), atrPercent: round(percent(atr, latest.close), 3), regime: volatilityRegime },
    supportResistance: { lookback: recent.length, support: round(rangeLow), resistance: round(rangeHigh), supportZone, resistanceZone },
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

