# Replacement Intelligence v4 — Initial Source Audit

## Audit scope

The uploaded `Forextrading.docx` was received and extracted for review. The document contains approximately 12,531 extracted text lines and 1.54 MB of searchable text, plus 598 embedded media files (324 JPG, 122 JPEG, and 152 PNG). It is a compiled training document containing multiple instructional sections and source blocks rather than one internally consistent trading system. The current v3 intelligence remains authoritative during this audit.

## Major source themes identified

The document repeatedly covers market structure and trend classification, support and resistance, candlesticks, chart patterns, breakouts and reversals, moving averages, RSI and other oscillators, stochastic, MACD, Bollinger Bands, Fibonacci, volume, intermarket relationships, fundamental and economic-calendar context, trading sessions, spreads, leverage, trading psychology, planning, discipline, and risk management. It also contains extended discussion of neural networks, proprietary forecasting tools, and broader intermarket forecasting concepts.

| Theme | Initial v4 treatment | Reason |
| --- | --- | --- |
| Market structure, higher highs/lows, lower highs/lows | Candidate executable component | Observable from OHLCV and already aligned with v3 |
| Support, resistance, liquidity zones | Candidate executable component | Can define target zones and invalidation areas when calculated from price data |
| Breakout, fakeout, and reversal behavior | Candidate executable component | Can be represented with explicit level-violation, candle, momentum, and follow-through conditions |
| Moving averages, RSI, stochastic, MACD, Bollinger, volume | Candidate confluence components | Deterministically calculable, but must not be allowed to count as independent evidence when they measure the same movement |
| Fibonacci levels | Candidate contextual component | Requires a deterministic swing-selection rule; must be tested rather than treated as inherently predictive |
| Intermarket relationships | Candidate v4 extension | Requires observable proxy series and timestamp-aligned data; unavailable proxies must remain neutral rather than fabricated |
| Economic events and sessions | Existing v3.1 context | Continue using cached UTC-normalized calendar events and event-risk confidence calibration |
| Neural networks, proprietary forecasting products, and claims of forecasting superiority | Not directly executable from this document | The document describes concepts and products, not reproducible model weights, training data, or a verifiable inference protocol |
| Guaranteed or certain targets, unreachable stops, profit promises, and discretionary claims | Explicitly excluded | They cannot be established from historical snapshots and conflict with paper-validation safeguards |

## Important source conflicts

The document promotes both simplicity and the use of many indicators; describes trend-following and reversal methods; discusses protective stops while also containing examples that discourage stops; and presents educational or marketing-style performance claims without a reproducible statistical protocol. These conflicts must be retained as provenance and resolved by a deterministic policy rather than silently blended together.

## Proposed v4 design principle

Replacement Intelligence v4 should be an additive, versioned model: **v4 = validated v3 behavior + only those document-derived components that have explicit inputs, conditions, conflicts, level derivation, and paper-validation tests**. It should not become an unconstrained language-model guesser. Each component should record its source passage, applicability, required market features, directional contribution, conflict relationships, and whether the observation was actually available in the current snapshot.

The v4 scanner path should preserve the current immediate per-snapshot evaluation, active-setup suppression, stable target and structure-invalidation geometry, breakout-exhaustion evidence, cached Forex Factory event context, Telegram routing, and paper-only `UNVALIDATED` labeling. New components should be introduced in shadow or paper mode first, with version-separated outcomes and no lesson promotion until the evidence threshold and review gate are satisfied.

## Evidence boundary

The document can improve the breadth and explicitness of the executable knowledge representation, but it cannot establish a high winning rate by itself. The required next step is to extract candidate rules and relationships, compile them into a v4 model, compare v4 against v3 on the same fresh market samples, and report coverage, resolved outcomes, win rate, direction balance, event-risk behavior, and reversal behavior without claiming certainty.
