# Scanner Coverage Audit

## Executive finding

The scanner does **not** provide every document-derived pre-trade item as a direct, independently observed market input. It retrieves raw Twelve Data OHLCV candles for each asset and timeframe, then the application deterministically derives a substantial market context before v4 evaluates it. Some document concepts are represented by these derived fields; others are conditional on additional data; and several subjective or specialized methods are not currently encoded as complete scanner features.

The scanner is therefore best understood as a **raw-data collector plus deterministic feature builder**, while v4 remains the decision layer. The scanner itself does not decide BUY or SELL.

## Coverage matrix

| Document requirement | Scanner or v4 coverage | Classification | Important limitation |
|---|---|---|---|
| Raw open/high/low/close candles | Twelve Data time-series values | Direct | Provider availability and freshness still matter |
| Candle direction, body, range, wicks | `latestCandle`, `recentCandles`, `chartDetails` | Derived | Does not identify every named candlestick pattern |
| Rising, falling, or range-bound structure | `marketStructure`, `priceAction.trendDirection` | Derived | Structure is based on deterministic recent-window calculations, not discretionary chart reading |
| Higher-timeframe review | Companion timeframe and `multiTimeframeAlignment` | Derived | Available only when both timeframe samples are usable |
| Support and resistance | `supportResistance`, support/resistance zones | Derived | Zones are calculated from recent ranges; they are not a full historical level database |
| Support/resistance reaction | Wick/candle and proximity context can assist | Partial | No complete multi-touch reaction classifier |
| Confirmed level break | `breakoutState`, breakout/fakeout classification | Partial | No universal retest/close-duration rule for every document method |
| Range consolidation | `RANGE_BOUND`, `RANGE_CONSOLIDATION` | Derived | Range definition is algorithmic and window-based |
| Range breakout | `ABOVE_RESISTANCE` / `BELOW_SUPPORT`, `BREAKOUT` | Derived | Breakout quality and retest confirmation are bounded, not exhaustive |
| Fakeout or failed breakout | `FAKEOUT` and `fakeout-warning` context | Partial | Requires additional confirmation; it is not a guarantee of reversal |
| Double top/bottom | Not fully recognized as a named pattern | Gap | Prior trend and level-break prerequisites exist, but exact pattern geometry is not complete |
| Head-and-shoulders and other named patterns | Not fully recognized | Gap | The document’s pattern library is broader than the current scanner classifier |
| Prior trend before reversal | `marketStructure` plus v4 reversal prerequisite | Derived | Depends on the recent-window structure model |
| Neckline or relevant-level violation | General breakout state | Partial | Pattern-specific neckline logic is not separately encoded |
| Trendline bounce or break | Not directly supplied | Gap/partial | Trendline geometry is subjective and not currently a full feature |
| Channel boundary reaction | Not directly supplied | Gap | Support/resistance zones are not the same as formal channel construction |
| First pullback after structure break | Bounded v4 Fibonacci/pullback context | Partial | Pullback sequencing and inducement alternatives are not fully modeled |
| Fibonacci retracement | v4 computes bounded secondary retracement context | Derived in v4 | Not a standalone signal; requires structural agreement |
| Moving averages | EMA20 and EMA50 | Derived | Other moving-average types and all cross variations are not present |
| MACD | MACD line, signal, histogram | Derived | The exact document crossover rule is represented as context, not an automatic standalone order trigger |
| RSI | RSI14 | Derived | No standalone overbought/oversold order rule |
| Stochastic | `%K` and `%D` | Derived | No standalone crossover order rule |
| Bollinger Bands | Middle, upper, lower, bandwidth | Derived | Band behavior is bounded context, not a complete Bollinger strategy implementation |
| Momentum | Five- and ten-candle changes and direction | Derived | Momentum thresholds are algorithmic approximations |
| Volume confirmation | Latest volume, average volume, relative volume, confirmation state | Conditional | Many FX feeds provide tick volume or incomplete volume; unavailable volume remains neutral |
| Tick-index confirmation | Not supplied by current Twelve Data snapshot | Gap | The document’s tick-index method needs a compatible tick dataset |
| Higher-activity sessions | Timestamp/session context | Derived modifier | Session activity does not determine direction |
| European/American/Asian overlap | Partly represented as session context | Partial | No claim is made that a session guarantees a better trade |
| Related-pair/intermarket context | Conditional v4 intermarket evidence | Conditional | Only used when timestamp-aligned proxy data is actually available; otherwise neutral |
| Interest rates and policy context | Official macro layer | Conditional | Depends on source freshness and available observations |
| Employment/inflation catalysts | Official macro and calendar context | Conditional | Event risk may lower confidence; it does not predict the exact candle path |
| Forex Factory high-impact events | Weekly JSON calendar context | Conditional | Current event endpoint must remain available and valid |
| Economic-release overreaction risk | v3/v4 event-risk penalty and explanation | Derived modifier | It reduces confidence; it does not choose direction by itself |
| Breakout volume confirmation | Volume state plus breakout state | Conditional | Missing volume cannot be treated as confirmation |
| Reversal confirmation by prior bounce high/low | General candle/structure evidence | Partial | Not every document-specific reversal trigger is encoded exactly |
| Risk before entry | ATR, volatility regime, support/resistance geometry, finite stop/target | Derived in v4 | All decisions remain paper-only and UNVALIDATED |
| Stop beyond structure | v4 structure-aware risk geometry | Derived in v4 | Uses deterministic observed structure and an ATR/volatility buffer, not certainty |
| Realistic 1:2 geometry | v4 minimum 2R target and downgrade/fallback trace | Derived in v4 | A 2R target is a design constraint, not evidence that price must reach it |
| Trailing-stop and profit-management rules | Not part of initial scanner snapshot | Gap/management layer | These are post-entry management rules rather than initial data fields |
| Psychology, patience, discipline, and trading-plan checks | Not observable market data | Outside scanner scope | They require user/process controls, not market candles |

## What the scanner actually sends into v4

For each usable asset/timeframe sample, the scanner forwards raw candles and an enriched context containing candle structure, recent candle counts, market structure, volatility and ATR, support/resistance zones, momentum changes, breakout state, EMA20/EMA50, RSI14, MACD line/signal/histogram, stochastic values, Bollinger values and bandwidth, volume availability and relative volume, wick activity, visible bounded patterns, and companion-timeframe alignment. It also attaches official macro and Forex Factory calendar context when available.

This is a materially richer input than a single price and trend label. However, it is still not equivalent to a human reading every chart in the document or to a complete implementation of every named strategy. The v4 model adds bounded Fibonacci and source-grounded rule logic, but it does not manufacture unavailable trendlines, tick indexes, detailed pattern geometry, or related-market data.

## Direct answer

The accurate answer is **no**: the scanner does not currently provide every single document item in full detail. It provides the raw market data and many deterministic derived features required for the main v4 setup logic. v4 derives the BUY/SELL judgment from those features and conditional macro context. Several document methods are only partially represented, and some remain gaps—especially formal named-pattern recognition, trendline/channel geometry, tick-index signals, exhaustive retest logic, and post-entry management.

The application is designed to remain honest about these boundaries: unavailable inputs are neutral or explicitly labeled unavailable, conflicts remain visible in the audit trace, and no input is treated as proof that a trade will win.
