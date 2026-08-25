import { parseMarketCandles, type MarketCandle, type MarketContext } from "./market-context";

export type DocumentPatternIndicator = {
  id: string;
  direction: "BUY" | "SELL";
  observation: string;
  contribution: number;
};

const body = (candle: MarketCandle) => Math.abs(candle.close - candle.open);
const range = (candle: MarketCandle) => Math.max(candle.high - candle.low, Number.EPSILON);
const bullish = (candle: MarketCandle) => candle.close > candle.open;
const bearish = (candle: MarketCandle) => candle.close < candle.open;

function hasBullishEngulfing(previous: MarketCandle, latest: MarketCandle) {
  return bearish(previous) && bullish(latest) && latest.open <= previous.close && latest.close >= previous.open;
}

function hasBearishEngulfing(previous: MarketCandle, latest: MarketCandle) {
  return bullish(previous) && bearish(latest) && latest.open >= previous.close && latest.close <= previous.open;
}

function hasBullishHarami(previous: MarketCandle, latest: MarketCandle) {
  return bearish(previous) && bullish(latest) && body(latest) < body(previous) && latest.open >= previous.close && latest.close <= previous.open;
}

function hasBearishHarami(previous: MarketCandle, latest: MarketCandle) {
  return bullish(previous) && bearish(latest) && body(latest) < body(previous) && latest.open <= previous.close && latest.close >= previous.open;
}

function findDoublePattern(candles: MarketCandle[], context: MarketContext): DocumentPatternIndicator | null {
  if (candles.length < 7) return null;
  const window = candles.slice(-7);
  const tolerance = Math.max(context.volatility.atr * 0.75, Math.abs(window[6].close) * 0.00025);
  const highs = window.map((candle) => candle.high);
  const lows = window.map((candle) => candle.low);
  const leftHigh = Math.max(...highs.slice(0, 3));
  const rightHigh = Math.max(...highs.slice(4));
  const middleLow = Math.min(...lows.slice(2, 5));
  const leftLow = Math.min(...lows.slice(0, 3));
  const rightLow = Math.min(...lows.slice(4));
  const middleHigh = Math.max(...highs.slice(2, 5));
  const latest = window[6];
  const topTolerance = Math.abs(leftHigh - rightHigh) <= tolerance;
  const bottomTolerance = Math.abs(leftLow - rightLow) <= tolerance;
  if (topTolerance && middleLow < Math.min(leftHigh, rightHigh) - tolerance && latest.close < middleLow) {
    return { id: "double-top", direction: "SELL", contribution: 3, observation: `Confirmed double-top structure: two comparable highs near ${rightHigh.toFixed(5)} followed by a close below the intervening support near ${middleLow.toFixed(5)}.` };
  }
  if (bottomTolerance && middleHigh > Math.max(leftLow, rightLow) + tolerance && latest.close > middleHigh) {
    return { id: "double-bottom", direction: "BUY", contribution: 3, observation: `Confirmed double-bottom structure: two comparable lows near ${rightLow.toFixed(5)} followed by a close above the intervening resistance near ${middleHigh.toFixed(5)}.` };
  }
  return null;
}

function findTriangleBreakout(candles: MarketCandle[], context: MarketContext): DocumentPatternIndicator | null {
  if (candles.length < 10 || context.priceAction.breakoutOrFakeout !== "BREAKOUT") return null;
  const earlier = candles.slice(-10, -5);
  const later = candles.slice(-5, -1);
  const earlierRange = Math.max(...earlier.map((candle) => candle.high)) - Math.min(...earlier.map((candle) => candle.low));
  const laterRange = Math.max(...later.map((candle) => candle.high)) - Math.min(...later.map((candle) => candle.low));
  if (earlierRange <= 0 || laterRange > earlierRange * 0.82) return null;
  const direction = context.breakoutState === "ABOVE_RESISTANCE" ? "BUY" : context.breakoutState === "BELOW_SUPPORT" ? "SELL" : null;
  if (!direction) return null;
  return { id: "triangle-breakout", direction, contribution: 2, observation: `Converging range contracted from ${earlierRange.toFixed(5)} to ${laterRange.toFixed(5)} before a confirmed ${direction === "BUY" ? "upward" : "downward"} breakout.` };
}

