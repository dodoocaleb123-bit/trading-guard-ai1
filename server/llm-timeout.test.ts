import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./_core/llm";

describe("LLM request timeout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a successful response before the timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    const response = await fetchWithTimeout("https://example.test", { method: "POST" }, 50);
    expect(response.status).toBe(200);
  });

  it("turns an aborted upstream request into a bounded timeout error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted by test")), { once: true });
    }));
    await expect(fetchWithTimeout("https://example.test", { method: "POST" }, 5)).rejects.toThrow("LLM request timed out after 5ms");
  });
});

