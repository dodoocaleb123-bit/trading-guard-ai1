import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const homeSource = readFileSync(fileURLToPath(new URL("./Home.tsx", import.meta.url)), "utf8");

describe("dashboard terminology", () => {
  it("describes the scanner as a raw market-data collector", () => {
    expect(homeSource).toContain('title="Market data collector"');
    expect(homeSource).toContain("The scanner collects raw");
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

  it("does not reintroduce scanner-decision wording in the revised pages", () => {
    expect(homeSource).not.toContain("scanner decisions");
    expect(homeSource).not.toContain("scanner candidates reference");
  });
});
