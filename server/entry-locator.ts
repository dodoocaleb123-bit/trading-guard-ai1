export type LocatorStatus = "WAITING" | "READY" | "EMITTED";

export type EntryLocatorObservation = {
  fingerprint: string;
  observedAt: string;
  direction: "BUY" | "SELL";
  confidence: number;
  confluence: number;
  marketRegime: string;
  eventRisk: "HIGH" | "NORMAL" | "UNKNOWN";
  geometryFallback: boolean;
  supportingComponents: string[];
  conflictingComponents: string[];
};

export type EntryLocatorSnapshot = EntryLocatorObservation & { receivedAt: string };

export type EntryLocatorState = {
  status: LocatorStatus;
  snapshotCount: number;
  lastSnapshotAt: string | null;
  lastEmittedFingerprint: string | null;
  snapshots: EntryLocatorSnapshot[];
  waitReason: string;
};

export type EntryLocatorResult = {
  state: EntryLocatorState;
  ready: boolean;
  reason: string;
  selectedObservation: EntryLocatorObservation | null;
};

const WINDOW_SIZE = 6;
const MAX_OBSERVATION_AGE_MS = 2 * 60 * 60 * 1000;

export function createEmptyEntryLocatorState(): EntryLocatorState {
  return { status: "WAITING", snapshotCount: 0, lastSnapshotAt: null, lastEmittedFingerprint: null, snapshots: [], waitReason: "Accumulating distinct market snapshots." };
}

function normalizeState(input: Partial<EntryLocatorState> | null | undefined): EntryLocatorState {
  const base = createEmptyEntryLocatorState();
  const snapshots = Array.isArray(input?.snapshots) ? input.snapshots.filter((snapshot): snapshot is EntryLocatorSnapshot => Boolean(snapshot?.fingerprint && snapshot?.observedAt && (snapshot.direction === "BUY" || snapshot.direction === "SELL"))).slice(-WINDOW_SIZE) : [];
  return { ...base, ...input, snapshots, snapshotCount: Math.max(Number(input?.snapshotCount ?? 0), snapshots.length), status: input?.status === "EMITTED" || input?.status === "READY" ? input.status : "WAITING" };
}

