import { describe, expect, it } from "vitest";
import { isTwelveDataFailoverError } from "./integrations";

describe("Twelve Data timeout failover", () => {
  it("classifies Axios timeout errors as failover-eligible", () => {
    const timeoutError = Object.assign(new Error("timeout of 20000ms exceeded"), {
      code: "ECONNABORTED",
    });

    expect(isTwelveDataFailoverError(timeoutError)).toBe(true);
    expect(isTwelveDataFailoverError(Object.assign(new Error("request timed out"), { code: "ETIMEDOUT" }))).toBe(true);
  });

  it("does not classify an unrelated network error as a key failover condition", () => {
    expect(isTwelveDataFailoverError(new Error("socket closed unexpectedly"))).toBe(false);
  });
});
