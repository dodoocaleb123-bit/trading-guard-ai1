import axios from "axios";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { calculateMarketContext, type MarketContext } from "./market-context";

export type MarketSnapshot = {
  symbol: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  change?: number;
  fetchedAt: string;
  interval?: "15min" | "1h";
  trend?: "UP" | "DOWN";
  values?: Array<Record<string, unknown>>;
  marketContext?: MarketContext | null;
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

let twelveDataCursor = 0;

function isTwelveDataFailoverError(error: unknown, payload?: any) {
  const status = (error as any)?.response?.status ?? (error as any)?.status;
  const code = payload?.code ?? (error as any)?.response?.data?.code;
  const message = String(payload?.message ?? (error as any)?.response?.data?.message ?? (error as any)?.message ?? "");
  return status === 401 || status === 403 || status === 429 || code === 401 || code === 403 || code === 429 || /credit|quota|rate.?limit|too many requests/i.test(message);
}

async function requestTwelveData(path: string, params: Record<string, string | number>, timeout: number) {
  const keys = ENV.twelveDataApiKeys.length ? ENV.twelveDataApiKeys : [ENV.twelveDataApiKey].filter(Boolean);
  if (!keys.length) throw new Error("Twelve Data is not configured");
  let lastError: unknown;
  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const index = (twelveDataCursor + attempt) % keys.length;
    const key = keys[index];
    try {
      const response = await axios.get(path, { params: { ...params, apikey: key }, timeout });
      if (isTwelveDataFailoverError(undefined, response.data) || response.status === 401 || response.status === 403 || response.status === 429) {
        lastError = new Error(response.data?.message ?? `Twelve Data key ${index + 1} unavailable`);
        continue;
      }
      twelveDataCursor = (index + 1) % keys.length;
      return response;
    } catch (error) {
      if (!isTwelveDataFailoverError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All configured Twelve Data keys are unavailable");
}

export async function fetchMarketSnapshot(asset: string, interval = "15min") {
  const symbol = normalizeAsset(asset);
  const response = await requestTwelveData("https://api.twelvedata.com/quote", { symbol, interval }, 15000);
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

export type MarketSeries = {
  symbol: string;
  interval: "15min" | "1h";
  values: Array<Record<string, unknown>>;
  close: number;
  trend: "UP" | "DOWN";
  fetchedAt: string;
  marketContext: MarketContext | null;
};

function parseMarketSeries(symbol: string, interval: "15min" | "1h", payload: any): MarketSeries {
  if (payload?.status === "error") throw new Error(payload.message ?? "OHLCV data unavailable");
  const values = Array.isArray(payload?.values) ? payload.values : [];
  if (values.length < 3) throw new Error("Not enough OHLCV data for timeframe");
  const last = values[values.length - 1];
  const prior = values[values.length - 2];
  const close = Number(last.close);
  const priorClose = Number(prior.close);
  if (!Number.isFinite(close) || !Number.isFinite(priorClose)) throw new Error("OHLCV data has no usable close price");
  return { symbol, interval, values, close, trend: close >= priorClose ? "UP" : "DOWN", fetchedAt: new Date().toISOString(), marketContext: calculateMarketContext(values) };
}

export async function fetchMarketSeries(asset: string, interval: "15min" | "1h") {
  const symbol = normalizeAsset(asset);
  const response = await requestTwelveData("https://api.twelvedata.com/time_series", { symbol, interval, outputsize: 30, order: "ASC" }, 15000);
  return parseMarketSeries(symbol, interval, response.data);
}

export async function fetchMarketSeriesBatch(assets: readonly string[], interval: "15min" | "1h") {
  const symbols = assets.map(normalizeAsset);
  const response = await requestTwelveData("https://api.twelvedata.com/time_series", { symbol: symbols.join(","), interval, outputsize: 30, order: "ASC" }, 20000);
  if (response.data?.status === "error") throw new Error(response.data.message ?? "OHLCV batch unavailable");
  const result = new Map<string, MarketSeries>();
  for (const symbol of symbols) {
    const payload = response.data?.[symbol];
    if (!payload) continue;
    try {
      result.set(symbol, parseMarketSeries(symbol, interval, payload));
    } catch (error) {
      console.warn(`[Market] ${symbol} ${interval} skipped:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}

export function shouldNotifyApprovedAudit(verdict: string) {
  return verdict === "APPROVED";
}

export function formatApprovedTelegramMessage(input: {
  asset: string;
  timeframe: string;
  direction: string;
  entry: number | null | undefined;
  stopLoss: number | null | undefined;
  takeProfit: number | null | undefined;
  confidence: number;
  adjustments: string;
  ruleEvidence?: string[];
  confluenceScore?: number;
}) {
  const optional = (value: number | null | undefined) => value == null ? "—" : String(value);
  const evidence = input.ruleEvidence?.length ? `\nRules applied: ${input.ruleEvidence.slice(0, 3).join("; ")}` : "";
  const confluence = typeof input.confluenceScore === "number" ? `\nConfluence: ${input.confluenceScore}%` : "";
  const message = [
    "<b>TradingGuardAI approved trade</b>",
    "",
    `Asset: ${input.asset}`,
    `Timeframe: ${input.timeframe}`,
    `Direction: ${input.direction}`,
    `Entry: ${optional(input.entry)}`,
    `Stop Loss: ${optional(input.stopLoss)}`,
    `Take Profit: ${optional(input.takeProfit)}`,
    `Confidence: ${input.confidence}%`,
    "Validation: UNVALIDATED",
    `Adjustments: ${input.adjustments}${confluence}${evidence}`,
  ];
  return message.join("\\n");
}

export async function sendTelegramMessage(text: string): Promise<{ delivered: boolean; telegramMessageId?: string; error?: string }> {
  if (!ENV.telegramBotToken || !ENV.telegramChatId) return { delivered: false, error: "Telegram credentials are not configured" };
  try {
    const response = await axios.post<{ ok?: boolean; result?: { message_id?: number }; description?: string }>(`https://api.telegram.org/bot${ENV.telegramBotToken}/sendMessage`, {
      chat_id: ENV.telegramChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }, { timeout: 12000 });
    const telegramMessageId = response.data.result?.message_id != null ? String(response.data.result.message_id) : undefined;
    console.info(`[Telegram] Notification delivered to configured chat (${text.startsWith("<b>TradingGuardAI signal</b>") ? "signal" : "outcome"})`);
    return { delivered: true, telegramMessageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[Telegram] Could not send notification:", message);
    return { delivered: false, error: message };
  }
}

export function gateAuditDecision(result: {
  verdict: "APPROVED" | "DENIED";
  confidence: number;
  adjustments: string;
  asset?: string;
  timeframe?: string;
  direction?: "BUY" | "SELL";
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  ruleEvidence?: string[];
  ruleFindings?: Array<{ title: string; stance: "BUY" | "SELL" | "NEUTRAL"; weight: number }>;
}, rules: string) {
  const evidence = Array.isArray(result.ruleEvidence)
    ? result.ruleEvidence.filter((title) => typeof title === "string" && title.trim() && rules.includes(title.trim())).slice(0, 8)
    : [];
  const hasValidLevels = [result.entry, result.stopLoss, result.takeProfit].every((value) => typeof value === "number" && Number.isFinite(value));
  const direction = result.direction;
  const levelsAreDirectional = direction === "BUY"
    ? Number(result.stopLoss) < Number(result.entry) && Number(result.takeProfit) > Number(result.entry)
    : direction === "SELL"
      ? Number(result.stopLoss) > Number(result.entry) && Number(result.takeProfit) < Number(result.entry)
      : false;
  const findings = Array.isArray(result.ruleFindings)
    ? result.ruleFindings.filter((finding) => finding && typeof finding.title === "string" && rules.includes(finding.title.trim()) && ["BUY", "SELL", "NEUTRAL"].includes(finding.stance)).slice(0, 8)
    : [];
  const buyScore = findings.filter((finding) => finding.stance === "BUY").reduce((sum, finding) => sum + Math.max(1, Math.min(5, Number(finding.weight) || 1)), 0);
  const sellScore = findings.filter((finding) => finding.stance === "SELL").reduce((sum, finding) => sum + Math.max(1, Math.min(5, Number(finding.weight) || 1)), 0);
  const totalDirectionalScore = buyScore + sellScore;
  const dominantScore = Math.max(buyScore, sellScore);
  const confluenceScore = totalDirectionalScore ? Math.round((dominantScore / totalDirectionalScore) * 100) : 0;
  const hasDirectionalConflict = buyScore > 0 && sellScore > 0 && confluenceScore < 70;
  const failures: string[] = [];
  if (result.confidence < 75) failures.push("confidence is below the 75% approval threshold");
  if (evidence.length < 3 || findings.length < 3) failures.push("fewer than three applicable strategy findings were cited");
  if (hasDirectionalConflict) failures.push(`strategy findings conflict (BUY score ${buyScore} vs SELL score ${sellScore})`);
  if (confluenceScore < 70) failures.push(`confluence score is ${confluenceScore}%, below the 70% threshold`);
  if (!hasValidLevels || !levelsAreDirectional) failures.push("entry, stop loss, and take profit do not pass directional risk checks");
  if (result.verdict === "APPROVED" && failures.length) {
    return {
      ...result,
      verdict: "DENIED" as const,
      ruleEvidence: evidence,
      ruleFindings: findings,
      confluenceScore,
      validationStatus: "UNVALIDATED",
      adjustments: `Decision gate: ${failures.join("; ")}. ${result.adjustments}`,
    };
  }
  return { ...result, ruleEvidence: evidence, ruleFindings: findings, confluenceScore, validationStatus: "UNVALIDATED" as const };
}

export function formatAuditResult(result: { verdict: "APPROVED" | "DENIED"; confidence: number; adjustments: string; ruleEvidence?: string[]; confluenceScore?: number; validationStatus?: string }, market: MarketSnapshot) {
  const evidence = result.ruleEvidence?.length ? `\n\nRules applied:\n${result.ruleEvidence.map((rule) => `- ${rule}`).join("\n")}` : "";
  const confluence = typeof result.confluenceScore === "number" ? `\n\nConfluence score: ${result.confluenceScore}%` : "";
  return `${result.verdict === "APPROVED" ? "TRADE APPROVED" : "TRADE DENIED"}\n\nConfidence level: ${result.confidence}%\n\nValidation status: ${result.validationStatus ?? "UNVALIDATED"}\n\nAdjustments: ${result.adjustments}${confluence}${evidence}\n\nLive ${market.symbol}: ${market.price}`;
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
        content: "You are TradingGuardAI, a strict risk-discipline assistant. You never guarantee profit, never place trades, and must only approve a signal when it is consistent with the supplied strategy rules and market snapshot. Use the entire supplied rule library, cite at least three applicable rule titles in ruleEvidence, provide matching ruleFindings with a BUY, SELL, or NEUTRAL stance and weight from 1 to 5, and return DENIED when rules conflict or evidence is insufficient. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Use the complete rule library and the raw market data to determine the best-supported possible trade outcome. The caller may provide context, but you must derive the direction, entry, stop loss, and take profit from the rules and observed market conditions rather than merely repeating a preselected setup. Return DENIED when rule evidence is insufficient or conflicting. Context:\n${input.tradeSignal}\n\nComplete strategy rule library:\n${input.rules}\n\nRaw market data and derived snapshot:\n${JSON.stringify(input.market)}\n\nCite exact rule titles from the library in ruleEvidence and ruleFindings; do not invent citations. Use ruleFindings to state whether each cited rule supports BUY, supports SELL, or is NEUTRAL for the generated setup.`,
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
            ruleEvidence: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 8 },
            ruleFindings: { type: "array", items: { type: "object", properties: { title: { type: "string" }, stance: { type: "string", enum: ["BUY", "SELL", "NEUTRAL"] }, weight: { type: "number", minimum: 1, maximum: 5 } }, required: ["title", "stance", "weight"], additionalProperties: false }, minItems: 0, maxItems: 8 },
          },
          required: ["verdict", "confidence", "adjustments", "asset", "timeframe", "direction", "entry", "stopLoss", "takeProfit", "ruleEvidence", "ruleFindings"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = response.choices?.[0]?.message?.content;
  const parsed = JSON.parse(typeof content === "string" ? content : "{}");
  return gateAuditDecision(parsed, input.rules);
}

export type ScannerDecisionCandidate = {
  asset: string;
  timeframe: string;
  market: MarketSnapshot;
};

export async function generateScannerDecisions(input: { candidates: ScannerDecisionCandidate[]; rules: string }) {
  if (!input.candidates.length) return Object.assign([], { metrics: { snapshots: 0, completeResponses: 0, retries: 0 } });
  const batchSize = 2;
  const batches = Array.from({ length: Math.ceil(input.candidates.length / batchSize) }, (_, index) => input.candidates.slice(index * batchSize, index * batchSize + batchSize));
  const results = await Promise.all(batches.map((candidates) => generateScannerDecisionBatch({ candidates, rules: input.rules })));
  return Object.assign(results.flatMap((result) => result.decisions), {
    metrics: {
      snapshots: input.candidates.length,
      completeResponses: input.candidates.length,
      retries: results.reduce((total, result) => total + result.retries, 0),
    },
  });
}

async function generateScannerDecisionBatch(input: { candidates: ScannerDecisionCandidate[]; rules: string }) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are TradingGuardAI. You MUST return exactly one directional judgment for EVERY supplied raw market candidate. Never omit a candidate and never return NEUTRAL as the direction: choose BUY or SELL using the complete strategy-rule library and raw OHLCV data, then generate entry, stop loss, and take profit. Mark the judgment APPROVED only when the supplied evidence gate is satisfied; otherwise return DENIED with the chosen BUY or SELL direction and a precise explanation. Never place trades, never guarantee profit, cite exact rule titles, and return valid JSON only.",
      },
      {
        role: "user",
        content: `Generate exactly one BUY or SELL decision for each raw market candidate—exactly ${input.candidates.length} decisions total. Do not return an empty decisions array, do not omit candidates, and do not use NEUTRAL as the direction. Derive the directional judgment and risk levels from the complete strategy rules, raw OHLCV candles, and the deterministic market-context features. Use the context to assess market structure, volatility regime, latest and recent candle behavior, support/resistance zones, momentum, breakout state, and opposing-timeframe context. Treat the raw candles as the source of truth and use derived features as transparent calculations, not as invented chart facts. If evidence is weak or conflicting, still choose the better-supported BUY or SELL direction, return DENIED, and explain the evidence weakness. Complete strategy rules:\n${input.rules}\n\nRaw market candidates with detailed deterministic context:\n${JSON.stringify(input.candidates)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scanner_trade_decisions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            decisions: {
              type: "array",
              minItems: input.candidates.length,
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  asset: { type: "string" },
                  timeframe: { type: "string" },
                  verdict: { type: "string", enum: ["APPROVED", "DENIED"] },
                  confidence: { type: "number", minimum: 0, maximum: 100 },
                  adjustments: { type: "string" },
                  direction: { type: "string", enum: ["BUY", "SELL"] },
                  entry: { type: ["number", "null"] },
                  stopLoss: { type: ["number", "null"] },
                  takeProfit: { type: ["number", "null"] },
                  ruleEvidence: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 8 },
                  ruleFindings: { type: "array", items: { type: "object", properties: { title: { type: "string" }, stance: { type: "string", enum: ["BUY", "SELL", "NEUTRAL"] }, weight: { type: "number", minimum: 1, maximum: 5 } }, required: ["title", "stance", "weight"], additionalProperties: false }, minItems: 0, maxItems: 8 },
                },
                required: ["asset", "timeframe", "verdict", "confidence", "adjustments", "direction", "entry", "stopLoss", "takeProfit", "ruleEvidence", "ruleFindings"],
                additionalProperties: false,
              },
            },
          },
          required: ["decisions"],
          additionalProperties: false,
        },
      },
    },
      });
      const content = response.choices?.[0]?.message?.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");
      const modelDecisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];
      const expectedKeys = new Set(input.candidates.map((candidate) => `${candidate.asset}:${candidate.timeframe}`));
      const returnedKeys = new Set(modelDecisions.map((decision: any) => `${decision.asset}:${decision.timeframe}`));
      const missing = Array.from(expectedKeys).filter((key) => !returnedKeys.has(key));
      const duplicates = modelDecisions.length !== returnedKeys.size;
      if (missing.length || duplicates || modelDecisions.length !== input.candidates.length) {
        throw new Error(`Strategy engine returned incomplete structured decisions (expected ${input.candidates.length}, received ${modelDecisions.length}, missing ${missing.join(", ") || "none"}).`);
      }
      const byDecisionKey = new Map<string, any>(modelDecisions.map((decision: any) => [`${decision.asset}:${decision.timeframe}`, decision] as [string, any]));
      return {
        decisions: input.candidates.map((candidate) => {
          const decision = byDecisionKey.get(`${candidate.asset}:${candidate.timeframe}`);
          if (!decision) throw new Error(`Strategy engine omitted ${candidate.asset} ${candidate.timeframe}.`);
          const gated = gateAuditDecision(decision, input.rules);
          return { ...gated, asset: candidate.asset, timeframe: candidate.timeframe, market: candidate.market };
        }),
        retries: attempt - 1,
      };
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
    }
  }
  throw new Error(`Strategy engine failed after one retry: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function buildDirectionalFallback(candidate: ScannerDecisionCandidate) {
  const direction = candidate.market.trend === "UP" ? "BUY" : "SELL";
  const entry = Number((candidate.market.close ?? candidate.market.price).toFixed(5));
  const risk = Number((entry * 0.0012).toFixed(5));
  return { asset: candidate.asset, timeframe: candidate.timeframe, verdict: "DENIED" as const, confidence: 0, adjustments: "The strategy engine returned no structured judgment for this snapshot; a directional BUY/SELL placeholder was created for audit visibility and is not Telegram-eligible.", direction, entry, stopLoss: direction === "BUY" ? entry - risk : entry + risk, takeProfit: direction === "BUY" ? entry + risk * 2 : entry - risk * 2, ruleEvidence: [], ruleFindings: [] };
}

/* legacy normalization retained below for source compatibility */
export function normalizeScannerDecisionResults(input: { candidates: ScannerDecisionCandidate[]; rules: string }, parsed: any) {
  const byKey = new Map(input.candidates.map((candidate) => [`${candidate.asset}:${candidate.timeframe}`, candidate]));
  return (Array.isArray(parsed.decisions) ? parsed.decisions : []).flatMap((decision: any) => {
    const candidate = byKey.get(`${decision.asset}:${decision.timeframe}`);
    if (!candidate) return [];
    const gated = gateAuditDecision(decision, input.rules);
    return [{ ...gated, asset: candidate.asset, timeframe: candidate.timeframe, market: candidate.market }];
  });
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
