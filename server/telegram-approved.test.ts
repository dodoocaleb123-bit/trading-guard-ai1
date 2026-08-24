import { describe, expect, it } from "vitest";
import { formatApprovedTelegramMessage, formatOutcomeCorrectionTelegramMessage, formatOutcomeTelegramMessage, formatPaperTradeContradictionWarningTelegramMessage, formatPaperTradeUpgradeTelegramMessage, formatReasonTelegramMessage, shouldNotifyApprovedAudit } from "./integrations";
import { isAuthorizedScannerCron, isCronAuthenticationFailure } from "./scheduled";

describe("approved Telegram signal formatting", () => {
  it("notifies only for approved audit verdicts", () => {
    expect(shouldNotifyApprovedAudit("APPROVED")).toBe(true);
    expect(shouldNotifyApprovedAudit("DENIED")).toBe(false);
    expect(shouldNotifyApprovedAudit("PENDING")).toBe(false);
  });

  it("accepts only authenticated cron identities for scanner execution", () => {
    expect(isAuthorizedScannerCron({ isCron: true, taskUid: "task-123" })).toBe(true);
    expect(isAuthorizedScannerCron({ isCron: true, taskUid: null })).toBe(false);
    expect(isAuthorizedScannerCron({ isCron: false, taskUid: "task-123" })).toBe(false);
  });

  it("classifies invalid cron authentication for a clear 403 response", () => {
    expect(isCronAuthenticationFailure(new Error("Invalid session cookie"))).toBe(true);
    expect(isCronAuthenticationFailure(new Error("Missing session cookie"))).toBe(true);
    expect(isCronAuthenticationFailure(new Error("Twelve Data timeout"))).toBe(false);
  });

  it("renders the requested compact signal format", () => {
    const message = formatApprovedTelegramMessage({ asset: "EUR/USD", timeframe: "1H", direction: "SELL", entry: 1.16736, stopLoss: 1.16876, takeProfit: 1.16456, confidence: 84, riskReward: 2, confluenceScore: 80, decisionTrace: { matchedComponents: [], supportingComponents: [], conflictingComponents: [], scoreSummary: { buyScore: 2, sellScore: 8, dominantDirection: "SELL", confluenceScore: 80 }, levelDerivation: { entry: "", stopLoss: "", takeProfit: "", riskDistance: 0.0014, riskReward: 2 } } });
    expect(message).toBe(["SELL", "EUR/USD · 1H", "Entry: 1.16736", "Stop loss: 1.16876", "Take profit: 1.16456", "Risk/reward: 1:2", "Confidence: 84% · Confluence: 80%", "Score: BUY 2 vs SELL 8", "Paper only · UNVALIDATED · v4 active"].join("\n"));
    expect(message).not.toContain("Decision summary");
    expect(message).not.toContain("<b>");
  });

  it("renders compact outcomes with the original signal direction", () => {
    const win = formatOutcomeTelegramMessage({ asset: "BTC/USD", timeframe: "15MIN", direction: "BUY", status: "WIN", entry: 65382.36, stopLoss: 65250.0715, takeProfit: 65646.937, closePrice: 65646.937, signalId: 1200010 });
    expect(win).toBe(["WIN", "BUY", "BTC/USD · 15MIN", "Entry: 65382.36", "Paper only · UNVALIDATED"].join("\n"));
    const loss = formatOutcomeTelegramMessage({ asset: "EUR/USD", timeframe: "1H", direction: "SELL", status: "LOSS", entry: "1.16000", stopLoss: "1.16140", takeProfit: "1.15720", closePrice: 1.1614, signalId: 1200011 });
    expect(loss).toContain("LOSS\nSELL\nEUR/USD · 1H");
  });

  it("renders a concise warning when contradiction cannot qualify a replacement", () => {
    const message = formatPaperTradeContradictionWarningTelegramMessage({ signalId: 14580001, asset: "GBP/USD", timeframe: "1H", originalDirection: "SELL", observedDirection: "BUY", currentPrice: 1.36538, confidence: 84, confluenceScore: 83, reason: "The opposing setup has not passed the replacement gates." });
    expect(message).toContain("PAPER WARNING");
    expect(message).toContain("no replacement signal was issued");
    expect(message).toContain("Paper only · UNVALIDATED");
    expect(message).not.toContain("Entry:");
  });

  it("renders an auditable correction for a retracted outcome", () => {
    const message = formatOutcomeCorrectionTelegramMessage({ asset: "XAU/USD", timeframe: "1H", direction: "BUY", entry: "4607.84380000", signalId: 14610004, reason: "The earlier tracker used a pre-entry candle range." });
    expect(message).toContain("OUTCOME CORRECTION");
    expect(message).toContain("earlier WIN notification was incorrect and has been retracted");
    expect(message).toContain("OPEN/PENDING");
    expect(message).toContain("Paper only · UNVALIDATED");
  });

  it("renders replacement upgrades with real Telegram line breaks", () => {
    const message = formatPaperTradeUpgradeTelegramMessage({ signalId: 14580001, replacementSignalId: 14580003, asset: "GBP/USD", timeframe: "1H", direction: "BUY", entry: 1.36538, stopLoss: 1.36356, takeProfit: 1.36902, confidence: 84, riskReward: 2, confluenceScore: 83, reason: "The opposing setup passed the Entry Locator.", improvements: ["Momentum confirmation"] });
    expect(message).toContain("PAPER SETUP UPGRADE\nOriginal signal #14580001");
    expect(message).not.toContain("\\n");
    expect(message).toContain("Risk/reward: 1:2");
    expect(message).toContain("Paper only · UNVALIDATED");
  });

  it("renders detailed Reason explanations from stored signal metadata", () => {
    const message = formatReasonTelegramMessage({ signalId: 1200012, asset: "EUR/USD", timeframe: "1H", direction: "SELL", entry: 1.16736, stopLoss: 1.16876, takeProfit: 1.16456, confidence: 84, rationale: "Macro context was neutral; v2 structure and momentum favored SELL.", intelligenceVersion: "forex-trading-combined-document-v3", intelligenceComponents: JSON.stringify(["Momentum confirmation", "Resistance rejection"]), marketRegime: "TRENDING_DOWN", marketSnapshot: JSON.stringify({ fundamentalContext: { status: "UNAVAILABLE", bias: "NEUTRAL", summary: "No macro direction was fabricated." }, replacementIntelligence: { decisionTrace: { scoreSummary: { buyScore: 2, sellScore: 8, confluenceScore: 80 } } } }) });
    expect(message).toContain("TradingGuardAI · REASON");
    expect(message).toContain("Decision details");
    expect(message).toContain("Macro context");
    expect(message).toContain("BUY 2 vs SELL 8");
    expect(message).toContain("Momentum confirmation");
  });

  it("renders missing levels safely", () => {
    const message = formatApprovedTelegramMessage({ asset: "BTC/USD", timeframe: "1H", direction: "SELL", entry: null, stopLoss: undefined, takeProfit: null, confidence: 72 });
    expect(message).toContain("Entry: —");
    expect(message).toContain("Stop loss: —");
    expect(message).toContain("Take profit: —");
    expect(message).toContain("Paper only · UNVALIDATED");
  });
});
