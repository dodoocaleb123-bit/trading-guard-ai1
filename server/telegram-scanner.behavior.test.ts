import { describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import axios from "axios";
import { sendTelegramMessage } from "./integrations";
import { shouldCreateCandidate } from "./scanner";

describe("Telegram and scanner guardrails", () => {
  it("returns true when Telegram accepts a notification", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { ok: true } } as never);
    await expect(sendTelegramMessage("test signal")).resolves.toMatchObject({ delivered: true });
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/sendMessage"), expect.objectContaining({ text: "test signal" }), expect.objectContaining({ timeout: 12000 }));
  });

  it("returns false when Telegram delivery fails", async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error("network unavailable"));
    await expect(sendTelegramMessage("test signal")).resolves.toMatchObject({ delivered: false, error: "network unavailable" });
  });

  it("skips candidate creation when OHLCV data is unavailable or rules are absent", () => {
    expect(shouldCreateCandidate(0, { close: 1.1, trend: "UP" })).toBe(false);
    expect(shouldCreateCandidate(2, null)).toBe(false);
    expect(shouldCreateCandidate(2, { close: Number.NaN, trend: "UP" })).toBe(false);
    expect(shouldCreateCandidate(2, { close: 1.1, trend: "UP" })).toBe(true);
  });
});
