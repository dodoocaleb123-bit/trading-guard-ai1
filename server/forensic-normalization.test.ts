import { describe, expect, it } from "vitest";
import { normalizeForensicFinding } from "./integrations";

describe("forensic outcome normalization", () => {
  it("fills safe advisory fallbacks when the analyst response is incomplete", () => {
    const result = normalizeForensicFinding({ rootCause: undefined, lesson: "", guardrail: null });

    expect(result.rootCause).not.toContain("undefined");
    expect(result.lesson).not.toContain("undefined");
    expect(result.guardrail).not.toContain("undefined");
    expect(result.rootCause).toContain("no root-cause detail");
    expect(result.lesson).toContain("Do not promote");
    expect(result.guardrail).toContain("advisory");
  });

  it("trims valid forensic findings without changing their meaning", () => {
    expect(normalizeForensicFinding({ rootCause: "  weak breakout  ", lesson: "  wait for confirmation ", guardrail: "  keep paper-only  " })).toEqual({
      rootCause: "weak breakout",
      lesson: "wait for confirmation",
      guardrail: "keep paper-only",
    });
  });
});
