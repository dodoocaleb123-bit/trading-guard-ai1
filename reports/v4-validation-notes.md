# Replacement Intelligence v4 — Validation Notes

## Fresh walk-forward paper sample

The validator used fresh Twelve Data OHLCV series for EUR/USD, XAU/USD, GBP/USD, and BTC/USD at 15-minute and 1-hour intervals. It used a 60-candle warmup and evaluated the next six candles for each paper outcome. Macro context was intentionally unavailable/neutral in this run so no macro direction was fabricated. The report is saved at `reports/latest-v4-shadow-validation.json`.

The comparison showed that v4 and v3 agreed on direction across the sampled observations, while v4 changed confidence modestly in observations where its bounded context was applicable. This means the sample does not yet demonstrate a directional improvement. Results are sparse because most six-candle horizons remained unresolved; they must not be interpreted as a reliable win-rate estimate or as evidence of guaranteed accuracy. V4 remains shadow-only and v3 remains the delivered signal version.

## Engineering verification

Focused v4 and scanner tests passed: 19 tests across two files. The complete Vitest suite and production build also passed. The scanner test confirms that each persisted strategy snapshot contains `v4ShadowIntelligence` while existing delivered paper signals remain on the v3-authoritative path.

## Visual verification

The Winning Rate page was checked at desktop and narrow mobile widths. The new version-separated analytics copy remains readable; the mobile layout stacks the review metrics without clipping. The v4 historical card is intentionally empty until v4 is activated after an adequate validation review.

## Decision

Do not promote v4 to Telegram delivery based on this sample. Continue collecting shadow traces and resolved v3 outcomes, then run a larger comparison with sufficient resolved observations and separate analysis by asset, timeframe, direction, event risk, and geometry fallback.
