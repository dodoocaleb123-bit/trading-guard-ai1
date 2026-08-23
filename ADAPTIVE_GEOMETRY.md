# Adaptive v4 Geometry

Trading Guard AI v4 now uses a conservative adaptive paper-trade geometry policy. The stop remains structure-based: it is placed beyond the invalidation side of the current support or resistance with an ATR buffer and a minimum volatility floor.

## Allowed ratios

The target selector tests the permitted ratios in descending order:

| Priority | Ratio | Qualification requirement |
|---:|---:|---|
| 1 | 1:3 | Cleared structural space supports three risk units |
| 2 | 1:2 | Cleared structural space supports two risk units |
| 3 | 1:1.5 | Cleared structural space supports one and a half risk units |
| 4 | 1:1 | Cleared structural space supports one risk unit |

The selector chooses the highest ratio whose target remains before the nearest valid opposing zone after a clearance buffer. If none of the four ratios fits, v4 remains `WAITING`; it does not emit a diagnostic fallback level.

## Breakout handling

For a confirmed bullish breakout, the broken resistance is treated as a potential retest support rather than as the immediate target. The target search moves to the next known untouched historical resistance. Bearish breakouts use the mirror image: broken support becomes a possible retest resistance, and the target search moves to the next known untouched historical support.

A breakout must have a directional close, directional momentum, a candle body of at least 35% of its range, and either confirmed volume or unavailable volume. A wick-only move, contradictory momentum, or fakeout state does not qualify as a confirmed continuation. If a confirmed breakout has no known next opposing zone, v4 does not fabricate one and remains waiting.

## Audit and paper-only behavior

The selected ratio, geometry mode, clearance buffer, breakout state, and target rationale are persisted in the deterministic decision trace. Concise Telegram signals and setup-upgrade replies display the selected ratio explicitly. Historical signals are not rewritten. v2 and v3 retain their legacy exact 1:2 geometry; adaptive selection applies to authoritative v4.

No ratio guarantees that a target will be reached or that a stop will not be hit. The ratios are permitted geometric configurations, not predictions or assurances. All emitted signals remain paper-only and `UNVALIDATED`.
