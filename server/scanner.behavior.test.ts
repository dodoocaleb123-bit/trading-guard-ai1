import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateMarketContext } from "./market-context";

const { fetchMarketSeriesBatch, generateScannerDecisions, sendTelegramMessage, recordTelegramDelivery, createStrategyDecision, getSettings, hasRecentStrategyDecision, hasOpenGeneratedSignal, updateStrategyEngineStatus, recordStrategyEngineHealth, getActiveIntelligenceVersion, activateIntelligenceVersion, listIntelligenceComponents, listStrategyRules, listAcceptedStrategyLessons, createIntelligenceVersion, createIntelligenceComponent, insert, db } = vi.hoisted(() => {
  const fetchMarketSeriesBatch = vi.fn(async () => { throw new Error("Twelve Data quota exhausted"); });
  const generateScannerDecisions = vi.fn();
  const createStrategyDecision = vi.fn(async (input: any) => ({ id: 99, ...input }));
  const getSettings = vi.fn(async () => ({ setupCooldownMinutes: 30 }));
  const hasRecentStrategyDecision = vi.fn(async () => false);
  const hasOpenGeneratedSignal = vi.fn(async () => false);
  const updateStrategyEngineStatus = vi.fn();
  const recordStrategyEngineHealth = vi.fn();
  const getActiveIntelligenceVersion = vi.fn(async () => ({ id: 1, versionLabel: "forex-trading-combined-document-v2" }));
  const activateIntelligenceVersion = vi.fn();
  const listIntelligenceComponents = vi.fn(async () => []);
  const listStrategyRules = vi.fn(async () => [{ id: 1, title: "Rules", content: "Use confirmation." }]);
  const listAcceptedStrategyLessons = vi.fn(async () => []);
  const createIntelligenceVersion = vi.fn(async (input: any) => ({ id: 1, ...input }));
  const createIntelligenceComponent = vi.fn();
  const sendTelegramMessage = vi.fn();
  const recordTelegramDelivery = vi.fn();
  const insert = vi.fn();
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(async () => []),
    })),
  }));
  const db = { select, insert, update: vi.fn() };
  return { fetchMarketSeriesBatch, generateScannerDecisions, sendTelegramMessage, recordTelegramDelivery, createStrategyDecision, getSettings, hasRecentStrategyDecision, hasOpenGeneratedSignal, updateStrategyEngineStatus, recordStrategyEngineHealth, getActiveIntelligenceVersion, activateIntelligenceVersion, listIntelligenceComponents, listStrategyRules, listAcceptedStrategyLessons, createIntelligenceVersion, createIntelligenceComponent, insert, db };
});

vi.mock("./db", () => ({
  getDb: vi.fn(async () => db),
  listStrategyRules,
  listAcceptedStrategyLessons,
  getActiveIntelligenceVersion,
  activateIntelligenceVersion,
  listIntelligenceComponents,
  createIntelligenceVersion,
  createIntelligenceComponent,
  getAllRulesText: vi.fn(async () => "Use confirmation."),
  createStrategyDecision,
  getSettings,
  hasRecentStrategyDecision,
  hasOpenGeneratedSignal,
  updateStrategyEngineStatus,
  recordStrategyEngineHealth,
  getRelevantRulesText: vi.fn(async () => "## Rules\nUse confirmation."),
  createStrategyRule: vi.fn(),
  recordTelegramDelivery,
}));

vi.mock("./official-macro", () => ({
  fetchOfficialMacroContext: vi.fn(async () => ({ status: "UNAVAILABLE", bias: "NEUTRAL", summary: "Test macro context unavailable", eventRisk: "NORMAL", interestRateDifferential: null, observations: [], fetchedAt: new Date().toISOString(), stale: true })),
}));

vi.mock("./integrations", () => ({
  fetchMarketSeriesBatch,
  fetchMarketSnapshot: vi.fn(),
  fetchStrategyRulesFromSupabase: vi.fn(async () => []),
  forensicAnalysis: vi.fn(),
  formatApprovedTelegramMessage: vi.fn(() => "approved"),
  formatAuditResult: vi.fn(() => "audit"),
  generateScannerDecisions,
  mirrorToSupabase: vi.fn(),
  sendTelegramMessage,
}));

import { compactStrategyContext, scanUser, shouldNotifyScannerSignal } from "./scanner";

const series = (symbol: string, interval: "15min" | "1h") => {
  const values = [{ open: "0.9", high: "1.1", low: "0.8", close: "1" }, { open: "1.9", high: "2.1", low: "1.8", close: "2" }, { open: "2.9", high: "3.1", low: "2.8", close: "3" }];
  return { symbol, interval, values, close: 3, trend: "UP" as const, marketContext: calculateMarketContext(values), fetchedAt: new Date().toISOString() };
};

const allSeries = () => new Map([
  ["EUR/USD", series("EUR/USD", "15min")],
  ["XAU/USD", series("XAU/USD", "15min")],
  ["GBP/USD", series("GBP/USD", "15min")],
  ["BTC/USD", series("BTC/USD", "15min")],
]);

describe("scanner context bounds", () => {
  it("limits the strategy context to the configured prompt budget", () => {
    expect(compactStrategyContext("a".repeat(20_000), "b".repeat(20_000), 24_000)).toHaveLength(24_000);
    expect(compactStrategyContext("a".repeat(20_000), "b".repeat(20_000), 24_000).startsWith("a".repeat(100))).toBe(true);
  });
});

