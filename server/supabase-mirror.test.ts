import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("axios", () => ({
  default: {
    post,
    isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean } | null)?.isAxiosError),
  },
}));

import axios from "axios";
import { mirrorToSupabase } from "./integrations";

describe("optional Supabase mirroring", () => {
  beforeEach(() => {
    post.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("treats an absent optional table as a recoverable one-time diagnostic", async () => {
    const notFound = Object.assign(new Error("Request failed with status code 404"), {
      isAxiosError: true,
      response: { status: 404 },
    });
    post.mockRejectedValue(notFound);

    await expect(mirrorToSupabase("trade_outcomes", { signal_id: 1 })).resolves.toBeNull();
    await expect(mirrorToSupabase("trade_outcomes", { signal_id: 2 })).resolves.toBeNull();

    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("Optional mirror table unavailable: trade_outcomes"));
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("keeps non-404 mirror failures visible", async () => {
    post.mockRejectedValue(new Error("provider timeout"));

    await expect(mirrorToSupabase("strategy_rules", { title: "test" })).resolves.toBeNull();

    expect(console.warn).toHaveBeenCalledWith("[Supabase] Could not mirror strategy_rules:", "provider timeout");
  });
});

void axios;
