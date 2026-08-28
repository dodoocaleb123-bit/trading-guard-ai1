import { describe, expect, it } from "vitest";
import { buildBoundedRuleText } from "./db";

describe("bounded strategy-rule context", () => {
  it("never exceeds the configured character budget", () => {
    const text = buildBoundedRuleText([
      { title: "Rule one", content: "a".repeat(20_000) },
      { title: "Rule two", content: "b".repeat(20_000) },
      { title: "Rule three", content: "c".repeat(20_000) },
    ], 24_000);
    expect(text.length).toBeLessThanOrEqual(24_000);
    expect(text.startsWith("## Rule one\n")).toBe(true);
  });

  it("handles missing titles and content without creating undefined text", () => {
    const text = buildBoundedRuleText([{ title: null, content: null }], 100);
    expect(text).toBe("## Saved strategy rule\n");
    expect(text).not.toContain("undefined");
  });
});

