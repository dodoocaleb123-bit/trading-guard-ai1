import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { clearOfficialMacroCache, fetchOfficialMacroContext } from "./official-macro";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

const fredCsv = (series: string, date: string, value: string) => `observation_date,${series}\n${date},${value}\n`;

describe("official macro context", () => {
  beforeEach(() => {
    clearOfficialMacroCache();
    vi.mocked(axios.get).mockReset();
  });

  it("returns verified observations and neutral bias without fabricating direction", async () => {
    vi.mocked(axios.get).mockImplementation(async (_url, config: any) => {
      const series = String(config?.params?.id ?? "FEDFUNDS");
      const values: Record<string, string> = { FEDFUNDS: "5.25", CPIAUCSL: "310.1", UNRATE: "4.1" };
      return { data: fredCsv(series, "2026-08-19", values[series] ?? "1") } as any;
    });

    const context = await fetchOfficialMacroContext("EUR/USD");
    expect(context.status).toBe("AVAILABLE");
    expect(context.bias).toBe("NEUTRAL");
    expect(context.observations).toHaveLength(3);
    expect(context.observations.every((observation) => observation.source === "FRED")).toBe(true);
    expect(context.summary).toContain("Official macro observations");
  });

  it("fails closed when official requests are unavailable", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("provider timeout"));

    const context = await fetchOfficialMacroContext("BTC/USD");
    expect(context.status).toBe("UNAVAILABLE");
    expect(context.bias).toBe("NEUTRAL");
    expect(context.observations).toEqual([]);
    expect(context.summary).toContain("provider timeout");
  });

  it("shares the cached official snapshot across assets", async () => {
    vi.mocked(axios.get).mockImplementation(async (_url, config: any) => {
      const series = String(config?.params?.id ?? "FEDFUNDS");
      return { data: fredCsv(series, "2026-08-19", "1") } as any;
    });

    await fetchOfficialMacroContext("EUR/USD");
    await fetchOfficialMacroContext("GBP/USD");
    expect(axios.get).toHaveBeenCalledTimes(5);
  });
});
