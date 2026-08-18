import axios from "axios";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

export type MarketSnapshot = {
  symbol: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  change?: number;
  fetchedAt: string;
};

const supabaseHeaders = () => ({
  apikey: ENV.supabaseAnonKey,
  Authorization: `Bearer ${ENV.supabaseAnonKey}`,
  "Content-Type": "application/json",
});

export async function mirrorToSupabase(table: string, payload: Record<string, unknown>) {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) return null;
  try {
    const response = await axios.post(`${ENV.supabaseUrl}/${table}`, payload, {
      headers: { ...supabaseHeaders(), Prefer: "return=representation" },
      timeout: 12000,
    });
    return Array.isArray(response.data) ? response.data[0] : response.data;
  } catch (error) {
    console.warn(`[Supabase] Could not mirror ${table}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function fetchStrategyRulesFromSupabase() {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) return [];
  try {
    const response = await axios.get(`${ENV.supabaseUrl}/strategy_rules`, {
      headers: supabaseHeaders(),
      params: { select: "*", order: "created_at.desc", limit: 100 },
      timeout: 12000,
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.warn("[Supabase] Could not load strategy rules:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function extractStrategyText(buffer: Buffer, mimeType: string, fileName: string) {
  if (mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text.trim();
  }
  if (mimeType.includes("word") || mimeType.includes("document") || fileName.toLowerCase().endsWith(".docx")) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value.trim();
  }
  return buffer.toString("utf8").trim();
}

const symbolMap: Record<string, string> = {
  "EUR/USD": "EUR/USD",
  "EURUSD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "GBPUSD": "GBP/USD",
  "XAU/USD": "XAU/USD",
  XAUUSD: "XAU/USD",
  "BTC/USD": "BTC/USD",
  BTCUSD: "BTC/USD",
};

export function normalizeAsset(asset: string) {
  const key = asset.toUpperCase().replace(/\s+/g, "");
  return symbolMap[key] ?? symbolMap[asset.toUpperCase()] ?? asset.toUpperCase();
}

export async function fetchMarketSnapshot(asset: string, interval = "15min") {
  const symbol = normalizeAsset(asset);
  if (!ENV.twelveDataApiKey) throw new Error("Twelve Data is not configured");
  const response = await axios.get("https://api.twelvedata.com/quote", {
    params: { symbol, interval, apikey: ENV.twelveDataApiKey },
    timeout: 15000,
  });
  if (response.data?.status === "error") throw new Error(response.data.message ?? "Market data unavailable");
  const quote = response.data;
  const price = Number(quote.close ?? quote.price ?? quote.previous_close);
  if (!Number.isFinite(price)) throw new Error("Market provider returned no usable price");
  return {
    symbol,
    price,
    open: Number(quote.open),
    high: Number(quote.high),
    low: Number(quote.low),
    close: Number(quote.close),
    change: Number(quote.percent_change),
    fetchedAt: new Date().toISOString(),
  } satisfies MarketSnapshot;
}

export async function fetchMarketSeries(asset: string, interval: "15min" | "1h") {
  const symbol = normalizeAsset(asset);
  if (!ENV.twelveDataApiKey) throw new Error("Twelve Data is not configured");
  const response = await axios.get("https://api.twelvedata.com/time_series", {
    params: { symbol, interval, outputsize: 30, order: "ASC", apikey: ENV.twelveDataApiKey },
    timeout: 15000,
  });
  if (response.data?.status === "error") throw new Error(response.data.message ?? "OHLCV data unavailable");
  const values = Array.isArray(response.data?.values) ? response.data.values : [];
  if (values.length < 3) throw new Error("Not enough OHLCV data for timeframe");
  const last = values[values.length - 1];
  const prior = values[values.length - 2];
  const close = Number(last.close);
  const priorClose = Number(prior.close);
  return { symbol, interval, values, close, trend: close >= priorClose ? "UP" : "DOWN", fetchedAt: new Date().toISOString() };
}

export async function sendTelegramMessage(text: string) {
  if (!ENV.telegramBotToken || !ENV.telegramChatId) return false;
  try {
    await axios.post(`https://api.telegram.org/bot${ENV.telegramBotToken}/sendMessage`, {
      chat_id: ENV.telegramChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }, { timeout: 12000 });
    console.info(`[Telegram] Notification delivered to configured chat (${text.startsWith("<b>TradingGuardAI signal</b>") ? "signal" : "outcome"})`);
    return true;
  } catch (error) {
    console.warn("[Telegram] Could not send notification:", error instanceof Error ? error.message : error);
    return false;
  }
}

export function formatAuditResult(result: { verdict: "APPROVED" | "DENIED"; confidence: number; adjustments: string }, market: MarketSnapshot) {
  return `${result.verdict === "APPROVED" ? "TRADE APPROVED" : "TRADE DENIED"}\n\nConfidence level: ${result.confidence}%\n\nAdjustments: ${result.adjustments}\n\nLive ${market.symbol}: ${market.price}`;
}

export async function auditWithLLM(input: {
  tradeSignal: string;
  rules: string;
  market: MarketSnapshot;
}) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are TradingGuardAI, a strict risk-discipline assistant. You never guarantee profit, never place trades, and must only approve a signal when it is consistent with the supplied strategy rules and market snapshot. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Evaluate this trade signal against the rules and live snapshot. Signal:\n${input.tradeSignal}\n\nRules:\n${input.rules}\n\nMarket snapshot:\n${JSON.stringify(input.market)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "trade_audit",
        strict: true,
        schema: {
          type: "object",
          properties: {
            verdict: { type: "string", enum: ["APPROVED", "DENIED"] },
            confidence: { type: "number", minimum: 0, maximum: 100 },
            adjustments: { type: "string" },
            asset: { type: "string" },
            timeframe: { type: "string" },
            direction: { type: "string", enum: ["BUY", "SELL"] },
            entry: { type: ["number", "null"] },
            stopLoss: { type: ["number", "null"] },
            takeProfit: { type: ["number", "null"] },
          },
          required: ["verdict", "confidence", "adjustments", "asset", "timeframe", "direction", "entry", "stopLoss", "takeProfit"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = response.choices?.[0]?.message?.content;
  return JSON.parse(typeof content === "string" ? content : "{}");
}

export async function forensicAnalysis(signal: { asset: string; direction: string; entry: string; stopLoss: string; takeProfit: string }, market: MarketSnapshot, rules: string) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a trading post-mortem analyst. Identify the most likely rule or market-condition failure without claiming certainty. Return concise JSON." },
      { role: "user", content: `A signal lost. Signal: ${JSON.stringify(signal)}. Market at review: ${JSON.stringify(market)}. Rules: ${rules}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "loss_forensics",
        strict: true,
        schema: {
          type: "object",
          properties: { rootCause: { type: "string" }, lesson: { type: "string" }, guardrail: { type: "string" } },
          required: ["rootCause", "lesson", "guardrail"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = response.choices?.[0]?.message?.content;
  return JSON.parse(typeof content === "string" ? content : "{}");
}
