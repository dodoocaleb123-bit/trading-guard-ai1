import { describe, expect, it } from "vitest";
import { formatApprovedTelegramMessage, formatOutcomeTelegramMessage, formatReasonTelegramMessage, shouldNotifyApprovedAudit } from "./integrations";
import { isAuthorizedScannerCron } from "./scheduled";

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

  it("renders the requested compact signal format", () => {
    const message = formatApprovedTelegramMessage({ asset: "EUR/USD", timeframe: "1H", direction: "SELL", entry: 1.16736, stopLoss: 1.16876, takeProfit: 1.16456, confidence: 84, confluenceScore: 80, decisionTrace: { matchedComponents: [], supportingComponents: [], conflictingComponents: [], scoreSummary: { buyScore: 2, sellScore: 8, dominantDirection: "SELL", confluenceScore: 80 }, levelDerivation: { entry: "", stopLoss: "", takeProfit: "", riskDistance: 0.0014, riskReward: 2 } } });
    expect(message).toBe(["SELL", "EUR/USD · 1H", "Entry: 1.16736", "Stop loss: 1.16876", "Take profit: 1.16456", "Confidence: 84% · Confluence: 80%", "Score: BUY 2 vs SELL 8", "Paper only · UNVALIDATED"].join("\n"));
    expect(message).not.toContain("Decision summary");
    expect(message).not.toContain("<b>");
  });

  it("renders compact outcomes with the original signal direction", () => {
    const win = formatOutcomeTelegramMessage({ asset: "BTC/USD", timeframe: "15MIN", direction: "BUY", status: "WIN", entry: 65382.36, stopLoss: 65250.0715, takeProfit: 65646.937, closePrice: 65646.937, signalId: 1200010 });
    expect(win).toBe(["WIN", "BUY", "BTC/USD · 15MIN", "Entry: 65382.36", "Paper only · UNVALIDATED"].join("\n"));
    const loss = formatOutcomeTelegramMessage({ asset: "EUR/USD", timeframe: "1H", direction: "SELL", status: "LOSS", entry: "1.16000", stopLoss: "1.16140", takeProfit: "1.15720", closePrice: 1.1614, signalId: 1200011 });
    expect(loss).toContain("LOSS\nSELL\nEUR/USD · 1H");
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
