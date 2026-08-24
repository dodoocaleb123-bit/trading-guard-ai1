# Trading Guard AI — Complete Current-State Description

## 1. Executive summary

Trading Guard AI is a **rules-first, paper-trading market-monitoring and decision-support application**. Its purpose is to read the trading rules supplied by the user, retrieve market snapshots for selected assets and timeframes, identify documented setup indicators, construct a deterministic candidate judgment, qualify the candidate through a stateful Entry Locator, and send only qualified paper signals to Telegram.

The application currently watches **EUR/USD, GBP/USD, XAU/USD, and BTC/USD** on the **15-minute and 1-hour timeframes**. It is designed to monitor continuously, not to force a trade on every scan. The scanner normally receives new market snapshots on approximately five-minute Heartbeat cycles, but v4 may remain silent for many cycles while it accumulates evidence or waits for valid geometry.

The most important limitation is also the most important safety boundary: the system is **paper-only and UNVALIDATED**. It does not place live broker orders, does not manage real money, and cannot guarantee that a take-profit level will be reached or that a stop loss will never be reached. Its job is to apply the documented process consistently, make the evidence visible, and prevent unsupported trade messages from being presented as qualified signals.

> Trading Guard AI is an analytical and monitoring system, not an autonomous broker, investment adviser, or guarantee-producing prediction engine.

## 2. The nature of the application

The application is best understood as a combination of six systems:

| System | Purpose |
|---|---|
| **Strategy memory** | Stores the uploaded trading documents and rule sets that define the operating playbook. |
| **Market-data scanner** | Retrieves current candles and derived market information from Twelve Data for the watched symbols and timeframes. |
| **Replacement Intelligence v4** | Detects documented setup indicators and turns them into a source-linked candidate judgment. |
| **Entry Locator** | Accumulates observations, resolves conflicting directions, validates structural risk geometry, and decides whether a candidate is ready to emit. |
| **Paper-trade monitor** | Tracks generated signals, resolves them using later candles, monitors contradictions, and records audit evidence. |
| **Telegram and dashboard layer** | Delivers compact threaded messages and presents the evidence, diagnostics, outcomes, analytics, and chat experience. |

The application is deliberately not a free-form system that invents a direction first and then searches for reasons afterward. v4 is intended to follow an **indicator-first** process: it searches the supplied market information for setup indicators, then builds a judgment that corresponds to the evidence it found.

## 3. Technical architecture

The user interface is a React 19 application styled with Tailwind CSS 4. The server uses Express and tRPC, with Drizzle ORM connected to the project’s MySQL/TiDB database. Authentication is provided through the Manus OAuth/session layer. The application is deployed through Manus WebDev and uses the project’s configured secrets for data providers, Telegram bots, authentication, and built-in services.

The principal data sources and services are:

| Component | Role in the application |
|---|---|
| **Twelve Data** | Supplies market candles and current price information used by the scanner. |
| **Telegram bots and groups** | Receive compact signals, outcome replies, contradiction warnings, replacement signals, corrections, and requested explanations. |
| **Heartbeat scheduler** | Calls the protected scanner callback approximately every five minutes. |
| **Database** | Stores strategy rules, market decisions, locator state, signals, outcomes, Telegram deliveries, adjustments, lessons, and scheduler run records. |
| **Manus authentication** | Protects user-specific dashboard, data, and administrative operations. |
| **Optional macro/fundamental context** | Can contribute only when verified data is available; unavailable macro data is explicitly marked unavailable rather than fabricated. |

The system stores business timestamps in UTC at the server and database layers and converts them for display in the interface where appropriate. This is important because scanner cycles, candle timestamps, scheduler timestamps, and outcome timestamps must be compared consistently.

## 4. The end-to-end operating cycle

The normal operating cycle begins with the Heartbeat scheduler. The scheduler calls the protected scanner endpoint. The callback authenticates the scheduled task, starts or deduplicates a five-minute run in the scanner ledger, and then calls the scanner for the owner’s watched assets and timeframes.