describe("scanner paper routing without evidence gate", () => {
  beforeEach(() => {
    hasOpenGeneratedSignal.mockReset();
    hasOpenGeneratedSignal.mockResolvedValue(false);
  });

  it("allows only approved outcomes to reach the notification branch", () => {
    expect(shouldNotifyScannerSignal("APPROVED")).toBe(true);
    expect(shouldNotifyScannerSignal("DENIED")).toBe(false);
  });

  it("persists and delivers outcomes generated by the strategy engine", async () => {
    fetchMarketSeriesBatch.mockResolvedValue(allSeries());
    generateScannerDecisions.mockImplementation(async ({ candidates }: any) => candidates.map((candidate: any) => ({
      verdict: "APPROVED",
      confidence: 42,
      adjustments: "Generated from compiled PDF intelligence; no evidence gate",
      asset: candidate.asset,
      timeframe: candidate.timeframe,
      market: candidate.market,
      direction: "SELL",
      entry: 3,
      stopLoss: 3.1,
      takeProfit: 2.8,
      ruleEvidence: [],
      ruleFindings: [],
    })));
    insert.mockImplementation(() => [{ insertId: 42 }]);
    sendTelegramMessage.mockResolvedValue({ delivered: true, telegramMessageId: "7" });
    insert.mockClear();
    sendTelegramMessage.mockClear();
    recordTelegramDelivery.mockClear();

    const result = await scanUser(1);

    expect(result.created).toBe(8);
    expect(insert).toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledTimes(8);
    expect(recordTelegramDelivery).toHaveBeenCalledTimes(8);
    expect(recordTelegramDelivery.mock.calls.every(([input]: any[]) => input.kind === "SIGNAL" && input.status === "DELIVERED" && input.dedupeKey.startsWith("signal:"))).toBe(true);
    expect(createStrategyDecision).toHaveBeenCalled();
    expect(updateStrategyEngineStatus).toHaveBeenCalledWith(1, { status: "AVAILABLE" });
    expect(generateScannerDecisions).not.toHaveBeenCalled();
    expect(createStrategyDecision.mock.calls[0][0].marketSnapshot).toContain("replacementIntelligence");
    expect(createStrategyDecision.mock.calls[0][0].marketSnapshot).toContain("v4ShadowIntelligence");
  });

  it("forwards every retrieved raw snapshot without scanner-side trend or cooldown filtering", async () => {
    const raw = allSeries();
    raw.set("EUR/USD", { ...series("EUR/USD", "15min"), trend: "SIDEWAYS" as any });
    fetchMarketSeriesBatch.mockResolvedValue(raw);
    generateScannerDecisions.mockResolvedValue([]);
    generateScannerDecisions.mockClear();
    createStrategyDecision.mockClear();

    const result = await scanUser(1);

    expect(result.created).toBe(8);
    expect(generateScannerDecisions).not.toHaveBeenCalled();
    expect(createStrategyDecision).toHaveBeenCalled();
    expect(createStrategyDecision.mock.calls.some(([input]: any[]) => input.marketSnapshot.includes('"trend":"SIDEWAYS"'))).toBe(true);
  });

  it("uses replacement intelligence without a separate model-service dependency", async () => {
    fetchMarketSeriesBatch.mockResolvedValue(allSeries());
    generateScannerDecisions.mockRejectedValue(new Error("LLM usage exhausted"));
    insert.mockClear();
    sendTelegramMessage.mockClear();
    recordTelegramDelivery.mockClear();

    const result = await scanUser(1);

    expect(result.created).toBe(8);
    expect(result.marketData).toBe("available");
    expect(sendTelegramMessage).toHaveBeenCalled();
    expect(recordTelegramDelivery).toHaveBeenCalled();
    expect(createStrategyDecision).toHaveBeenCalledWith(expect.objectContaining({ verdict: "APPROVED", generatedDirection: expect.stringMatching(/BUY|SELL/), generatedEntry: expect.any(String) }));
  });

  it("suppresses overlapping active setups without waiting for future scans", async () => {
    fetchMarketSeriesBatch.mockResolvedValue(allSeries());
    hasOpenGeneratedSignal.mockResolvedValue(true);
    sendTelegramMessage.mockClear();
    insert.mockClear();

    const result = await scanUser(1);

    expect(result.created).toBe(0);
    expect(hasOpenGeneratedSignal).toHaveBeenCalledTimes(8);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
    hasOpenGeneratedSignal.mockResolvedValue(false);
  });

  it("routes complete replacement paper outcomes without evidence thresholds", async () => {
    fetchMarketSeriesBatch.mockResolvedValue(allSeries());
    generateScannerDecisions.mockResolvedValue([{ asset: "EUR/USD", timeframe: "15MIN", verdict: "DENIED", confidence: 40, adjustments: "Insufficient rule evidence", ruleEvidence: [], ruleFindings: [], market: series("EUR/USD", "15min") }]);
    insert.mockClear();
    sendTelegramMessage.mockClear();
    recordTelegramDelivery.mockClear();

    const result = await scanUser(1);

    expect(result.created).toBe(8);
    expect(sendTelegramMessage).toHaveBeenCalled();
    expect(recordTelegramDelivery).toHaveBeenCalled();
    expect(createStrategyDecision).toHaveBeenCalledWith(expect.objectContaining({ verdict: "APPROVED", generatedDirection: expect.stringMatching(/BUY|SELL/) }));
  });
});

describe("scanner unavailable-market behavior", () => {
  it("skips all assets without inserting signals when OHLCV polling fails", async () => {
    fetchMarketSeriesBatch.mockImplementation(async () => { throw new Error("Twelve Data quota exhausted"); });
    insert.mockClear();

    const result = await scanUser(1);

    expect(result.created).toBe(0);
    expect(result.tracked).toBe(0);
    expect(result.marketData).toBe("unavailable");
    expect(insert).not.toHaveBeenCalled();
  });
});
