export function formatChatError(error: unknown, assistantName: string): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("service unavailable") ||
    normalized.includes("unexpected token") ||
    normalized.includes("invalid json") ||
    normalized.includes("failed to fetch")
  ) {
    return `${assistantName} is temporarily unavailable because the response service did not return a valid response. Please try again in a moment.`;
  }

  if (normalized.includes("429") || normalized.includes("rate limit") || normalized.includes("quota")) {
    return `${assistantName} is temporarily rate-limited. Please try again shortly.`;
  }

  return raw.trim() || `${assistantName} could not respond. Please try again shortly.`;
}
