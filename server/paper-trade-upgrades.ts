import { countStrongSetupIndicators } from "./entry-locator";
import { ALLOWED_RISK_REWARD_RATIOS } from "./replacement-intelligence";

export type ActivePaperSignalForUpgrade = {
  id: number;
  asset: string;
  timeframe: string;
  direction: "BUY" | "SELL";
  confidence: string | number;
  confluenceScore?: string | number | null;
  intelligenceComponents?: string | null;
  marketRegime?: string | null;
};

export type CandidateForUpgrade = {
  direction: "BUY" | "SELL";
  confidence: number;
  confluenceScore: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward?: number;
  marketRegime?: string | null;
  ruleEvidence?: string[];
  decisionTrace?: { supportingComponents?: string[]; conflictingComponents?: string[] };
};

export type PaperTradeUpgrade = {
  score: number;
  confidenceDelta: number;
  confluenceDelta: number;
  previousStrongFamilies: number;
  newStrongFamilies: number;
  reason: string;
  evidence: {
    improvements: string[];
    previousConfidence: number;
    newConfidence: number;
    previousConfluence: number;
    newConfluence: number;
    previousComponents: string[];
    newComponents: string[];
    previousRegime: string;
    newRegime: string;
  };
  fingerprint: string;
};

function parseComponents(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export function compareStrongerSameDirectionSetup(active: ActivePaperSignalForUpgrade, candidate: CandidateForUpgrade): PaperTradeUpgrade | null {
  if (active.direction !== candidate.direction || candidate.confidence < 60 || candidate.confluenceScore < 45) return null;
  if (![candidate.entry, candidate.stopLoss, candidate.takeProfit].every(Number.isFinite)) return null;
  if (candidate.riskReward != null && !(ALLOWED_RISK_REWARD_RATIOS as readonly number[]).includes(Number(candidate.riskReward))) return null;

  const previousComponents = parseComponents(active.intelligenceComponents);
  const newComponents = candidate.decisionTrace?.supportingComponents ?? candidate.ruleEvidence ?? [];
  const previousConfidence = Number(active.confidence);
  const previousConfluence = Number(active.confluenceScore ?? 0);
  const confidenceDelta = candidate.confidence - previousConfidence;
  const confluenceDelta = candidate.confluenceScore - previousConfluence;
  const previousStrongFamilies = countStrongSetupIndicators(previousComponents);
  const newStrongFamilies = countStrongSetupIndicators(newComponents);
  const improvements: string[] = [];
  let score = 0;

  if (confidenceDelta >= 8) { score += 2; improvements.push(`confidence increased by ${Math.round(confidenceDelta)} points`); }
  else if (confidenceDelta >= 4) { score += 1; improvements.push(`confidence increased by ${Math.round(confidenceDelta)} points`); }
  if (confluenceDelta >= 10) { score += 2; improvements.push(`confluence increased by ${Math.round(confluenceDelta)} points`); }
  else if (confluenceDelta >= 5) { score += 1; improvements.push(`confluence increased by ${Math.round(confluenceDelta)} points`); }
  if (newStrongFamilies > previousStrongFamilies) { score += 2; improvements.push(`strong indicator families increased from ${previousStrongFamilies} to ${newStrongFamilies}`); }
  if ((candidate.decisionTrace?.conflictingComponents?.length ?? 0) === 0) { score += 1; improvements.push("the replacement candidate has no retained conflicting components"); }
  if (candidate.marketRegime && candidate.marketRegime !== active.marketRegime) { score += 1; improvements.push(`market regime changed to ${candidate.marketRegime}`); }

  const hasMaterialImprovement = confidenceDelta >= 4 || confluenceDelta >= 5 || newStrongFamilies > previousStrongFamilies || (candidate.decisionTrace?.conflictingComponents?.length ?? 0) === 0;
  if (!hasMaterialImprovement || score < 3) return null;

  const reason = `A stronger ${candidate.direction} setup replaced the unresolved paper thesis: ${improvements.join("; ")}.`;
  const fingerprint = `${active.id}:${candidate.direction}:${candidate.entry}:${candidate.stopLoss}:${candidate.takeProfit}:${Math.round(candidate.confidence)}:${Math.round(candidate.confluenceScore)}:${newComponents.join(",")}`;
  return {
    score,
    confidenceDelta,
    confluenceDelta,
    previousStrongFamilies,
    newStrongFamilies,
    reason,
    evidence: {
      improvements,
      previousConfidence,
      newConfidence: candidate.confidence,
      previousConfluence,
      newConfluence: candidate.confluenceScore,
      previousComponents,
      newComponents,
      previousRegime: active.marketRegime ?? "UNKNOWN",
      newRegime: candidate.marketRegime ?? "UNKNOWN",
    },
    fingerprint,
  };
}

export function buildUpgradePaperAdjustmentReason(upgrade: PaperTradeUpgrade) {
  return `${upgrade.reason} The original signal remains preserved for audit history and is superseded, not scored as WIN or LOSS.`;
}

export function buildUpgradeTelegramDedupeKey(signalId: number, fingerprint: string) {
  return `upgrade:${signalId}:${fingerprint}`;
}
