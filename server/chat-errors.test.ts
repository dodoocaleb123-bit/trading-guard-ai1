import { describe, expect, it } from "vitest";
import { formatChatServiceError } from "./routers";

describe("chat service error fallback", () => {
  it("turns a service-unavailable error into readable White AI feedback", () => {
    expect(formatChatServiceError(new Error("Service Unavailable"), "White AI")).toContain("White AI is temporarily unavailable");
  });

  it("turns quota errors into readable Cherry AI feedback", () => {
    expect(formatChatServiceError(new Error("HTTP 429 quota exceeded"), "Cherry AI")).toContain("Cherry AI is temporarily rate-limited");
  });

  it("does not alter ordinary useful errors", () => {
    expect(formatChatServiceError(new Error("Database unavailable"), "White AI")).toBe("White AI is temporarily unavailable because the response service did not return a valid response. Please try again in a moment.");
  });
});
