# Weekend Market and Entry-Signal Audit

## Weekend handling

The active scanner has no explicit Saturday/Sunday market-hours guard for EUR/USD, GBP/USD, or XAU/USD. It calls the Twelve Data time-series endpoint for its watchlist and treats a usable provider response as market data. Therefore, the app does not currently know the weekend schedule as a first-class rule. When those markets are closed, Twelve Data may return stale data, an error, or no usable series; the scanner’s provider/error handling determines the result rather than a dedicated calendar guard.

## Document entry guidance

The uploaded Forex trading document does explicitly discuss entry signals and setup qualification. Its guidance includes prior trend before reversal patterns, support/resistance reactions and breaks, breakout or fakeout interpretation, volume confirmation, higher-timeframe review, moving-average trend alignment, RSI and stochastic momentum context, Bollinger-band breakout context, MACD signal-line and histogram behavior, candlestick/chart patterns, trendline bounces, Fibonacci reference levels, session activity, and defining risk before entry.

## v4 comparison

Active v4 already implements a bounded subset of these concepts: market structure, support/resistance, reversal prerequisites, breakout/fakeout context, volume confirmation when available, higher-timeframe context, EMA20/EMA50 alignment, RSI/stochastic and MACD momentum context, Bollinger breakout context, session context, conditional related-market evidence, secondary Fibonacci pullback context, event-aware macro context, and structure-aware risk geometry. The document is therefore not merely being used as a reference, but v4 does not yet implement every paragraph, chart pattern, exact indicator crossover, or discretionary exception one-to-one. Unavailable inputs remain neutral and all outputs remain paper-only and UNVALIDATED.
