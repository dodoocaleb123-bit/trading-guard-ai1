import { describe, expect, it } from "vitest";
import { describePaperSignalQuality, hasMinimumPaperSignalQuality } from "./paper-signal-quality";

describe("paper signal quality", () => {
  it("accepts values at or above the shared minimums", () => {
    expect(hasMinimumPaperSignalQuality(60, 45)).toBe(true);
    expect(hasMinimumPaperSignalQuality("79", "75")).toBe(true);
  });

  it("rejects confidence or confluence below the shared minimums", () => {
    expect(hasMinimumPaperSignalQuality(59, 100)).toBe(false);
    expect(hasMinimumPaperSignalQuality(60, 44)).toBe(false);
    expect(hasMinimumPaperSignalQuality(null, 45)).toBe(false);
  });

  it("explains the normalized quality requirement without exposing unrelated data", () => {
    expect(describePaperSignalQuality(51, 60)).toBe("confidence/confluence must meet 60%/45% (received 51%/60%).");
  });
});
