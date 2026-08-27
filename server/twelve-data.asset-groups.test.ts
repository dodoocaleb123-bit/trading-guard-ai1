import { describe, expect, it } from "vitest";
import {
  twelveDataAssetGroupForAsset,
  twelveDataAssetGroupForAssets,
  twelveDataKeySlotIndexesForAssets,
} from "./integrations";

describe("Twelve Data asset-group routing", () => {
  it("assigns EUR/USD and XAU/USD to slots 1 through 3", () => {
    expect(twelveDataAssetGroupForAsset("EUR/USD")).toBe("EUR_XAU");
    expect(twelveDataAssetGroupForAsset("XAUUSD")).toBe("EUR_XAU");
    expect(twelveDataAssetGroupForAssets(["EUR/USD", "XAU/USD"])).toBe("EUR_XAU");
    expect(twelveDataKeySlotIndexesForAssets(["EUR/USD", "XAU/USD"])).toEqual([0, 1, 2]);
  });

  it("assigns GBP/USD and BTC/USD to slots 4 through 6", () => {
    expect(twelveDataAssetGroupForAsset("GBP/USD")).toBe("GBP_BTC");
    expect(twelveDataAssetGroupForAsset("BTCUSD")).toBe("GBP_BTC");
    expect(twelveDataAssetGroupForAssets(["GBP/USD", "BTC/USD"])).toBe("GBP_BTC");
    expect(twelveDataKeySlotIndexesForAssets(["GBP/USD", "BTC/USD"])).toEqual([3, 4, 5]);
  });

  it("uses the complete pool for mixed or unknown asset requests", () => {
    expect(twelveDataAssetGroupForAssets(["EUR/USD", "GBP/USD"])).toBe("ALL");
    expect(twelveDataKeySlotIndexesForAssets(["EUR/USD", "GBP/USD"])).toEqual([0, 1, 2, 3, 4, 5]);
    expect(twelveDataAssetGroupForAsset("USD/JPY")).toBe("ALL");
  });
});
