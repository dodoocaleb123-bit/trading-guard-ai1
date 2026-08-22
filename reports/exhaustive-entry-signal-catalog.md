# Exhaustive Entry-Signal and Good-Setup Catalog

## Scope and interpretation

This catalog covers the complete extracted text of `Forextrading.docx`. Repeated explanations, chart captions, and worked examples have been consolidated into distinct rule families so the same signal is not counted many times. The line references below refer to the complete extracted text at `/tmp/Forextrading.txt`; they are audit anchors rather than page numbers because the source is a compiled document containing multiple books, tutorials, examples, and embedded charts.

The document does **not** present one single universal entry system. It presents several compatible and sometimes competing approaches: trend following, support/resistance reactions, breakouts, reversal patterns, indicator confirmation, intermarket context, scalping, surfing, and discretionary trading-plan guidance. A good setup is therefore generally described as a combination of context, location, trigger, confirmation, risk definition, and disciplined execution—not as one indicator firing in isolation.

## 1. Market-context checks before entry

| Check | Entry implication in the document | Evidence anchor | Automation classification |
|---|---|---|---|
| Identify the broader trend | Determine whether price is making higher highs/higher lows, lower highs/lower lows, or moving sideways before selecting direction. | Trend material; v4 source nodes `structure-uptrend`, `structure-downtrend`, `structure-sideways` | Deterministic when swing structure is defined |
| Start from the larger timeframe | Review the larger chart first, then use the smaller timeframe to refine timing. | “Bigger Perspectives”; v4 node `higher-timeframe-first` | Deterministic if aligned timeframe data exists |
| Distinguish trend from no trend | Do not force a trend strategy in a range; trendline analysis is described as a first test of whether a discernible trend exists. | Lines around 2917–2941 | Conditional and partly discretionary |
| Trade with the prevailing trend | Trend-following entries are preferred when the smaller movement agrees with the larger trend. | Surfing and micro-trend sections around 7788 onward | Deterministic after trend definitions are fixed |
| Require a prior trend for a reversal | A reversal pattern needs something preceding it to reverse. | v4 node `reversal-prior-trend` | Deterministic |
| Consider session and activity | European activity is described as higher than American, with Asian activity lower; overlap periods are presented as useful for short-term timing. | “When?” and scalp sections; lines around 7788–7810 | Deterministic as a context modifier, not a direction signal |
| Consider related markets | Related instruments or currencies may provide an earlier warning or confirmation when their data is available and synchronized. | “Relativity” and intermarket sections around 1727–1819 | Conditional; neutral when data is unavailable |

## 2. Support, resistance, and liquidity entries

| Signal or check | What to look for before entry | Confirmation or warning | Automation classification |
|---|---|---|---|
| Buy near support | Price approaches a recognized support area and shows a reaction or reversal upward. | A clean reaction, higher low, or confirming momentum improves the setup. | Deterministic only after support-zone rules are fixed |
| Sell near resistance | Price approaches a recognized resistance area and shows a reaction or reversal downward. | A clean rejection, lower high, or confirming momentum improves the setup. | Deterministic only after resistance-zone rules are fixed |
| Break support or resistance | A close beyond a decision level can create a breakout or reversal trigger depending on context. | Retest, volume, and higher-timeframe agreement are described as useful confirmations. | Deterministic if close/retest definitions are explicit |
| Second test of support or resistance | Double-bottom or double-top behavior can create an entry on the second test, especially when an extreme tick reading or other confirmation is present. | Tick/volume confirmation; lines around 6175–6176. | Conditional and data-dependent |
| Liquidity inducement / false breakout | Price may clear one side of a range or a visible level before reversing. | Wait for failure and opposing confirmation rather than treating the first break as genuine continuation. | Conditional; needs explicit liquidity and failure definitions |
| Range-bound support-to-resistance trade | In a consolidation, buying at support and selling at resistance is described as one approach. | The document also warns that range boundaries may be inducement zones. | Conditional; conflicts with breakout mode |
| Range breakout | A break from a consolidation range can be traded in the breakout direction. | Breakout quality, close beyond the boundary, retest, and volume reduce false-breakout risk. | Deterministic after range and close rules are fixed |

