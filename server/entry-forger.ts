export type EntryForgerDirection = "BUY" | "SELL";

export type EntryForgerLevels = {
  ready: true;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: 2;
  targetDistance: number;
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
  const targetDistance = favorableDistance - clearance;
  const minimumDistance = Math.max(relativeBuffer, Math.abs(entry) * MIN_EXECUTABLE_TARGET_RELATIVE_DISTANCE, Number.isFinite(atr) && atr > 0 ? atr * MIN_TARGET_DISTANCE_ATR : 0);
  if (!(targetDistance >= minimumDistance)) return { ready: false, reason: `Entry Forger target boundary is too close for an executable paper setup after clearance; minimum target distance is ${minimumDistance}.` };

  const takeProfit = input.direction === "BUY" ? entry + targetDistance : entry - targetDistance;
  const stopLoss = input.direction === "BUY" ? entry - targetDistance / 2 : entry + targetDistance / 2;
  if (![takeProfit, stopLoss].every(Number.isFinite)) return { ready: false, reason: "Entry Forger calculated non-finite levels." };

  return {
    ready: true,
    entry,
    stopLoss,
    takeProfit,
    riskReward: 2,
    targetDistance,
    reason: `Entry Forger selected a take-profit area before the opposing structural boundary with a ${clearance} clearance buffer, then calculated the stop at half the target distance.`,
  };
}
