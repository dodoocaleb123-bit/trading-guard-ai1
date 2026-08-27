import fs from "node:fs/promises";
import { calculateMarketContext } from "../server/market-context.ts";
import { buildReplacementKnowledgeModelV3, buildReplacementKnowledgeModelV5, evaluateReplacementIntelligence } from "../server/replacement-intelligence.ts";

const keys = [process.env.TWELVE_DATA_API_KEY_2, process.env.TWELVE_DATA_API_KEY_3, process.env.TWELVE_DATA_API_KEY_4, process.env.TWELVE_DATA_API_KEY_5, process.env.TWELVE_DATA_API_KEY].filter(Boolean);
const assets = ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"];
const intervals = ["15min", "1h"];
const horizon = 6;

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

function outcomeFor(decision, candle) {
  const high = Number(candle.high);
  const low = Number(candle.low);
  if (!Number.isFinite(high) || !Number.isFinite(low)) return "PENDING";
  const win = decision.direction === "BUY" ? high >= decision.takeProfit : low <= decision.takeProfit;
  const loss = decision.direction === "BUY" ? low <= decision.stopLoss : high >= decision.stopLoss;
  return win ? "WIN" : loss ? "LOSS" : "PENDING";
}

function blank() { return { evaluated: 0, wins: 0, losses: 0, pending: 0, buy: 0, sell: 0, confidenceTotal: 0, confidenceAverage: null, winRateOnClosed: null }; }
function addResult(bucket, decision, outcome) {
  bucket.evaluated += 1;
  bucket[decision.direction === "BUY" ? "buy" : "sell"] += 1;
  bucket.confidenceTotal += decision.confidence;
  if (outcome === "WIN") bucket.wins += 1;
  else if (outcome === "LOSS") bucket.losses += 1;
  else bucket.pending += 1;
  const resolved = bucket.wins + bucket.losses;
  bucket.confidenceAverage = Number((bucket.confidenceTotal / bucket.evaluated).toFixed(2));
  bucket.winRateOnClosed = resolved ? Number((bucket.wins / resolved * 100).toFixed(2)) : null;
}

const v3 = buildReplacementKnowledgeModelV3();
const v5 = buildReplacementKnowledgeModelV5();
const comparison = [];
for (const interval of intervals) {
  const batch = await fetchBatch(interval);
  for (const asset of assets) {
    const values = batch[asset]?.values ?? [];
    const v3Result = blank();
    const v5Result = blank();
    let agreement = 0;
    let disagreements = 0;
    let v5FibonacciMatches = 0;
    for (let i = 60; i < values.length - horizon; i += 1) {
      const history = values.slice(0, i + 1);
      const context = calculateMarketContext(history);
      const close = Number(values[i]?.close);
      if (!context || !Number.isFinite(close)) continue;
      const input = { asset, close, interval, marketContext: context, fundamentalContext: { status: "UNAVAILABLE", bias: "NEUTRAL", summary: "Fresh validation run without a verified macro snapshot; no macro direction fabricated.", eventRisk: "NORMAL" } };
      const v3Decision = evaluateReplacementIntelligence(input, v3);
      const v5Decision = evaluateReplacementIntelligence(input, v5);
      if (v3Decision.direction === v5Decision.direction) agreement += 1;
      else disagreements += 1;
      if (v5Decision.matchedNodes.some((node) => node.id === "v5-fibonacci-pullback")) v5FibonacciMatches += 1;
      const future = values.slice(i + 1, i + 1 + horizon);
      const firstV3 = future.map((candle) => outcomeFor(v3Decision, candle)).find((outcome) => outcome !== "PENDING") ?? "PENDING";
      const firstV5 = future.map((candle) => outcomeFor(v5Decision, candle)).find((outcome) => outcome !== "PENDING") ?? "PENDING";
      addResult(v3Result, v3Decision, firstV3);
      addResult(v5Result, v5Decision, firstV5);
    }
    comparison.push({ asset, interval, v3: v3Result, v5: v5Result, directionAgreement: agreement, directionDisagreements: disagreements, v5FibonacciMatches });
  }
}
const report = { generatedAt: new Date().toISOString(), protocol: { assets, intervals, candlesPerSeries: 200, warmupCandles: 60, outcomeHorizon: horizon, mode: "paper-validation", macro: "UNAVAILABLE / neutral by design", scope: "walk-forward comparison of exact v3 and v5 deterministic evaluators; not a profitability claim" }, comparison };
await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/latest-v5-shadow-validation.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
