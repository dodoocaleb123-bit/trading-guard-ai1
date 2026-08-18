import fs from "node:fs/promises";

/**
 * Trading Guard AI validation protocol.
 * This is a mechanics baseline: it uses real Twelve Data OHLCV candles,
 * the app's trend direction, and its 1:2 risk geometry. It does not claim
 * to reproduce every prose PDF rule or prove profitability.
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
for (const interval of intervals) {
  const batch = await fetchBatch(interval);
  for (const asset of assets) {
    const values = batch[asset]?.values ?? [];
    let evaluated = 0, wins = 0, losses = 0;
    for (let i = 2; i < values.length; i += 1) {
      const prior = Number(values[i - 1].close);
      const close = Number(values[i].close);
      const next = Number(values[i + 1]?.close);
      if (![prior, close, next].every(Number.isFinite)) continue;
      const setup = levels(asset, close, close >= prior ? "UP" : "DOWN");
      const outcome = setup.direction === "BUY" ? (next >= setup.takeProfit ? "WIN" : next <= setup.stopLoss ? "LOSS" : "PENDING") : (next <= setup.takeProfit ? "WIN" : next >= setup.stopLoss ? "LOSS" : "PENDING");
      evaluated += 1;
      if (outcome === "WIN") wins += 1;
      if (outcome === "LOSS") losses += 1;
    }
    results.push({ asset, interval, candles: values.length, evaluated, wins, losses, pending: evaluated - wins - losses, winRateOnClosed: wins + losses ? Number((wins / (wins + losses) * 100).toFixed(2)) : null });
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  protocol: { assets, intervals, candlesPerSeries: 200, outcomeHorizon: "one subsequent candle", mode: "paper-validation", scope: "trend direction and 1:2 risk geometry baseline; not a complete evaluation of all prose PDF rules" },
  results,
};
await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/latest-validation-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
