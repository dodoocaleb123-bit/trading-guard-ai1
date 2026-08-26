import { beforeEach, describe, expect, it, vi } from "vitest";

const { axiosPost } = vi.hoisted(() => ({ axiosPost: vi.fn() }));

vi.mock("axios", () => ({
  default: { post: axiosPost },
}));

import { sendTelegramMessage } from "./integrations";

describe("Telegram reply delivery", () => {
  beforeEach(() => {
    axiosPost.mockReset();
  });

  it("falls back to a standalone message when a reply reference is rejected", async () => {
    axiosPost
      .mockRejectedValueOnce({ response: { status: 400, data: { description: "message to reply not found" } } })
      .mockResolvedValueOnce({ data: { ok: true, result: { message_id: 321 } } });

    const result = await sendTelegramMessage("PAPER ADJUSTMENT", "BTC/USD", { replyToMessageId: "123" });

    expect(result).toEqual({ delivered: true, telegramMessageId: "321" });
    expect(axiosPost).toHaveBeenCalledTimes(2);
    expect(axiosPost.mock.calls[0][1]).toMatchObject({ reply_parameters: { message_id: 123 } });
    expect(axiosPost.mock.calls[1][1]).not.toHaveProperty("reply_parameters");
  });

  it("returns the provider description for non-reply failures", async () => {
    axiosPost.mockRejectedValueOnce({ response: { status: 403, data: { description: "bot was blocked by the user" } } });

    const result = await sendTelegramMessage("PAPER ADJUSTMENT", "BTC/USD");

    expect(result).toEqual({ delivered: false, error: "bot was blocked by the user" });
    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
});