function parseTime(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function isFresh(snapshot: EntryLocatorSnapshot, nowMs: number) {
  const time = parseTime(snapshot.observedAt);
  return time != null && nowMs - time <= MAX_OBSERVATION_AGE_MS && time <= nowMs + 5 * 60 * 1000;
}

const STRONG_INDICATOR_FAMILIES = [
  /structure|trend|higher high|lower low/i,
  /support|resistance|level|liquidity/i,
  /breakout|fakeout|reversal|pullback|trendline|channel/i,
  /momentum|macd|ema|moving average|rsi|stochastic|bollinger|volume|fibonacci/i,
  /macro|fundamental|event|interest rate|employment|inflation/i,
];

export function countStrongSetupIndicators(components: string[]) {
  return STRONG_INDICATOR_FAMILIES.reduce((count, family) => count + (components.some((component) => family.test(component)) ? 1 : 0), 0);
}

function majorityDirection(snapshots: EntryLocatorSnapshot[]): "BUY" | "SELL" | null {
  const buy = snapshots.filter((snapshot) => snapshot.direction === "BUY").length;
  const sell = snapshots.length - buy;
  if (buy === sell) return null;
  return buy > sell ? "BUY" : "SELL";
}

export function advanceEntryLocator(input: {
  previous?: Partial<EntryLocatorState> | null;
  observation: EntryLocatorObservation;
  now?: Date;
  hasOpenSignal: boolean;
}): EntryLocatorResult {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  let state = normalizeState(input.previous);
  const observationTime = parseTime(input.observation.observedAt);
  if (observationTime == null || nowMs - observationTime > MAX_OBSERVATION_AGE_MS || observationTime > nowMs + 5 * 60 * 1000) {
    state = { ...state, status: "WAITING", waitReason: "Waiting for a fresh, UTC-normalized market snapshot." };
    return { state, ready: false, reason: state.waitReason, selectedObservation: null };
  }

  if (state.status === "EMITTED" && !input.hasOpenSignal && state.lastEmittedFingerprint !== input.observation.fingerprint) {
    state = { ...createEmptyEntryLocatorState(), lastEmittedFingerprint: state.lastEmittedFingerprint };
  }
  if (state.snapshots.some((snapshot) => snapshot.fingerprint === input.observation.fingerprint)) {
    const freshSnapshots = state.snapshots.filter((snapshot) => isFresh(snapshot, nowMs));
    state = { ...state, snapshots: freshSnapshots, snapshotCount: Math.max(state.snapshotCount, freshSnapshots.length), status: input.hasOpenSignal ? "EMITTED" : state.status === "EMITTED" ? "EMITTED" : "WAITING", lastSnapshotAt: input.observation.observedAt };
    return { state, ready: false, reason: input.hasOpenSignal ? "Active paper setup already exists; duplicate snapshot suppressed." : "Duplicate snapshot fingerprint; waiting for a changed setup observation.", selectedObservation: null };
  }

  const snapshot: EntryLocatorSnapshot = { ...input.observation, receivedAt: now.toISOString() };
  const snapshots = [...state.snapshots.filter((item) => isFresh(item, nowMs)), snapshot].slice(-WINDOW_SIZE);
  const direction = majorityDirection(snapshots);
  const sameDirection = direction ? snapshots.filter((item) => item.direction === direction) : [];
  const latest = snapshots.at(-1) ?? snapshot;
  const averageConfidence = sameDirection.length ? sameDirection.reduce((sum, item) => sum + item.confidence, 0) / sameDirection.length : 0;
  const averageConfluence = sameDirection.length ? sameDirection.reduce((sum, item) => sum + item.confluence, 0) / sameDirection.length : 0;
  const conflictCount = latest.conflictingComponents.length;
  const strongIndicatorCount = countStrongSetupIndicators(latest.supportingComponents);
  const hasEnoughIndicators = strongIndicatorCount >= 1;
  const hasQuality = strongIndicatorCount >= 2 ? averageConfidence >= 60 && averageConfluence >= 45 : averageConfidence >= 68 && averageConfluence >= 45;
  const hasCoherentGeometry = !latest.geometryFallback;
  const hasHighImpactRisk = latest.eventRisk === "HIGH";
  const riskReady = !hasHighImpactRisk || (averageConfidence >= 72 && sameDirection.length >= 2 && strongIndicatorCount >= 2);
  const ready = !input.hasOpenSignal && Boolean(direction) && hasEnoughIndicators && hasQuality && hasCoherentGeometry && riskReady && latest.direction === direction;

  let reason = "Accumulating distinct snapshots until the same setup repeats with coherent evidence.";
  if (input.hasOpenSignal) reason = "Active paper setup already exists; new setup evidence is tracked but no duplicate is emitted.";
  else if (!direction) reason = "BUY and SELL evidence are currently tied or mixed; waiting for resolution.";
  else if (!hasEnoughIndicators) reason = "Waiting for at least one strong setup indicator from the catalog-derived evidence families.";
  else if (!hasQuality) reason = `Setup evidence found, but confidence/confluence remain below the ${strongIndicatorCount >= 2 ? "60%/45%" : "68%/45%"} threshold (${Math.round(averageConfidence)}%/${Math.round(averageConfluence)}%).`;
  else if (!hasCoherentGeometry) reason = "Setup repeated, but structural target geometry is crowded; waiting for coherent 2R space.";
  else if (!riskReady) reason = "High-impact event risk is present; waiting for two consistent observations and at least two independent setup families.";
  else if (conflictCount > 0) reason = `Setup is eligible after ranking, with ${conflictCount} conflicting component(s) retained in the audit trace and ${strongIndicatorCount} supporting setup family/families.`;
  else if (ready) reason = `Entry signal located from ${strongIndicatorCount} strong setup family/families without requiring every catalog indicator.`;

  const nextState: EntryLocatorState = {
    status: ready ? "READY" : input.hasOpenSignal ? "EMITTED" : "WAITING",
    snapshotCount: state.snapshotCount + 1,
    lastSnapshotAt: input.observation.observedAt,
    lastEmittedFingerprint: state.lastEmittedFingerprint,
    snapshots,
    waitReason: reason,
  };
  return { state: nextState, ready, reason, selectedObservation: ready ? latest : null };
}

export function markEntryLocatorEmitted(stateInput: Partial<EntryLocatorState>, fingerprint: string, emittedAt: Date = new Date()): EntryLocatorState {
  const state = normalizeState(stateInput);
  return { ...state, status: "EMITTED", lastEmittedFingerprint: fingerprint, lastSnapshotAt: state.lastSnapshotAt ?? emittedAt.toISOString(), waitReason: "Paper signal emitted; waiting for a materially changed setup after outcome resolution." };
}
