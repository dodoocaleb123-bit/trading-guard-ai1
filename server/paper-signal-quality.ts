export const MIN_PAPER_SIGNAL_CONFIDENCE = 60;
export const MIN_PAPER_SIGNAL_CONFLUENCE = 45;

export function hasMinimumPaperSignalQuality(confidence: number | string | null | undefined, confluence: number | string | null | undefined) {
  const normalizedConfidence = Number(confidence);
  const normalizedConfluence = Number(confluence);
  return Number.isFinite(normalizedConfidence)
    && Number.isFinite(normalizedConfluence)
    && normalizedConfidence >= MIN_PAPER_SIGNAL_CONFIDENCE
    && normalizedConfluence >= MIN_PAPER_SIGNAL_CONFLUENCE;
}

export function describePaperSignalQuality(confidence: number | string | null | undefined, confluence: number | string | null | undefined) {
  const normalizedConfidence = Number(confidence);
  const normalizedConfluence = Number(confluence);
  return `confidence/confluence must meet ${MIN_PAPER_SIGNAL_CONFIDENCE}%/${MIN_PAPER_SIGNAL_CONFLUENCE}% (received ${Number.isFinite(normalizedConfidence) ? Math.round(normalizedConfidence) : "—"}%/${Number.isFinite(normalizedConfluence) ? Math.round(normalizedConfluence) : "—"}%).`;
}