For each asset/timeframe combination, the scanner obtains the latest market snapshot. The snapshot contains the latest price and candle history needed for structure, momentum, moving averages, oscillators, volatility, support/resistance, price action, timeframe context, and any available macro or intermarket information. The scanner normalizes timezones and applies freshness checks so future-dated or stale snapshots are not treated as current market evidence.

The scanner then passes the enriched market context to Replacement Intelligence v4. If v4 cannot find a directional setup indicator, it does not construct an ordinary candidate direction. It records that no directional evidence was found and the locator continues accumulating future observations. If v4 does find directional evidence, it creates a source-linked candidate judgment and passes the evidence into the Entry Locator.

The Entry Locator evaluates the candidate against its accumulated state. A candidate may remain in `WAITING`, become `READY`, and then become `EMITTED` after the final duplicate, open-signal, and geometry gates are satisfied. Only an emitted paper signal is sent to Telegram. The same scanner cycle may also track existing paper signals, resolve signals using eligible later candles, monitor contradictions, retry a bounded number of failed outcome notifications, and persist the run result.

## 5. Replacement Intelligence v4

### 5.1 Indicator-first reasoning

v4 searches for setup indicators derived from the combined trading knowledge. An indicator is a sign, measurement, or observed condition that contributes evidence about the market. The system does not require every possible indicator to appear before it may form a setup. One or two meaningful setup indicators can be enough, provided the resulting judgment satisfies the applicable quality and geometry rules.

The indicator catalog is organized into families so correlated measurements do not create artificial certainty. The main families include structure, support and resistance, chart patterns, technical indicators, volume, timeframe context, intermarket context, fundamental context, and risk geometry.

Examples of setup indicators include:

| Indicator example | What it contributes |
|---|---|
| **Structure-uptrend** | Higher peaks and higher troughs support a BUY direction. |
| **Structure-downtrend** | Lower peaks and lower troughs support a SELL direction. |
| **Structure-sideways** | A range-bound market reduces directional conviction and makes level context more important. |
| **Momentum confirmation** | Momentum and MACD agree with a direction. |
| **Moving-average alignment** | Price and EMA relationships support the broader direction. |
| **Oscillator confirmation** | RSI and stochastic conditions support directional momentum without acting alone. |
| **Support/resistance context** | Price near a decision level may support a reaction or warn that the path is crowded. |
| **Breakout confirmation** | A confirmed level event may support continuation or reversal logic. |
| **Higher-timeframe alignment** | Larger-timeframe structure and momentum strengthen or weaken the working direction. |
| **Volume confirmation** | Expanding volume can strengthen a pattern or breakout when the data is actually available. |
| **Volatility regime** | Expanding or contracting volatility changes how risk geometry should be measured. |
| **Macro and event context** | Verified economic context may confirm, oppose, or caution the technical direction. |

Each matched indicator has a direction, strength, observation, contribution, and source reference. The source reference identifies the document and passage that support the rule. This makes the decision trace auditable rather than opaque.

### 5.2 Candidate judgment

After indicators are detected, v4 combines their contributions and determines a candidate direction. It records confidence, confluence, market regime, score comparison, supporting components, conflicting components, source-linked observations, and a deterministic decision trace. It also derives candidate entry, stop, and target values for geometry evaluation.

The candidate judgment is not itself a Telegram signal. It is the evidence package that the Entry Locator must qualify. This distinction is central to the application: **v4 identifies a possible setup; the Entry Locator decides whether that possible setup is mature and safe enough to emit as a paper signal.**

### 5.3 Quality thresholds

The Entry Locator uses a stricter threshold when only one strong setup family supports the direction and a lower threshold when at least two strong families agree. The configured policy is:

| Evidence condition | Minimum confidence | Minimum confluence |
|---|---:|---:|
| One strong setup family | 68% | 45% |
| Two or more strong setup families | 60% | 45% |