The document specifically states that support and resistance can be both reaction points and inducement areas. Consequently, proximity to a level alone is not a complete entry signal. The app should distinguish **reaction**, **confirmed break**, and **failed break**, rather than assigning the same meaning to every touch.

## 3. Reversal-pattern entries

| Reversal setup | Required elements | Invalidation or caution |
|---|---|---|
| Double top | A preceding uptrend, two tests of a resistance area, and a break of the relevant neckline/support area. | Without a prior trend or level break, the pattern is incomplete. |
| Double bottom | A preceding downtrend, two tests of a support area, and a break of the relevant neckline/resistance area. | A visual two-touch pattern without confirmation is not enough. |
| Head and shoulders / inverse head and shoulders | A prior trend, recognizable pattern geometry, and a break of the neckline. | Failure to break the neckline invalidates completion. |
| Other reversal chart patterns | Pattern formation plus a level violation and, where available, volume confirmation. | The source repeatedly emphasizes that patterns are not complete merely because their shape appears. |
| Trendline reversal | A trendline break followed by confirmation, such as taking out the previous bounce high or low; lines around 9531. | Do not enter solely on the first trendline penetration if confirmation is absent. |
| Reversal after a liquidity clear | A false breakout or inducement clears a visible level and price then reverses. | The first break may be a trap; require evidence that the failure has occurred. |

The document’s general reversal sequence is: **prior trend → pattern or level interaction → relevant support/resistance violation → confirmation → entry**, with volume and other technical reasons used as additional support.

## 4. Breakout and continuation entries

| Breakout signal | Entry logic | Good-setup evidence |
|---|---|---|
| Support/resistance breakout | Enter after price breaks a meaningful boundary in the direction of the break. | A closing break, expanding volume, momentum agreement, and higher-timeframe alignment. |
| Trendline breakout | Enter after a trendline is broken and the market confirms the new direction. | Taking out a previous bounce high/low or forming a small wave in the new direction; lines around 9531. |
| Range breakout | Enter when price exits a defined consolidation range. | Boundary clarity, close outside the range, retest or follow-through, and protection against inducement. |
| Bollinger-band breakout | Bands can be used as breakout boundaries rather than automatically as resistance; the source explicitly says Bollinger Bands worked better as a breakout indicator in the referenced strategy. | Band expansion, price outside the band, trend/momentum agreement, and risk control. |
| Breakout continuation after a pullback | After a break of structure or level, wait for the first pullback and enter if the new direction resumes. | Pullback holds the broken area or a supply/demand zone, then resumes with momentum. |
| Breakout with volume | The completion of a chart pattern should be accompanied by an increase in volume. | Volume expansion confirms participation; absent volume is weaker evidence where volume is available. |

The document also warns that breakouts can be false. Therefore a deterministic implementation should retain separate states for **breakout**, **confirmed breakout**, **failed breakout/fakeout**, and **unresolved breakout**.

## 5. Pullback, trendline, channel, and Fibonacci entries

| Setup | Entry condition | Notes |
|---|---|---|
| First pullback after a break of structure | After a breakout or structure break, identify the first retracement into a potential supply/demand or decision zone, then enter on renewed continuation. | The document cautions that the first zone can itself be inducement for another zone; lines around 830. |
| Trendline bounce | Price reaches a well-defined trendline and confirms a bounce in the direction of the larger trend. | Trendline quality is subjective; confirmation is required. |
| Channel boundary reaction | Price reacts at the upper or lower channel line. | Channel lines combine trendlines and act as support/resistance; a reaction is not guaranteed. |
| Surfing a trend wave | On an hourly or larger chart, identify a defined trendline, wait for a confirmed bounce, then catch a suitable wave in the new direction. | The document emphasizes patience and confirmation; lines around 10185–10191. |
| Fibonacci retracement pullback | Use a retracement level as a location within the existing trend, not as a standalone direction signal. | The v4 implementation bounds this to a secondary 38.2%–61.8% context and requires structural agreement. |
| Previous-day high/low break or scalp | A break of the previous day’s high/low can be used for a scalp or position entry in the larger trend. | The document also allows other convenient entries, preferably near active overlap periods, so this is one method rather than a universal requirement. |

