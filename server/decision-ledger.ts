import type { StrategyDecision } from "../drizzle/schema";

export type DecisionFilters = {
  asset?: string;
  timeframe?: string;
  verdict?: string;
};

export function filterStrategyDecisions(rows: StrategyDecision[], filters: DecisionFilters = {}) {
  return rows.filter((row) => (!filters.asset || row.asset === filters.asset) && (!filters.timeframe || row.timeframe === filters.timeframe) && (!filters.verdict || row.verdict === filters.verdict));
}

export function serializeDecisionLedgerJson(rows: StrategyDecision[]) {
  return JSON.stringify(rows, null, 2);
}

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializeDecisionLedgerCsv(rows: StrategyDecision[]) {
  const columns: Array<keyof StrategyDecision> = ["id", "asset", "timeframe", "verdict", "confidence", "confluenceScore", "ruleEvidence", "ruleFindings", "marketSnapshot", "generatedDirection", "generatedEntry", "generatedStopLoss", "generatedTakeProfit", "decisionReason", "cooldownKey", "createdAt"];
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
}

export function formatWeeklyJudgmentSummary(rows: Array<Pick<StrategyDecision, "verdict">>, weekLabel: string) {
  const counts = { APPROVED: 0, DENIED: 0, SKIPPED: 0, UNAVAILABLE: 0 };
  rows.forEach((row) => { if (row.verdict in counts) counts[row.verdict as keyof typeof counts] += 1; });
  return [`<b>TradingGuardAI weekly strategy summary</b>`, `<b>Period:</b> ${weekLabel}`, ``, `<b>Strategy-engine judgments</b>`, `Approved: ${counts.APPROVED}`, `Denied: ${counts.DENIED}`, `Skipped by cooldown: ${counts.SKIPPED}`, `Unavailable: ${counts.UNAVAILABLE}`, `Total: ${rows.length}`, ``, `This is a paper-validation summary. The market-data collector does not make trading judgments, and the app does not place trades.`].join("\n");
}