These thresholds are not a guarantee of success. They are qualification gates. A candidate can exceed them and still remain in `WAITING` because geometry is crowded, a breakout is unconfirmed, a direction is unresolved, event risk requires more repeated observations, or an existing signal prevents duplicate emission.

## 6. The Entry Locator

The Entry Locator is a state machine that maintains separate state for each asset and timeframe. It stores recent distinct observations, the number of snapshots accumulated, the last snapshot timestamp, the last emitted fingerprint, the current status, and the reason for waiting.

The locator retains a rolling window of recent observations and ignores stale or future-dated data. It looks for repeated, coherent evidence rather than treating one isolated snapshot as sufficient. It uses majority direction across the retained observations. If BUY and SELL evidence are tied or materially mixed, the locator remains waiting for resolution.

The principal locator states are:

| State | Meaning |
|---|---|
| **WAITING** | Evidence is still being accumulated, direction is unresolved, quality is insufficient, geometry is crowded, or another gate is not yet satisfied. |
| **READY** | The candidate has passed the evidence, quality, geometry, and risk checks and is eligible for emission, subject to final duplicate protection. |
| **EMITTED** | A paper signal has been sent for the setup. New evidence is still monitored, but a duplicate signal is not emitted for the same active setup. |

When an open signal exists for an asset/timeframe, the locator continues evaluating and tracking new evidence but does not simply emit another duplicate signal. The separate contradiction-monitor path can still react if a later opposing setup becomes strong enough.

The locator does not require every item in the strategy catalog. It requires at least one qualifying directional setup indicator and enough coherent evidence to pass the configured quality and risk rules. This is why the system can sometimes emit after one or two strong indicators, but may remain silent when the observed indicators are contradictory or their geometry cannot support a valid target.

## 7. Entry, stop-loss, take-profit, and geometry

Geometry is the mathematical and structural relationship between the entry reference, the invalidation stop, and the permitted target. The three prices are not chosen independently.

For a BUY setup, the stop is normally derived below relevant support with an ATR-based protective buffer. For a SELL setup, the stop is normally derived above relevant resistance with a protective buffer. The risk distance is then measured from entry to stop:

| Direction | Risk distance |
|---|---|
| BUY | `Entry − Stop loss` |
| SELL | `Stop loss − Entry` |

The active authoritative v4 policy allows only exact **1:2** and **1:3** risk-to-reward ratios for new signals. The targets are calculated as follows:

| Direction | 1:2 target | 1:3 target |
|---|---|---|
| BUY | `Entry + 2 × risk` | `Entry + 3 × risk` |
| SELL | `Entry − 2 × risk` | `Entry − 3 × risk` |

The target is not widened simply because a farther structural level exists. A 1:2 or 1:3 signal must remain an exact permitted ratio after price-precision rounding. Historical records from older phases may show other ratios, but those are not permitted for new authoritative v4 emissions.

### 7.1 Clearance validation

After calculating the candidate target, the locator measures the nearest opposing structural zone and applies a clearance buffer. For a BUY, it examines resistance above the entry. For a SELL, it examines support below the entry. The target must have enough available space before the opposing zone.

This creates an important distinction:

> A market does not need to be literally inside a resistance zone for geometry to be blocked. The target can be blocked simply because the target distance required by the 1:2 or 1:3 rule extends through or too close to that resistance.

For example, if the entry is 100, the structural stop is 99, and resistance is 101.50, then the 1:2 target is 102. The target is beyond the opposing zone even though the current entry price is still below resistance. The setup is therefore crowded under the current policy.

### 7.2 Breakout geometry

A crowded range setup may become eligible after a confirmed breakout. The system does not treat a directional intention or a brief price excursion as enough. The breakout logic checks for a directional breakout state, matching price-action classification, candle agreement, momentum agreement, a sufficient candle body, and volume confirmation when volume is available. The entry must also be beyond the boundary plus the protective buffer.

When a breakout is confirmed, the locator may use the next untouched opposing zone rather than the previously broken level. If the breakout is not confirmed, the system does not project continuation into the unbroken space. It stays in `WAITING` with a diagnostic such as:

> No allowed adaptive ratio has sufficient cleared structural space or breakout confirmation; waiting for coherent geometry.

In plain language, this means the directional evidence may be promising, but the system cannot yet demonstrate that an exact 1:2 or 1:3 target has a sufficiently clear and structurally plausible path.

## 8. Telegram signal delivery

When a signal is emitted, the Telegram layer sends it through the appropriate per-asset routing. The current compact signal style is designed to keep the group readable while preserving the key decision fields:

```text
BUY
XAU/USD · 1H
Entry: 4607.8438
Stop loss: 4599.9593
Take profit: 4623.6129
Risk/reward: 1:2
Confidence: 60% · Confluence: 100%
Score: BUY 1 vs SELL 0
Paper only · UNVALIDATED · v4 active
```

Each delivery is recorded with its asset routing, message type, delivery status, Telegram message identifier, and related signal information. The delivery fingerprint prevents duplicate sends, and the original Telegram message identifier allows later outcomes and adjustments to appear as replies to the original signal.

The system also supports replies for requested explanations. A user can ask for the reason behind a signal, and the application can return the technical and rule-linked explanation in the appropriate Telegram thread. Corrections and warning messages are also designed to be auditable and threaded.

## 9. Outcome tracking

Every emitted signal is a paper record. It remains `PENDING` until a later eligible market candle reaches the calculated target or stop according to the signal direction. The application explicitly avoids using the same pre-entry candle that generated the signal to resolve that signal. This prevents a look-ahead error in which the candle that created the signal could immediately mark it as a WIN.

The tracker records resolution evidence such as:

| Evidence field | Purpose |
|---|---|
| **Resolution candle timestamp** | Identifies the market candle used to resolve the outcome. |
| **Observed resolution price** | Records the price associated with the resolution. |
| **Candle high and low** | Shows whether the target or stop was reached intrabar. |
| **Intrabar evidence flag** | Distinguishes high/low-based evidence from another resolution mode. |
| **Outcome note** | Records the resolution explanation and any safe forensic fallback text. |
| **Telegram outcome delivery** | Links the WIN or LOSS reply to the original signal message. |

A WIN or LOSS message is sent as a reply to the corresponding signal whenever Telegram delivery is available. Resolution telemetry is displayed in Trade History so the user can inspect not only the label but also the candle evidence used to produce it.

## 10. Contradiction monitoring and adjustments

Trading is conceptual and market conditions can change after a paper signal is sent. For that reason, v4 continues monitoring open paper setups. A later scanner snapshot can contain setup indicators that oppose the original signal. The contradiction monitor compares the new direction and indicator evidence with the original signal’s direction.

A contradiction is not sent merely because the raw direction changed. The later evidence must contain meaningful opposing setup indicators and pass the applicable adjustment gates. The current adjustment policy uses lower gates for an adjustment review and stronger gates for a strong reversal recommendation. The system can classify an adjustment as a direction review, a suggested stop tightening, or an exit-paper-setup review.

The current replacement workflow is:

| Later condition | Telegram behavior |
|---|---|
| Strong opposing evidence exists, but the replacement setup does not pass the Entry Locator and geometry rules | Send a concise warning reply to the original signal explaining that the current v4 direction strongly contradicts it and that the paper setup should be reviewed. |
| Opposing evidence passes the dedicated Entry Locator and produces exact 1:2 or 1:3 geometry | Create a new replacement paper signal and send it as a threaded reply to the original signal. |
| No sufficiently strong contradiction exists | Continue monitoring without sending an adjustment. |

The original paper signal is not silently deleted or rewritten. A replacement is stored as a separate linked signal or adjustment, and the original remains auditable. An adjustment does not automatically alter a WIN or LOSS outcome unless a later eligible candle independently resolves the signal according to the tracker’s rules.

## 11. Scheduling and operational reliability