function findFlagPennantBreakout(candles: MarketCandle[], context: MarketContext): DocumentPatternIndicator | null {
  if (candles.length < 9 || context.priceAction.breakoutOrFakeout !== "BREAKOUT") return null;
  const impulse = candles.slice(-9, -5);
  const pause = candles.slice(-5, -1);
  const impulseMove = impulse[impulse.length - 1].close - impulse[0].open;
  const pauseRange = Math.max(...pause.map((candle) => candle.high)) - Math.min(...pause.map((candle) => candle.low));
  const atr = Math.max(context.volatility.atr, Number.EPSILON);
  if (Math.abs(impulseMove) < atr * 1.2 || pauseRange > Math.abs(impulseMove) * 0.7) return null;
  const direction = impulseMove > 0 && context.breakoutState === "ABOVE_RESISTANCE" ? "BUY" : impulseMove < 0 && context.breakoutState === "BELOW_SUPPORT" ? "SELL" : null;
  if (!direction) return null;
  return { id: "flag-pennant-breakout", direction, contribution: 2, observation: `A directional impulse was followed by a compact consolidation and a confirmed ${direction === "BUY" ? "bullish" : "bearish"} breakout.` };
}

export function detectDocumentPatternIndicators(values: Array<Record<string, unknown>> | undefined, context: MarketContext): DocumentPatternIndicator[] {
  if (!values?.length) return [];
  const candles = parseMarketCandles(values);
  if (candles.length < 3) return [];
  const indicators: DocumentPatternIndicator[] = [];
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const latestBody = body(latest);
  const latestRange = range(latest);
  const lowerWick = Math.min(latest.open, latest.close) - latest.low;
  const upperWick = latest.high - Math.max(latest.open, latest.close);
  const nearSupport = Math.abs(latest.close - context.supportResistance.support) <= context.volatility.atr;
  const nearResistance = Math.abs(latest.close - context.supportResistance.resistance) <= context.volatility.atr;

  if (hasBullishEngulfing(previous, latest)) indicators.push({ id: "bullish-engulfing", direction: "BUY", contribution: 2, observation: "Latest candle bullishly engulfs the prior bearish candle, providing reversal evidence." });
  if (hasBearishEngulfing(previous, latest)) indicators.push({ id: "bearish-engulfing", direction: "SELL", contribution: 2, observation: "Latest candle bearishly engulfs the prior bullish candle, providing reversal evidence." });
  if (hasBullishHarami(previous, latest)) indicators.push({ id: "bullish-harami", direction: "BUY", contribution: 1, observation: "A smaller bullish candle formed inside the prior bearish body, indicating possible bearish momentum loss." });
  if (hasBearishHarami(previous, latest)) indicators.push({ id: "bearish-harami", direction: "SELL", contribution: 1, observation: "A smaller bearish candle formed inside the prior bullish body, indicating possible bullish momentum loss." });
  if (latestBody / latestRange <= 0.1 && (nearSupport || nearResistance)) {
    indicators.push({ id: "doji-reversal-context", direction: nearSupport ? "BUY" : "SELL", contribution: 1, observation: `A doji formed near ${nearSupport ? "support" : "resistance"}, showing indecision at a decision level; follow-through remains required.` });
  }
  if (nearSupport && lowerWick > Math.max(latestBody * 1.5, latestRange * 0.35) && bullish(latest)) {
    indicators.push({ id: "hammer-rejection", direction: "BUY", contribution: 2, observation: "A bullish lower-wick rejection formed at support, indicating buyers rejected lower prices." });
  }
  if (nearResistance && upperWick > Math.max(latestBody * 1.5, latestRange * 0.35) && bearish(latest)) {
    indicators.push({ id: "shooting-star-rejection", direction: "SELL", contribution: 2, observation: "A bearish upper-wick rejection formed at resistance, indicating sellers rejected higher prices." });
  }
  const chartPatterns = [findDoublePattern(candles, context), findTriangleBreakout(candles, context), findFlagPennantBreakout(candles, context)].filter((pattern): pattern is DocumentPatternIndicator => Boolean(pattern));
  indicators.push(...chartPatterns);

  const directionalTotals = { BUY: 0, SELL: 0 };
  return indicators.filter((indicator) => {
    const current = directionalTotals[indicator.direction];
    const remaining = Math.max(0, 3 - current);
    if (remaining <= 0) return false;
    const boundedContribution = Math.min(indicator.contribution, remaining);
    directionalTotals[indicator.direction] += boundedContribution;
    indicator.contribution = boundedContribution;
    return true;
  });
}