## 6. Indicator-based signals and confirmations

The document lists indicators as tools for identifying trend, volatility, momentum, and overbought/oversold conditions. It also warns against using too many conflicting indicators or allowing one tool to make the entire decision.

| Indicator or tool | Signal or setup clue described | Required caution |
|---|---|---|
| Moving averages | Use average-price direction and alignment to identify trend; shorter and longer averages can qualify direction. | Moving averages lag and should not be used alone. |
| MACD line/signal line | A MACD cross above the signal line is described as a buy signal; a cross below is described as a sell signal, around line 734. | Crosses can lag and need trend/location context. |
| MACD histogram | Histogram above zero supports positive momentum; a falling positive histogram warns that an uptrend is weakening; a rising negative histogram warns that a downtrend is weakening. | Momentum weakening is a warning or exit/reversal clue, not an automatic entry by itself. |
| RSI / RSI-Bars | Use oscillator condition to assess momentum, stability, and possible overbought/oversold state. | The document presents oscillators as supporting tools, not standalone signals. |
| Stochastic | Compare closing price with its range to identify momentum and possible overbought/oversold conditions. | Needs price and trend context. |
| Bollinger Bands | Band position and expansion can support breakout interpretation; the referenced Bollinger Bandit material favors breakout use. | Do not assume every touch is a reversal. |
| Momentum | Momentum should agree with the proposed direction. | Divergence or weakening momentum reduces setup quality. |
| Tick index | Extreme positive or negative tick readings can help confirm second tests of resistance/support and buy/sell signals. | The document says tick readings are not always accurate and work better with other techniques. |
| Volume | Volume expansion confirms pattern completion and helps validate breakouts or reversals. | Volume must be available and comparable for the instrument/timeframe. |
| S.E.X. lines | Used to identify relative trend strength, possible trend beginnings, and anticipated trend ending; not intended as the sole decision tool, around line 7163. | Treat as context and confirmation only. |

A good indicator setup therefore requires **directional agreement**, not merely a high or low oscillator reading. The document repeatedly favors combining a small number of coherent technical reasons over “information overload.”

## 7. Intermarket and fundamental context

The source material discusses fundamental information, economic news, interest rates, trade data, employment, inflation, money supply, and intermarket relationships. These are primarily context and catalyst inputs rather than mechanical candle triggers.

The document’s pre-trade fundamental checks include whether the economic and political environment supports the currency view, whether current news or releases can change the market quickly, whether interest-rate expectations support demand, and whether related markets confirm the proposed direction. It also describes intermarket charts as an additional dimension that can provide early warnings or trend-forecasting context.

For the active v4 app, these concepts are implemented conservatively: official macro data and the Forex Factory weekly export can add event-risk and bias context when available; unavailable or stale data remains neutral; macro disagreement is retained as a conflict rather than fabricated into a directional signal. An event close to release time is a caution condition because the initial move may overshoot and correct.

## 8. Timing, timeframe, and execution checks

Before taking a trade, the document’s practical guidance supports checking the larger trend, selecting an entry timeframe consistent with the strategy, and considering the activity of the current market session. It describes hourly and daily charts for trend and wave context, while shorter charts can refine scalps and smaller targets.

The document describes several execution styles: short-term scalps near strategically significant levels, “surfing” a larger trend wave, position-style entries that allow profits to run, and entries following a confirmed reversal. These styles have different stop, target, and management rules and should not be mixed silently in one generic setup label.