The scanner is invoked by a protected Manus Heartbeat callback approximately every five minutes. The application maintains a durable `scanner_run_ledger` keyed by a UTC five-minute run identity. This provides idempotency: if the same callback is delivered more than once, the duplicate run can be recognized and suppressed instead of processing the same cycle twice.

Each run records its outcome, market-data availability, signal creation count, tracking count, adjustment count, and error information. The dashboard can show recent runs and distinguish several different situations:

| Diagnostic state | Meaning |
|---|---|
| **Callback reached, market data available** | The scheduler reached the application and Twelve Data returned usable data. |
| **Callback reached, market data unavailable** | The scheduler reached the application, but external market retrieval failed or timed out. |
| **Callback unauthorized** | The request did not have valid cron authentication. The endpoint is intended to return HTTP 403 for missing or invalid cron credentials. |
| **Application scanner failure** | The callback was authorized, but an internal scanner operation failed; this is treated separately from authentication failure. |
| **Repeated app-side failures** | Consecutive failures can create an owner notification and a dashboard warning. |

The application also uses configured Twelve Data key failover where supported, normalizes provider timezone output to UTC, and records the difference between a scheduler problem and a provider-data problem. Outcome recovery is bounded and paced so a large historical backlog cannot cause the scanner to send a notification storm to Telegram.

## 12. The dashboard and its sections

The dashboard is the operational control room. It is designed for a personal monitoring workflow rather than a public marketplace. Its main areas include the following.

### Control room

The overview shows the number of ingested rule sets, open paper signals, broad generated-signal win rate, completed audits, strategy judgments, market watchlist information, delivery status, and v4 monitoring summaries. These values are loaded from persisted application data rather than being hardcoded demonstrations.

### Strategy rules

The user can upload PDF, Word, or plain-text strategy material. The application stores the rule set and uses it as strategy memory. Rules are intended to cover entry conditions, invalidation rules, risk limits, timeframes, sessions, and mistakes the guard should avoid.

### Chat Audit

The Chat Audit section is the conversational part of the application. It is intended to let the user ask trading questions, audit a proposed idea, request explanations, inspect signal reasoning, and ask about app-derived market or outcome information. It is not a separate live trading agent and it does not place orders. Its answers should be interpreted against the available rule memory, current market data, stored signals, and recorded outcomes.

### Scanner

The Scanner page exposes the operational state of the market-data and v4 pipeline. It can show the latest snapshots, locator state, confidence and confluence, breakout state, geometry mode, target-boundary information, waiting reasons, recent decisions, scheduler status, and adjustment activity.

### Trade History

Trade History lists generated paper signals and their outcomes. It now includes resolution evidence such as the resolution candle timestamp, observed price, candle high/low range, intrabar mode, and the persisted outcome note. This makes it possible to distinguish a genuine post-entry resolution from a premature or malformed outcome.

### Winning rate

Winning Rate separates historical records by intelligence version and reports generated signals, resolved signals, wins, losses, and win rate. It can further separate results by asset, timeframe, and confidence band. The application preserves historical versions so v1, v2, v3, and v4 records are not silently mixed together.

### Best Time to Trade and Best Days to Trade

These analytics group paper signals by UTC hour or weekday for each asset, timeframe, and intelligence version. They show generated signals, resolved signals, take-profit hits, stop-loss hits, and win rate. The documented formula is:

```text
Win rate = (take-profit hits ÷ resolved signals) × 100
```

Empty time buckets are shown as zero so the user can distinguish “no activity” from missing data.

### Adjustments and diagnostics

The dashboard can show contradiction evaluations, adjustment records, breakout diagnostics, delivery statuses, scheduler history, ratio-specific performance, and warnings. These sections are intended to explain why the app did not send a signal as well as why it did.

## 13. Auditing and learning from outcomes

The application has two related forms of auditing. The first is **trade-idea auditing**, where a user’s proposed idea is compared with the uploaded strategy rules and current market information. The second is **post-outcome auditing**, where resolved paper signals are analyzed for recurring patterns, losses, geometry, confidence calibration, and rule evidence.

