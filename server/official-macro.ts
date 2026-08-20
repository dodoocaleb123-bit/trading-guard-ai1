import axios from "axios";
import { ENV } from "./_core/env";
import type { FundamentalContext } from "./replacement-intelligence";

export type OfficialMacroObservation = {
  source: "FRED" | "ECB" | "BOE";
  series: string;
  value: number;
  observedAt: string;
};

export type OfficialMacroContext = FundamentalContext & {
  observations: OfficialMacroObservation[];
  fetchedAt: string;
  stale: boolean;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; context: OfficialMacroContext }>();

function unavailable(summary: string): OfficialMacroContext {
  return { status: "UNAVAILABLE", bias: "NEUTRAL", summary, eventRisk: "NORMAL", interestRateDifferential: null, observations: [], fetchedAt: new Date().toISOString(), stale: true };
}

function parseCsvRows(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const columns = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]));
  });
}

async function fetchFredSeries(series: string) {
  const params: Record<string, string> = { id: series };
  if (ENV.fredApiKey) params.api_key = ENV.fredApiKey;
  const response = await axios.get("https://fred.stlouisfed.org/graph/fredgraph.csv", { params, timeout: 9000, responseType: "text" });
  const rows = parseCsvRows(String(response.data));
  const valid = rows.map((row) => ({ date: String(row.observation_date ?? ""), value: Number(row[series]) })).filter((row) => row.date && Number.isFinite(row.value));
  const latest = valid.at(-1);
  if (!latest) return null;
  return { source: "FRED" as const, series, value: latest.value, observedAt: new Date(`${latest.date}T00:00:00Z`).toISOString() };
}

function textOf(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchEcbPolicyRate() {
  const response = await axios.get("https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html", { timeout: 12000, responseType: "text" });
  const row = String(response.data).match(/<tbody>[\s\S]*?<tr>[\s\S]*?<\/tr>/i)?.[0];
  const cells = row ? Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => textOf(match[1])) : [];
  const year = Number(cells[0]);
  const value = Number(cells[2]);
  const day = Number(cells[1]?.match(/\d+/)?.[0] ?? 1);
  const month = ({ Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 } as Record<string, number>)[cells[1]?.match(/[A-Za-z]{3}/)?.[0] ?? "Jan"] ?? 0;
  if (!Number.isFinite(year) || !Number.isFinite(value)) return null;
  return { source: "ECB" as const, series: "Deposit facility", value, observedAt: new Date(Date.UTC(year, month, day)).toISOString() };
}

async function fetchBoEBankRate() {
  const response = await axios.get("https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp", { timeout: 12000, responseType: "text" });
  const value = Number(String(response.data).match(/stat-figure[^>]*>\s*([0-9.]+)%/i)?.[1]);
  if (!Number.isFinite(value)) return null;
  return { source: "BOE" as const, series: "Official Bank Rate", value, observedAt: new Date().toISOString() };
}

async function fetchOfficialObservations() {
  const results = await Promise.allSettled([
    ...["FEDFUNDS", "CPIAUCSL", "UNRATE"].map(fetchFredSeries),
    fetchEcbPolicyRate(),
    fetchBoEBankRate(),
  ]);
  const observations = results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  if (!observations.length) {
    const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failed) throw failed.reason;
  }
  return observations;
}

export async function fetchOfficialMacroContext(asset: string): Promise<OfficialMacroContext> {
  const cacheKey = "official-macro-composite";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.context;
  try {
    const observations = await fetchOfficialObservations();
    if (!observations.length) {
      const context = unavailable("Official macro sources returned no current observations; the complete v2 intelligence remains the decision base.");
      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, context });
      return context;
    }
    const stale = observations.some((observation) => Date.now() - new Date(observation.observedAt).getTime() > MAX_AGE_MS);
    const sources = Array.from(new Set(observations.map((observation) => observation.source))).join(", ");
    const context: OfficialMacroContext = {
      status: stale ? "UNAVAILABLE" : "AVAILABLE",
      bias: "NEUTRAL",
      summary: stale ? `Official macro observations are stale for ${asset}; no directional macro bias was fabricated.` : `Official macro observations are available for ${asset} from ${sources}; the composite supplies verified context while preserving the full v2 decision base.`,
      eventRisk: "NORMAL",
      interestRateDifferential: null,
      observations,
      fetchedAt: new Date().toISOString(),
      stale,
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, context });
    return context;
  } catch (error) {
    const context = unavailable(`Official macro retrieval failed for ${asset}; ${error instanceof Error ? error.message : "provider unavailable"}.`);
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, context });
    return context;
  }
}

export function clearOfficialMacroCache() {
  cache.clear();
}
