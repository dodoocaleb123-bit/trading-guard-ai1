import { describe, expect, it } from "vitest";
import { displayChatMessage } from "./chat-display";

describe("displayChatMessage", () => {
  it("renders persisted escaped newlines as actual line breaks", () => {
    expect(displayChatMessage("TRADE DENIED\\n\\nConfidence level: 0%"))
      .toBe("TRADE DENIED\n\nConfidence level: 0%");
  });

  it("keeps the historical unavailable-response fallback", () => {
    expect(displayChatMessage('"I could not produce a response."'))
      .toContain("Historical assistant response unavailable");
  });

  it("hides persisted malformed-response errors with the active assistant name", () => {
    expect(displayChatMessage("Cannot read properties of undefined (reading '0')", "White AI"))
      .toContain("White AI was temporarily unavailable");
    expect(displayChatMessage("Cannot read properties of undefined (reading '0')", "Cherry AI"))
      .toContain("Cherry AI was temporarily unavailable");
  });
});
