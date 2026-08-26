export type EntryForgerDirection = "BUY" | "SELL";

export type EntryForgerDashboardState = {
  status: "WAITING" | "READY" | "EMITTED" | "REJECTED";
  reason: string;
  targetBoundary: number | null;
  targetDistance: number | null;
  riskReward: number | null;
  updatedAt: string;
};

export function buildEntryForgerDashboardState(status: EntryForgerDashboardState["status"], reason: string, details: Partial<Omit<EntryForgerDashboardState, "status" | "reason" | "updatedAt">> = {}, updatedAt = new Date()) {
  return { status, reason, targetBoundary: details.targetBoundary ?? null, targetDistance: details.targetDistance ?? null, riskReward: details.riskReward ?? null, updatedAt: updatedAt.toISOString() } satisfies EntryForgerDashboardState;
}

export type EntryForgerLevels = {
  ready: true;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: 2;
  targetDistance: number;
  structuralTargetDistance: number;
  reason: string;
} | {
  ready: false;
  reason: string;
};

const MIN_RELATIVE_DISTANCE = 0.00005;
const MIN_EXECUTABLE_TARGET_RELATIVE_DISTANCE = 0.0012;
const TARGET_CLEARANCE_ATR = 0.15;
const MIN_TARGET_DISTANCE_ATR = 0.5;

export function canUseEntryForgerFallback(input: {
  locatorReady: boolean;
  geometryDenied: boolean;
  v4Active: boolean;
  strategyApproved: boolean;
  qualityApproved: boolean;
  hasCompleteLevels: boolean;
  activeSignal: boolean;
}): boolean {
  return !input.locatorReady && input.geometryDenied && input.v4Active && input.strategyApproved && input.qualityApproved && input.hasCompleteLevels && !input.activeSignal;
}

export function deriveEntryForgerLevels(input: { entry: number; direction: EntryForgerDirection; targetBoundary?: number | null; atr?: number | null }): EntryForgerLevels {
  const entry = Number(input.entry);
  const boundary = input.targetBoundary == null ? Number.NaN : Number(input.targetBoundary);
  const atr = Number(input.atr ?? 0);
  if (!Number.isFinite(entry) || !Number.isFinite(boundary)) return { ready: false, reason: "Entry Forger has no finite structural target boundary." };

  const favorableDistance = input.direction === "BUY" ? boundary - entry : entry - boundary;
  if (!(favorableDistance > 0)) return { ready: false, reason: "Entry Forger target boundary is not favorable to the detected direction." };

  const relativeBuffer = Math.max(Math.abs(entry) * MIN_RELATIVE_DISTANCE, Number.EPSILON);
  const atrBuffer = Number.isFinite(atr) && atr > 0 ? atr * TARGET_CLEARANCE_ATR : 0;
  const clearance = Math.max(relativeBuffer, atrBuffer);
  const structuralTargetDistance = favorableDistance - clearance;
  const minimumDistance = Math.max(relativeBuffer, Math.abs(entry) * MIN_EXECUTABLE_TARGET_RELATIVE_DISTANCE, Number.isFinite(atr) && atr > 0 ? atr * MIN_TARGET_DISTANCE_ATR : 0);
  const minimumStructuralDistance = minimumDistance * 2;
  if (!(structuralTargetDistance >= minimumStructuralDistance)) return { ready: false, reason: `Entry Forger target boundary is too close for an executable paper setup after clearance; the cleared structural distance must be at least ${minimumStructuralDistance} so its midpoint remains executable.` };

  const targetDistance = structuralTargetDistance / 2;
  const stopDistance = targetDistance / 2;
  const takeProfit = input.direction === "BUY" ? entry + targetDistance : entry - targetDistance;
  const stopLoss = input.direction === "BUY" ? entry - stopDistance : entry + stopDistance;
  if (![takeProfit, stopLoss].every(Number.isFinite)) return { ready: false, reason: "Entry Forger calculated non-finite levels." };

  return {
    ready: true,
    entry,
    stopLoss,
    takeProfit,
    riskReward: 2,
    targetDistance,
    structuralTargetDistance,
    reason: `Entry Forger selected the take-profit halfway from entry to the cleared opposing structural boundary (${clearance} clearance), then calculated the stop at half the take-profit distance.`,
  };
}