The learning process is deliberately constrained. A loss can produce a proposed lesson, but a single loss is not automatically promoted into active intelligence. Comparable paper outcomes must be reviewed and accepted before a lesson can influence later decisions. Accepted lessons remain source-linked and are applied with bounded adjustments rather than rewriting the entire strategy.

The application also protects itself from malformed forensic responses. If an analysis provider returns incomplete fields, the application now writes safe fallback text instead of persisting literal `undefined` values. Historical corrupted lesson records were quarantined without deleting the underlying rows, and historical outcome statuses were preserved.

This means the app is **learning in an evidence-management sense**, not retraining an unconstrained neural network autonomously. It accumulates outcomes, creates proposed lessons, permits reviewed lessons to influence bounded scoring, and retains a rollback-safe audit trail.

## 14. How to interpret common messages

### “Waiting for at least one strong setup indicator”

The current market information did not contain a qualifying directional indicator. The scanner continues collecting snapshots rather than guessing a direction.

### “BUY and SELL evidence are tied or mixed”

There are directional observations, but the current evidence does not resolve which side is stronger. The locator waits for additional observations or clearer evidence.

### “Confidence/confluence remain below the threshold”

The candidate has some evidence, but it has not reached the configured quality gate. The system does not treat every indicator as an independent guarantee.

### “No allowed adaptive ratio has sufficient cleared structural space or breakout confirmation”

The candidate direction may be promising, but neither the exact 1:2 nor exact 1:3 target has enough open path before the opposing structure. A confirmed breakout could change the geometry; otherwise the locator continues waiting.

### “Active paper setup already exists; new setup evidence is tracked but no duplicate is emitted”

The same asset/timeframe already has an open paper signal. v4 continues watching for contradiction or replacement evidence but avoids flooding Telegram with duplicate entries.

### “Locator reached EMITTED”

The Entry Locator completed its gates and approved a paper signal for delivery. It does not mean the trade is guaranteed to win; it means the signal passed the application’s configured evidence, geometry, and duplicate controls.

## 15. What the app does not do

Trading Guard AI does not place orders with a broker, transfer money, manage a live account, or guarantee profit. It does not know the future path of a candle. It does not turn an unavailable economic-calendar source into fabricated macro direction. It does not treat high confidence as certainty. It does not send a signal merely because the five-minute scanner cycle occurred.

It also does not automatically treat every observed breakout as confirmed. A price movement above an apparent resistance level must satisfy the application’s breakout evidence rules before the next structural zone can be used. Similarly, a farther target is not automatically accepted if it violates the exact 1:2 or 1:3 policy.

A missing Telegram message can therefore have several different meanings. The scanner may have failed, market data may be unavailable, the locator may still be waiting, the setup may have failed geometry, the asset may have been outside its active market conditions, or no new signal may have been created. The dashboard’s operational diagnostics exist to distinguish those cases.

## 16. Current operational interpretation

At the last verified application release, the active scanner path, market-data retrieval, v4 evaluation, Telegram delivery, outcome tracking, and dashboard rendering had passed the application’s regression, typecheck, build, database, endpoint, and responsive-layout checks. The deployed system was still conservative: several assets could show strong directional indicators while remaining in `WAITING` because exact 1:2 or 1:3 geometry was not clear enough.

That behavior is intentional under the current policy. The scanner’s five-minute cadence means the system keeps looking, but the Telegram cadence is event-driven: a message is sent when a setup becomes qualified, not simply every time a snapshot arrives.

## 17. One-sentence description

> Trading Guard AI is a paper-only, rules-grounded market-monitoring application that converts uploaded trading knowledge and live Twelve Data snapshots into auditable, indicator-first v4 setup judgments, sends only Entry-Locator-qualified 1:2 or 1:3 paper signals to threaded Telegram channels, tracks their later outcomes, monitors contradictory evidence, and presents the entire process through operational dashboards, analytics, auditing, and chat.
