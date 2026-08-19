import { describe, expect, it } from "vitest";
import { formatApprovedTelegramMessage, shouldNotifyApprovedAudit } from "./integrations";
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

    expect(message).toContain("TradingGuardAI approved trade");
    expect(message).toContain("Asset: EUR/USD");
    expect(message).toContain("Timeframe: 15MIN");
    expect(message).toContain("Direction: BUY");
    expect(message).toContain("Entry: 1.15805");
    expect(message).toContain("Stop Loss: 1.15666");
    expect(message).toContain("Take Profit: 1.16083");
    expect(message).toContain("Confidence: 88%");
  });

  it("includes deterministic source-linked intelligence explanation", () => {
    const message = formatApprovedTelegramMessage({
      asset: "BTC/USD", timeframe: "1H", direction: "BUY", entry: 64488.11, stopLoss: 64346.672, takeProfit: 64770.986, confidence: 63, adjustments: "Model explanation unavailable.",
      decisionTrace: {
        matchedComponents: [{ title: "Higher-high structure", sourceRuleIds: [7], sourceConcept: "Buy when higher highs form.", trigger: "MARKET_STRUCTURE", stance: "BUY", weight: 1, match: "RISING context consistent with BUY evidence" }],
        supportingComponents: ["Higher-high structure"], conflictingComponents: [], scoreSummary: { buyScore: 1, sellScore: 0, dominantDirection: "BUY", confluenceScore: 100 }, levelDerivation: { entry: "Latest raw close rounded to provider precision.", stopLoss: "BUY stop at one volatility risk distance (0.1).", takeProfit: "BUY target at two volatility risk distances for 1:2 paper geometry.", riskDistance: 0.1, riskReward: 2 },
      },
    });
    expect(message).toContain("Deterministic intelligence explanation:");
    expect(message).toContain("Higher-high structure");
    expect(message).toContain("Score: BUY 1 vs SELL 0");
    expect(message).toContain("Confluence: 100%");
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
    expect(message).toContain("Stop Loss: —");
    expect(message).toContain("Take Profit: —");
  });
});
