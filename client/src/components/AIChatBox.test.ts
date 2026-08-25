import { describe, expect, it } from "vitest";
import { displayChatMessage } from "@/lib/chat-display";

describe("chat display fallback", () => {
  it("labels the legacy unavailable response as historical", () => {
    expect(displayChatMessage('"I could not produce a response."')).toContain("Historical assistant response unavailable");
  });

  it("leaves readable assistant content unchanged", () => {
    expect(displayChatMessage("Paper-only market context is available.")).toBe("Paper-only market context is available.");
  });
});
