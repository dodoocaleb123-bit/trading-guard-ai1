import { describe, expect, it } from "vitest";
import { formatChatError } from "./chat-errors";

describe("chat error formatting", () => {
  it("hides invalid JSON details for a plain-text service outage", () => {
    expect(formatChatError(new Error('Unexpected token S in JSON at position 0'), "White AI")).toContain("White AI is temporarily unavailable");
  });

  it("describes provider rate limiting without exposing transport details", () => {
    expect(formatChatError(new Error("HTTP 429 quota exceeded"), "Cherry AI")).toContain("temporarily rate-limited");
  });

  it("preserves useful ordinary errors", () => {
    expect(formatChatError(new Error("Database unavailable"), "White AI")).toBe("Database unavailable");
  });
});
