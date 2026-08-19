import { describe, expect, it } from "vitest";
import { formatApprovedTelegramMessage, formatOutcomeTelegramMessage, shouldNotifyApprovedAudit } from "./integrations";
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
  it("includes the complete approved trade context", () => {
    const message = formatApprovedTelegramMessage({
      asset: "EUR/USD",
      timeframe: "15MIN",
      direction: "BUY",
      entry: 1.15805,
      stopLoss: 1.15666,
      takeProfit: 1.16083,
      confidence: 88,
      adjustments: "Wait for confirmation.",
    });

    expect(message).toContain("TradingGuardAI · PAPER SIGNAL");
    expect(message).toContain("BUY EUR/USD · 15MIN");
    expect(message).toContain("Validation: UNVALIDATED · Paper trading only");
    expect(message).toContain("Trade plan");
    expect(message).toContain("Entry: 1.15805");
    expect(message).toContain("Stop loss: 1.15666");
    expect(message).toContain("Take profit: 1.16083");
    expect(message).toContain("Confidence: 88%");
    expect(message).not.toContain("<b>");
  });

  it("includes deterministic source-linked intelligence explanation", () => {
    const message = formatApprovedTelegramMessage({
      asset: "BTC/USD", timeframe: "1H", direction: "BUY", entry: 64488.11, stopLoss: 64346.672, takeProfit: 64770.986, confidence: 63, adjustments: "Model explanation unavailable.",
      decisionTrace: {
        matchedComponents: [{ title: "Higher-high structure", sourceRuleIds: [7], sourceConcept: "Buy when higher highs form.", trigger: "MARKET_STRUCTURE", stance: "BUY", weight: 1, match: "RISING context consistent with BUY evidence" }],
        supportingComponents: ["Higher-high structure"], conflictingComponents: [], scoreSummary: { buyScore: 1, sellScore: 0, dominantDirection: "BUY", confluenceScore: 100 }, levelDerivation: { entry: "Latest raw close rounded to provider precision.", stopLoss: "BUY stop at one volatility risk distance (0.1).", takeProfit: "BUY target at two volatility risk distances for 1:2 paper geometry.", riskDistance: 0.1, riskReward: 2 },
      },
    });
    expect(message).toContain("Deterministic intelligence trace");
    expect(message).toContain("Supporting components: Higher-high structure");
    expect(message).toContain("Score: BUY 1 vs SELL 0");
    expect(message).toContain("Confidence: 63% · Confluence: 100%");
  });

  it("preserves plain-text source and decision content without HTML wrappers", () => {
    const message = formatApprovedTelegramMessage({ asset: "EUR/USD", timeframe: "1H", direction: "BUY", entry: 1, stopLoss: 0.9, takeProfit: 1.2, confidence: 70, adjustments: "Use confirmation & review.", ruleEvidence: ["Rule A & context"] });
    expect(message).toContain("Decision summary\nUse confirmation & review.");
    expect(message).toContain("• Rule A & context");
    expect(message).not.toContain("<b>");
    expect(message).not.toContain("<i>");
  });

  it("formats linked WIN and LOSS paper outcomes", () => {
    const win = formatOutcomeTelegramMessage({ asset: "BTC/USD", timeframe: "15MIN", direction: "BUY", status: "WIN", entry: 65382.36, stopLoss: 65250.0715, takeProfit: 65646.937, closePrice: 65646.937, signalId: 1200010, note: "Closed from live BTC/USD price 65646.937." });
    expect(win).toContain("TradingGuardAI · PAPER OUTCOME");
    expect(win).toContain("<b>WIN · BTC/USD</b> · 15MIN");
    expect(win).toContain("<b>Original signal:</b> BUY · Signal #1200010");
    expect(win).toContain("<b>Result:</b> TARGET REACHED");
    expect(win).toContain("<b>Take profit:</b> 65646.937");
    expect(win).toContain("No live trade was executed");

    const loss = formatOutcomeTelegramMessage({ asset: "EUR/USD", timeframe: "1H", direction: "SELL", status: "LOSS", entry: "1.16000", stopLoss: "1.16140", takeProfit: "1.15720", closePrice: 1.1614, signalId: 1200011, note: "Closed from live EUR/USD price 1.1614." });
    expect(loss).toContain("<b>LOSS · EUR/USD</b> · 1H");
    expect(loss).toContain("<b>Result:</b> STOP LOSS REACHED");
    expect(loss).toContain("Signal #1200011");
  });

  it("renders missing levels safely", () => {
    const message = formatApprovedTelegramMessage({
      asset: "BTC/USD",
      timeframe: "1H",
      direction: "SELL",
      entry: null,
      stopLoss: undefined,
      takeProfit: null,
      confidence: 72,
      adjustments: "No adjustments.",
    });

    expect(message).toContain("Entry: —");
    expect(message).toContain("Stop loss: —");
    expect(message).toContain("Take profit: —");
  });
});
