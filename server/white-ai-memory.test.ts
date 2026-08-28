import { describe, expect, it } from "vitest";
import { normalizeWhiteAiMemory } from "./db";

describe("White AI learning memory", () => {
  it("compacts whitespace and caps stored conversation memory", () => {
    const normalized = normalizeWhiteAiMemory(`  Teach me\n\nabout   risk management. ${"x".repeat(1400)}  `);
    expect(normalized.startsWith("Teach me about risk management.")).toBe(true);
    expect(normalized.length).toBe(1200);
    expect(normalized).not.toContain("\n");
  });

  it("keeps empty memory entries empty", () => {
    expect(normalizeWhiteAiMemory("  \n\t ")).toBe("");
  });
});

// White AI memory is advisory context only; v5 mutations remain in scanner paths.