## 9. Invalidation and exit-related conditions that affect entry quality

The document’s entry logic is inseparable from invalidation. A setup should be rejected, downgraded, or treated as incomplete when the prior trend required for a reversal is absent; the relevant support/resistance level has not broken when a break is required; the breakout appears to be a fakeout; volume confirmation is required but unavailable or contradicts the pattern; the higher timeframe opposes the lower-timeframe entry; momentum weakens or diverges; the market is too range-bound for a trend method; or the stop cannot be placed at a logically defined invalidation level.

The document also discusses trailing stops after favorable movement, moving stops to breakeven or profit, using swing retracement lows/highs as trailing references, and manually exiting near a range boundary or when reversal evidence appears. These are trade-management rules rather than initial entry triggers, but they define whether a proposed entry has a coherent risk plan.

## 10. Risk and discipline requirements before entry

The document explicitly emphasizes a trading plan, money management, patience, discipline, realistic objectives, and understanding risk. It advises waiting for a setup according to the plan, defining the entry and exit before acting, protecting capital, and practicing methods in a demo account before risking real money. It also states that no strategy is a holy grail and that trading is unpredictable.

A good setup therefore requires a finite and explainable stop, a realistic target, acceptable position risk, and no reliance on certainty. The active v4 geometry follows this principle by placing stops beyond observed structure with an ATR/volatility buffer and preserving minimum 2R paper geometry when the opposing structural zone is too close, with a confidence downgrade and explicit trace.

## 11. Consolidated pre-trade checklist

A document-grounded pre-trade checklist can be expressed as the following sequence:

1. Identify the higher-timeframe market state: rising trend, falling trend, or range.
2. Decide whether the selected method is trend continuation, pullback, breakout, reversal, range reaction, scalp, or surfing.
3. Confirm that the location is meaningful: support, resistance, trendline, channel boundary, Fibonacci area, range boundary, prior-day level, or breakout retest.
4. Confirm the trigger: reaction, close beyond a level, retest, first pullback, trendline confirmation, reversal pattern completion, indicator cross, or momentum resumption.
5. Check that required confirmation exists: volume, momentum, MACD/indicator agreement, higher-timeframe alignment, related-market context, or event context.
6. Check for warnings: fakeout, inducement, conflicting timeframe, weakening momentum, missing data, imminent high-impact event, or excessive range conditions.
7. Define the invalidation point, stop, target, and risk before entry.
8. Reject or downgrade the setup when the geometry is incoherent, the required prerequisite is absent, or the signal depends on an unavailable input.
9. Record the exact rule evidence and provenance so the paper outcome can later be evaluated.

## 12. What can safely become deterministic v4 logic

The strongest candidates for deterministic implementation are swing-defined trend structure; explicit support/resistance zones; confirmed closes beyond levels; retest and first-pullback states; prior-trend and neckline/level-break requirements for reversals; EMA, MACD, RSI, stochastic, Bollinger, momentum, and volume features with family caps; higher-timeframe alignment; session and event-risk modifiers; conditional intermarket evidence; and structure-aware risk geometry.

The weaker candidates are visually subjective pattern labels without formal geometry, “sure” or “perfect” forecasts, discretionary judgment about whether a trendline is beautifully defined, qualitative smart-money or inducement narratives without observable state definitions, and any claim that an indicator or economic event knows exactly where price must go. These should remain explanatory context or be converted into explicitly testable definitions before influencing v4 decisions.

## Conclusion

The document contains substantially more than a short list of indicators. Its complete entry philosophy is a layered process: **context and regime → meaningful location → setup pattern or level interaction → trigger → confirmation → invalidation and risk plan → disciplined execution**. The active v4 model already represents many of the reproducible layers, but this catalog confirms that exhaustive one-to-one encoding would require additional formal definitions and validation for each named pattern and discretionary method. Nothing in the document justifies promising a high or guaranteed winning rate.
