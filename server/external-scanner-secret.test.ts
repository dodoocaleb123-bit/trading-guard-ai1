import { describe, expect, it } from "vitest";

const baseUrl = process.env.EXTERNAL_SCANNER_TEST_BASE_URL ?? "http://localhost:3000";

const secret = process.env.EXTERNAL_SCANNER_TRIGGER_SECRET;

describe("external scanner trigger secret", () => {
  it("authenticates against the lightweight external trigger health endpoint", async () => {
    expect(secret, "EXTERNAL_SCANNER_TRIGGER_SECRET must be configured for this smoke test").toBeTruthy();

    const response = await fetch(`${baseUrl}/api/external/trading-guard-scanner/health`, {
      headers: { "X-Scanner-Trigger-Secret": secret! },
    });
    const body = await response.json() as { ok?: boolean; externalTrigger?: boolean };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, externalTrigger: true });
  });
});
