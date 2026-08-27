import { describe, expect, it } from "vitest";
import { isTwelveDataFailoverError, reserveTwelveDataKeyStart } from "./integrations";

describe("Twelve Data timeout failover", () => {
  it("classifies Axios timeout errors as failover-eligible", () => {
    const timeoutError = Object.assign(new Error("timeout of 20000ms exceeded"), {
      code: "ECONNABORTED",
    });

    expect(isTwelveDataFailoverError(timeoutError)).toBe(true);
    expect(isTwelveDataFailoverError(Object.assign(new Error("request timed out"), { code: "ETIMEDOUT" }))).toBe(true);
  });

  it("reserves different starting key slots for parallel requests", () => {
    expect(reserveTwelveDataKeyStart(6, 0)).toEqual({ startIndex: 0, nextCursor: 1 });
    expect(reserveTwelveDataKeyStart(6, 1)).toEqual({ startIndex: 1, nextCursor: 2 });
    expect(reserveTwelveDataKeyStart(6, 5)).toEqual({ startIndex: 5, nextCursor: 0 });
    expect(reserveTwelveDataKeyStart(0, 4)).toEqual({ startIndex: 0, nextCursor: 0 });
  });

  it("does not classify an unrelated network error as a key failover condition", () => {
    expect(isTwelveDataFailoverError(new Error("socket closed unexpectedly"))).toBe(false);
  });
});
