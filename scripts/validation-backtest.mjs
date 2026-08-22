import fs from "node:fs/promises";

/**
 * Trading Guard AI validation protocol.
 * Uses real Twelve Data OHLCV candles. It reports mechanics only: it does not
 * prove profitability, certainty, or reproduce every prose PDF rule.
 */
const keys = [process.env.TWELVE_DATA_API_KEY_2, process.env.TWELVE_DATA_API_KEY_3, process.env.TWELVE_DATA_API_KEY_4, process.env.TWELVE_DATA_API_KEY_5, process.env.TWELVE_DATA_API_KEY].filter(Boolean);
const assets = ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"];
const intervals = ["15min", "1h"];
const precision = (asset) => asset === "BTC/USD" ? 2 : asset === "XAU/USD" ? 4 : 5;
const levels = (asset, close, trend) => {
  const p = precision(asset);
  const direction = trend === "UP" ? "BUY" : "SELL";
  const entry = Number(close.toFixed(p));
  const risk = Number((entry * (asset === "BTC/USD" ? 0.004 : 0.0012)).toFixed(p));
  return { direction, entry, stopLoss: Number((direction === "BUY" ? entry - risk : entry + risk).toFixed(p)), takeProfit: Number((direction === "BUY" ? entry + risk * 2 : entry - risk * 2).toFixed(p)) };
};
const outcomeFor = (setup, candle) => setup.direction === "BUY" ? (Number(candle.high) >= setup.takeProfit ? "WIN" : Number(candle.low) <= setup.stopLoss ? "LOSS" : "PENDING") : (Number(candle.low) <= setup.takeProfit ? "WIN" : Number(candle.high) >= setup.stopLoss ? "LOSS" : "PENDING");
async function fetchBatch(interval) {
  let last;
  for (const key of keys) {
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", assets.join(","));
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "200");
    url.searchParams.set("order", "ASC");
    url.searchParams.set("apikey", key);
    const response = await fetch(url);
    const body = await response.json();
    if (response.status === 200 && !body.status?.toLowerCase?.().includes("error")) return body;
    last = body.message ?? `HTTP ${response.status}`;
  }
  throw new Error(String(last ?? "No Twelve Data key available"));
}
const results = [];
const reversalResults = [];
for (const interval of intervals) {
  const batch = await fetchBatch(interval);
  for (const asset of assets) {
    const values = batch[asset]?.values ?? [];
    let evaluated = 0, wins = 0, losses = 0;
    for (let i = 2; i < values.length - 1; i += 1) {
      const prior = Number(values[i - 1].close);
      const close = Number(values[i].close);
      const next = values[i + 1];
      if (![prior, close, Number(next?.high), Number(next?.low)].every(Number.isFinite)) continue;
      const setup = levels(asset, close, close >= prior ? "UP" : "DOWN");
      const outcome = outcomeFor(setup, next);
      evaluated += 1;
      if (outcome === "WIN") wins += 1;
      if (outcome === "LOSS") losses += 1;
    }
    results.push({ asset, interval, candles: values.length, evaluated, wins, losses, pending: evaluated - wins - losses, winRateOnClosed: wins + losses ? Number((wins / (wins + losses) * 100).toFixed(2)) : null });

    let candidates = 0, reversalWins = 0, reversalLosses = 0, reversalPending = 0;
    for (let i = 22; i < values.length - 3; i += 1) {
      const window = values.slice(i - 20, i);
      const current = values[i];
      const prior = Number(values[i - 1].close);
      const close = Number(current.close);
      const highs = window.map((c) => Number(c.high)).filter(Number.isFinite);
      const lows = window.map((c) => Number(c.low)).filter(Number.isFinite);
      const atr = window.slice(-14).reduce((sum, candle) => sum + Math.abs(Number(candle.high) - Number(candle.low)), 0) / 14;
      const priorTrend = Number(window.at(-1)?.close) >= Number(window[0]?.close) ? "UP" : "DOWN";
      const brokeUp = close > Math.max(...highs) && priorTrend === "DOWN";
      const brokeDown = close < Math.min(...lows) && priorTrend === "UP";
      if ((!brokeUp && !brokeDown) || !Number.isFinite(atr) || atr <= 0 || !Number.isFinite(prior) || !Number.isFinite(close)) continue;
      const direction = brokeUp ? "BUY" : "SELL";
      const risk = Math.max(atr, Math.abs(close) * (asset === "BTC/USD" ? 0.004 : 0.0012));
      const setup = { direction, entry: close, stopLoss: direction === "BUY" ? close - risk : close + risk, takeProfit: direction === "BUY" ? close + risk * 2 : close - risk * 2 };
      candidates += 1;
      const future = values.slice(i + 1, i + 4);
      const outcomes = future.map((candle) => outcomeFor(setup, candle));
      const outcome = outcomes.find((item) => item === "WIN" || item === "LOSS") ?? "PENDING";
      if (outcome === "WIN") reversalWins += 1;
      else if (outcome === "LOSS") reversalLosses += 1;
      else reversalPending += 1;
    }
    reversalResults.push({ asset, interval, reversalCandidates: candidates, wins: reversalWins, losses: reversalLosses, pending: reversalPending, winRateOnClosed: reversalWins + reversalLosses ? Number((reversalWins / (reversalWins + reversalLosses) * 100).toFixed(2)) : null });
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  protocol: { assets, intervals, candlesPerSeries: 200, outcomeHorizon: "one subsequent candle for baseline; up to three subsequent candles for reversal sample", mode: "paper-validation", scope: "real-data mechanics baseline plus separate reversal breakout sample; not a profitability claim" },
  results,
  reversalResults,
};
await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/latest-validation-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
