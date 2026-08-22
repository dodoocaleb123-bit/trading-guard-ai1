import fs from "node:fs";

const input = process.argv[2] ?? "/tmp/Forextrading.txt";
const output = process.argv[3] ?? "reports/entry-signal-extract.json";
const text = fs.readFileSync(input, "utf8").replace(/\r/g, "");
const lines = text.split("\n");
const groups = {
  entry: /\b(entry|enter|buy signal|sell signal|buying|selling|go long|go short|take a trade|trade setup|setup)\b/i,
  confirmation: /\b(confirm|confirmation|confluence|volume|breakout|break down|breakdown|cross(?:es|ed|ing)?|bounce|close[sd]? beyond|retest|pullback|signal line)\b/i,
  invalidation: /\b(invalidat|stop loss|stop-loss|failed|failure|fakeout|false breakout|wrong|exit|reversal)\b/i,
  risk: /\b(risk|reward|risk.?to.?reward|position size|money management|maximum loss|loss limit|protect)\b/i,
  indicator: /\b(MACD|RSI|stochastic|Bollinger|moving average|EMA|SMA|momentum|Fibonacci|fib|support|resistance|trendline|channel|candlestick|volume|tick)\b/i,
  session: /\b(session|European|American|Asian|London|New York|Tokyo|timeframe|hourly|daily|scalp)\b/i,
};
const hits = [];
for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i].trim();
  if (!line) continue;
  const matched = Object.entries(groups).filter(([, regex]) => regex.test(line)).map(([name]) => name);
  if (!matched.length) continue;
  const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).map((item) => item.trim()).filter(Boolean).join(" ");
  hits.push({ line: i + 1, categories: matched, text: line, context });
}
const deduped = [];
const seen = new Set();
for (const hit of hits) {
  const key = hit.context.replace(/\s+/g, " ").slice(0, 600).toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(hit);
}
const result = { input, lineCount: lines.length, hitCount: deduped.length, hits: deduped };
fs.writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ input, lineCount: lines.length, hitCount: deduped.length, output }, null, 2));
