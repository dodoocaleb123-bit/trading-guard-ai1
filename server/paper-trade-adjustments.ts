export type PaperSignalForAdjustment = {
  id: number;
  asset: string;
  timeframe: string;
  direction: "BUY" | "SELL";
  entry: string | number;
  stopLoss: string | number;
  takeProfit: string | number;
};

export type CurrentV4DecisionForAdjustment = {
  direction: "BUY" | "SELL";
  confidence: number;
  confluenceScore: number;
  setupIndicators?: Array<{ id?: string; direction?: "BUY" | "SELL" | "NEUTRAL"; strength?: string; observation?: string; contribution?: number }>;
  decisionTrace?: { supportingComponents?: string[]; conflictingComponents?: string[] };
};

export type PaperTradeContradiction = {
  observedDirection: "BUY" | "SELL";
  confidence: number;
  confluenceScore: number;
  action: "REVIEW_DIRECTION" | "TIGHTEN_STOP" | "EXIT_PAPER_SETUP";
  reason: string;
  evidence: {
    opposingIndicators: string[];
    supportingComponents: string[];
    conflictingComponents: string[];
    currentPrice: number;
    originalEntry: number;
    originalStopLoss: number;
    originalTakeProfit: number;
    suggestedStopLoss?: number;
  };
  fingerprint: string;
};

export function detectPaperTradeContradiction(signal: PaperSignalForAdjustment, currentPrice: number, decision: CurrentV4DecisionForAdjustment): PaperTradeContradiction | null {
  if (!Number.isFinite(currentPrice) || decision.direction === signal.direction) return null;
  const confidence = Number(decision.confidence);
  const confluenceScore = Number(decision.confluenceScore);
  const opposingIndicators = (decision.setupIndicators ?? [])
    .filter((indicator) => indicator.direction === decision.direction)
    .map((indicator) => indicator.id ?? indicator.observation ?? "opposing directional indicator")
    .filter(Boolean)
    .slice(0, 8);
  if (!opposingIndicators.length || confidence < 60 || confluenceScore < 55) return null;

  const entry = Number(signal.entry);
  const stopLoss = Number(signal.stopLoss);
  const takeProfit = Number(signal.takeProfit);
  const risk = Math.abs(stopLoss - entry);
  const favorable = risk > 0 && (signal.direction === "BUY" ? currentPrice >= entry + risk * 0.5 : currentPrice <= entry - risk * 0.5);
  const strongReversal = confidence >= 75 && confluenceScore >= 70;
  const action = strongReversal ? "EXIT_PAPER_SETUP" : favorable ? "TIGHTEN_STOP" : "REVIEW_DIRECTION";
  const suggestedStopLoss = action === "TIGHTEN_STOP" ? entry : undefined;
  const actionText = action === "EXIT_PAPER_SETUP" ? "Review exit of the original paper setup; the current v4 direction is strongly opposed." : action === "TIGHTEN_STOP" ? "Consider tightening the paper stop to the original entry because the setup has moved favorably while direction has contradicted." : "Reassess the original paper setup; do not add to the position while the current direction conflicts.";
  const reason = `Current v4 indicates ${decision.direction}, contradicting the original ${signal.direction} paper signal. ${actionText}`;
  const supportingComponents = decision.decisionTrace?.supportingComponents ?? [];
  const conflictingComponents = decision.decisionTrace?.conflictingComponents ?? [];
  const fingerprint = `${signal.id}:${decision.direction}:${opposingIndicators.join(",")}:${action}`;
  return { observedDirection: decision.direction, confidence, confluenceScore, action, reason, evidence: { opposingIndicators, supportingComponents, conflictingComponents, currentPrice, originalEntry: entry, originalStopLoss: stopLoss, originalTakeProfit: takeProfit, ...(suggestedStopLoss == null ? {} : { suggestedStopLoss }) }, fingerprint };
}
