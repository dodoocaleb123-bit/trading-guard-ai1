import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const homeSource = readFileSync(fileURLToPath(new URL("./Home.tsx", import.meta.url)), "utf8");

describe("dashboard terminology", () => {
  it("describes the scanner as a raw market-data collector", () => {
    expect(homeSource).toContain('title="Market data collector"');
    expect(homeSource).toContain("The external scheduler triggers collection of raw");
    expect(homeSource).toContain("Pause data collection");
  });

  it("describes the strategy-rules algorithm as the judgment and signal layer", () => {
    expect(homeSource).toContain("The strategy-rules algorithm analyzes that data and generates supported outcomes");
    expect(homeSource).toContain("The strategy-rules algorithm generates signals only when");
    expect(homeSource).toContain("strategy-engine judgments");
  });

  it("exposes the v4 source comparison controls and provenance labels", () => {
    expect(homeSource).toContain("V4 source performance");
    expect(homeSource).toContain("Filter source performance by asset");
    expect(homeSource).toContain("Filter source performance by timeframe");
    expect(homeSource).toContain("Filter source performance by signal source");
    expect(homeSource).toContain("Entry Locator");
    expect(homeSource).toContain("Entry Forger");
  });

  it("configures live dashboard queries to refresh and refetch on focus", () => {
    expect(homeSource).toContain("const LIVE_QUERY_OPTIONS");
    expect(homeSource).toContain("refetchInterval: 60_000");
    expect(homeSource).toContain("refetchOnWindowFocus: true");
    expect(homeSource).toContain("trpc.signals.list.useQuery");
    expect(homeSource).toContain("trpc.scanner.health.useQuery");
  });

  it("distinguishes candle time from scanner state-save time", () => {
    expect(homeSource).toContain("last candle");
    expect(homeSource).toContain("lastSnapshotAt");
    expect(homeSource).toContain("state saved");
    expect(homeSource).toContain("row.updatedAt");
  });

  it("exposes provider-quota warning details for unavailable scanner cycles", () => {
    expect(homeSource).toContain("Twelve Data quota or rate-limit warning");
    expect(homeSource).toContain("Latest affected interval");
    expect(homeSource).toContain("detected");
    expect(homeSource).toContain("latestProviderIssue.at");
    expect(homeSource).toContain("no Entry Locator or Entry Forger signal");
  });

  it("keeps scheduler-operated diagnostics out of the Scanner page", () => {
    expect(homeSource).not.toContain("<ScannerCadenceDiagnostics />");
    expect(homeSource).not.toContain("<CallbackStatusCard />");
    expect(homeSource).not.toContain("Recent app-side run history");
    expect(homeSource).not.toContain("Activate 5-min schedule");
    expect(homeSource).toContain("External scheduler controls the collection cadence");
  });

  it("does not reintroduce scanner-decision wording in the revised pages", () => {
    expect(homeSource).not.toContain("scanner decisions");
    expect(homeSource).not.toContain("scanner candidates reference");
  });

  it("keeps only recommended operational cards after optional-card cleanup", () => {
    expect(homeSource).toContain("<EntryLocatorCard />");
    expect(homeSource).toContain("<EntryForgerCard />");
    expect(homeSource).toContain("Strategy-engine decision ledger");
    expect(homeSource).not.toContain("<ScannerCadenceDiagnostics");
    expect(homeSource).not.toContain("<MacroStatusPanel");
    expect(homeSource).not.toContain("<V2V3Comparison");
    expect(homeSource).not.toContain("<LocatorOutcomeReviewCard");
    expect(homeSource).not.toContain("callbackStatus.useQuery");
    expect(homeSource).not.toContain("Scanner and Heartbeat");
    expect(homeSource).not.toContain("Signal discipline");
    expect(homeSource).not.toContain("Cooldown change history");
    expect(homeSource).not.toContain("Loss-learning review");
    expect(homeSource).not.toContain("How to read this page");
  });

  it("exposes the live Entry Forger status and decision-reason panel", () => {
    expect(homeSource).toContain("trpc.intelligence.entryForger.useQuery");
    expect(homeSource).toContain(">Entry Forger</CardTitle>");
    expect(homeSource).toContain("Forger decision");
    expect(homeSource).toContain("Target boundary:");
    expect(homeSource).toContain("Entry Locator keeps precedence.");
  });

  it("hides empty legacy analytics histories after the purge", () => {
    expect(homeSource).toContain("const visibleVersions = (stats.data?.versions ?? []).filter(");
    expect(homeSource).toContain("version.overall.generated > 0");
    expect(homeSource).toContain("const visibleVersions = (query.data?.versions ?? []).filter(");
    expect(homeSource).toContain("group.version === version");
    expect(homeSource).toContain("No persisted paper-signal records are available");
    expect(homeSource).not.toContain("<V2V3Comparison");
  });
});
