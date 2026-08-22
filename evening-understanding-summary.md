# My Understanding of the Trading Guard AI Upgrade

## Purpose of this summary

This document explains how I understand everything you described about improving Trading Guard AI. It is not an implementation yet. It is a shared specification of the problem you see, the behavior you want, and the way the upgraded intelligence should work.

## 1. The central problem with the current signal behavior

The app scans the watched markets repeatedly, approximately every 10–15 minutes. During one hour, that can produce roughly five or six signals for the same asset and timeframe. Your concern is that these signals may not represent five or six genuinely different trading opportunities. They may instead be repeated readings of the same short-lived market movement.

In that situation, one of the first signals may be the best entry, while later signals may arrive after the movement has already developed. If the app keeps evaluating every snapshot as a new independent opportunity, it can send overlapping trades, repeat weaker readings, move the entry farther into an already extended move, and recalculate a different take-profit on every scan. This can dilute the value of the original opportunity and make the app appear to chase the market.

You do not want the app to wait until the end of the hour, collect five or six signals, and then decide which one was correct. That would be too late. You want the app to make a decision immediately when the first sufficiently strong setup appears.

## 2. The desired immediate signal-selection behavior

Every scan should be evaluated as soon as its market data arrives. If the current snapshot forms a sufficiently strong setup, the app should be able to send that setup immediately. It must not wait for future scans, wait for all possible signals in the hour, or wait for a very long bullish or bearish confirmation candle if the available evidence already supports an earlier entry.

After the first signal is sent, later scans should determine whether the same setup is still active, strengthening, weakening, or invalidated. They should not automatically create a new signal merely because the price changed slightly. The app should identify the setup using stable characteristics such as the asset, timeframe, direction, breakout or range state, structural zone, and market regime rather than using the exact current price as the identity of the opportunity.

The intended behavior is therefore:

- The first qualifying setup is acted on immediately.
- Later snapshots of the same setup are suppressed or treated as updates.
- A new signal is allowed only after the previous setup reaches its target, reaches its invalidation stop, expires, or is materially invalidated.
- If several different assets qualify in the same scan, they can be ranked immediately; the app must not wait for later scans to compare them.

This is a real-time selection process, not an end-of-hour competition between old signals.

## 3. Why very large confirmation candles are a problem

You are concerned that the app may wait for a large green candle before deciding BUY or a large red candle before deciding SELL. By the time such a candle appears, the main buying or selling activity may already be exhausted. Traders may already have taken profits, liquidity may have been consumed, and the next candles may reverse against the late entry.

The desired intelligence should therefore distinguish between early evidence and late confirmation. It should use the developing market structure, location, momentum, liquidity behavior, volatility, higher-timeframe context, and economic catalysts to form an earlier scenario. It should not require an unusually large candle when several smaller pieces of evidence already align.

This does not mean entering blindly. It means using a defined early-entry condition that is based on confluence and a clear invalidation level rather than waiting for a candle that confirms the move only after much of the move has happened.

## 4. Economic-calendar events as forward-looking context

You are especially interested in economic-calendar events because fundamental events can change the value of a currency and therefore change where price candles are likely to move. Examples include interest-rate decisions, inflation releases, employment data, speeches, government decisions, and other events that affect expectations about a country’s economy or currency.

You want the app to use these events as forward-looking catalysts. It should know which currency is affected, how important the event is, when it is scheduled, what the forecast and previous values are, and—when released—how the actual result compares with expectations. That information can help the app create scenarios before and after the event, identify abnormal-volatility risk, and recognize when a move may already be extended.

The calendar should not be treated as a guarantee that price will move in one direction. Markets can react opposite to the obvious interpretation because expectations may already be priced in, the actual result may differ from the forecast, or liquidity and positioning may dominate the initial reaction. The event should therefore be a catalyst and scenario input, not a perfect prediction engine.

The Trading Guard AI app already has live market access through Twelve Data and an official macro layer using FRED, the ECB, and the Bank of England. That current layer provides official macro observations, but it is not yet a complete Forex Factory-style calendar with every upcoming event, forecast, previous value, actual value, impact rating, and countdown.

You asked about Forex Factory. I know it and its economic calendar, but a production integration should use a permitted, reliable structured feed rather than fragile or unverified scraping. Forex Factory can be used as a reference for manual comparison if necessary, while the app should preferably rely on an official or permitted calendar provider for automated event data.

## 5. Breakouts from liquidity or range states

You also want the intelligence to understand a candlestick breaking out of a liquidity state or range. A bullish breakout should not automatically mean that the app must issue a BUY. A bearish breakout should not automatically mean that it must issue a SELL.

The app should first classify whether the breakout is likely to continue or whether the move is becoming exhausted. It should consider the breakout location, repeated tests of the range boundary, the size and follow-through of candles, upper or lower wicks, momentum strength, volume where available, distance to the next opposing structure, higher-timeframe context, and whether price returns inside the broken range.

