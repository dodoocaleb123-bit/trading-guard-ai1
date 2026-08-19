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
    expect(message).toContain("<b>BUY EUR/USD</b> · 15MIN");
    expect(message).toContain("<b>Validation:</b> UNVALIDATED · Paper trading only");
    expect(message).toContain("<b>Trade plan</b>");
    expect(message).toContain("<b>Entry:</b> 1.15805");
    expect(message).toContain("<b>Stop loss:</b> 1.15666");
    expect(message).toContain("<b>Take profit:</b> 1.16083");
    expect(message).toContain("<b>Confidence:</b> 88%");
    expect(message).toContain("<i>No live trade is executed.");
  });

  it("includes deterministic source-linked intelligence explanation", () => {
    const message = formatApprovedTelegramMessage({
      asset: "BTC/USD", timeframe: "1H", direction: "BUY", entry: 64488.11, stopLoss: 64346.672, takeProfit: 64770.986, confidence: 63, adjustments: "Model explanation unavailable.",
      decisionTrace: {
        matchedComponents: [{ title: "Higher-high structure", sourceRuleIds: [7], sourceConcept: "Buy when higher highs form.", trigger: "MARKET_STRUCTURE", stance: "BUY", weight: 1, match: "RISING context consistent with BUY evidence" }],
        supportingComponents: ["Higher-high structure"], conflictingComponents: [], scoreSummary: { buyScore: 1, sellScore: 0, dominantDirection: "BUY", confluenceScore: 100 }, levelDerivation: { entry: "Latest raw close rounded to provider precision.", stopLoss: "BUY stop at one volatility risk distance (0.1).", takeProfit: "BUY target at two volatility risk distances for 1:2 paper geometry.", riskDistance: 0.1, riskReward: 2 },
      },
    });
    expect(message).toContain("<b>Deterministic intelligence trace</b>");
    expect(message).toContain("<b>Supporting components:</b> Higher-high structure");
    expect(message).toContain("<b>Score:</b> BUY 1 vs SELL 0");
    expect(message).toContain("<b>Confidence:</b> 63% · <b>Confluence:</b> 100%");
  });

  it("escapes user- and source-provided HTML characters", () => {
    const message = formatApprovedTelegramMessage({ asset: "EUR/<USD", timeframe: "1H", direction: "BUY", entry: 1, stopLoss: 0.9, takeProfit: 1.2, confidence: 70, adjustments: "Use <confirmation> & review.", ruleEvidence: ["Rule <A> & context"] });
    expect(message).toContain("EUR/&lt;USD");
    expect(message).toContain("Use &lt;confirmation&gt; &amp; review.");
    expect(message).toContain("Rule &lt;A&gt; &amp; context");
    expect(message).not.toContain("Use <confirmation>");
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

    expect(message).toContain("<b>Entry:</b> —");
    expect(message).toContain("<b>Stop loss:</b> —");
    expect(message).toContain("<b>Take profit:</b> —");
  });
});