For example, after an upward breakout, possible exhaustion evidence could include a new price high accompanied by weaker momentum, repeated upper wicks near resistance, strong volume with little additional price progress, failure to hold above the range, or a rapid return into the prior liquidity state. If enough independent evidence agrees, the app could identify a probable reversal and generate a paper SELL candidate. The reverse would apply after a downward breakout, where weakening selling pressure could support a possible BUY reversal candidate.

The goal is to anticipate the end of a buying or selling session early enough to avoid entering after the move is already exhausted.

## 6. Take-profit selection

You do not want the app to set take profit only because a fixed risk-to-reward formula tells it to multiply a distance by two. You want it to identify where the market has a realistic probability of reaching based on structure, liquidity, economic-event context, and the behavior described in the trading documents.

The desired order is:

1. Identify the likely target zone first, such as the next opposing liquidity area, support, resistance, range boundary, or meaningful market-structure level.
2. Determine whether the target is plausible under the current event, volatility, and breakout scenario.
3. Calculate the risk from a defensible invalidation stop.
4. Check whether the natural target supports the requested 1:2 risk-to-reward relationship.
5. Send the signal only if the target and stop form coherent trade geometry.

If the natural target is too close to support or resistance to provide 1:2, the app should not invent a distant target merely to satisfy the formula. It should select a better-supported target if one exists, downgrade the candidate, or keep it as an internal paper candidate instead of sending a misleading signal.

Once a setup is sent, its take-profit should remain stable. A later scan must not automatically extend the target simply because the latest price moved. The target can change only if the original setup is invalidated or there is a material structural change that creates a genuinely new setup.

## 7. Stop-loss selection

You want the stop loss placed at a price where the market structure suggests the trade idea is invalid, rather than at an arbitrary ATR distance. For a BUY, the stop could be below a confirmed swing low, support zone, or failed-breakout level. For a SELL, it could be above a confirmed swing high, resistance zone, or exhaustion extreme. A volatility buffer should be added so ordinary market noise does not immediately trigger the stop.

The correct concept is not a stop that is guaranteed to never be hit. No market level can be known with perfect certainty. The correct concept is an invalidation stop: if price reaches that level, the original trade thesis is no longer valid. The app should record why that level was selected and what structural assumption it protects.

After choosing the structure-based stop and target, the app should calculate the actual risk and verify the 1:2 relationship. The stop should not be moved simply to force the ratio, and the target should not be extended simply to make the ratio look attractive.

## 8. The existing v2 and v3 foundation

The redesign should continue using the existing compiled intelligence built from the supplied documents.

Replacement Intelligence v2 uses the Forex trading document’s rule families: market structure, support and resistance, chart patterns and reversals, momentum and MACD, EMA20 and EMA50 alignment, RSI and stochastic, volume confirmation, breakout and fakeout behavior, volatility and ATR, higher-timeframe alignment, session activity, currency relativity, and risk geometry.

Replacement Intelligence v3 contains the entire v2 foundation and adds the macro/fundamental layer from *What moves the currency market.pdf*. That layer covers interest-rate effects, employment and inflation catalysts, technical/fundamental alignment, economic-release reaction risk, and carry context. When verified macro data is unavailable, v3 must not fabricate a macro direction; it should retain the v2 technical decision base.

The full Forex trading document you plan to resend should be reviewed before implementation so its breakout, liquidity, candlestick, reversal, target, and risk rules can be compared with the existing compiled components. The purpose is to improve the executable intelligence, not merely to store the document as a reference.

## 9. Validation and safety boundary

The upgraded behavior should be introduced as a separately tracked paper-intelligence version, such as v3.1 or v4, so the existing v3 records are not rewritten. The new sample should be measured separately by asset, timeframe, direction, setup type, event condition, continuation versus exhaustion classification, target-zone type, and whether the target or invalidation level was reached first.

The app should test the SELL outcome resolver independently because the current v3 history showed an extreme SELL-side weakness. That result could reflect calibration, repeated overlapping signals, a directional logic problem, or an outcome-tracking issue. It should be verified before conclusions are drawn from the new target logic.

All signals must remain paper-only and **UNVALIDATED**. The system can calculate a defensible probability-oriented scenario, but it cannot know with perfect certainty that a candle will reach a target or that a stop will never be hit. The objective is to make the reasoning more structurally coherent, timely, non-duplicative, and measurable—not to promise certainty.

## Final specification in one sentence

The intended upgrade is a forward-looking, event-aware, structure-and-liquidity-based paper intelligence that evaluates each scan immediately, selects the first qualifying setup, avoids repeated overlapping signals, anticipates continuation or exhaustion before an oversized confirmation candle, chooses a realistic stable target and invalidation stop from market structure, preserves 1:2 risk-to-reward only when the geometry genuinely supports it, and validates every new behavior separately before any claim of improvement.
