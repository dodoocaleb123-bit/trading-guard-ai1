# Project TODO

- [x] Establish secure configuration for Supabase, Twelve Data, Telegram, and LLM integrations
- [x] Define database schema for strategy rules, chat messages, audited trades, generated signals, and trade outcomes
- [x] Implement first-launch strategy onboarding for PDF, DOCX, and plain-text uploads
- [x] Implement persistent strategy rules management and rule listing
- [x] Implement live-market data service for EUR/USD, XAU/USD, GBP/USD, and BTC/USD
- [x] Implement AI chat audit workflow with structured APPROVED / DENIED verdicts
- [x] Implement autonomous multi-timeframe scanner for 15-minute and 1-hour data
- [x] Implement generated signal persistence and Telegram delivery
- [x] Implement outcome tracking with WIN / LOSS / PENDING states
- [x] Implement LLM-powered loss forensics and strategy-rule learning loop
- [x] Implement dashboard overview, audit chat, scanner status, rules, and trade history screens
- [x] Add loading, empty, error, and responsive states across the application
- [x] Add Vitest coverage for core parsing, validation, audit, and outcome logic
- [x] Run typecheck, tests, and visual verification; fix discovered issues
- [x] Save a final checkpoint and provide configuration and usage guidance

- [x] Replace quote-only scanning with real Twelve Data OHLCV analysis for both 15MIN and 1H and persist the actual timeframe
- [x] Create the production Heartbeat schedule for the scanner after deployment and persist its task UID (task UID: EnfwsTycFLRuumvRBiKPSp)
- [x] Invoke loss forensics on LOSS outcomes and persist learned guardrails into rule storage and Supabase
- [x] Add explicit error states to all query- and mutation-driven screens
- [x] Add Vitest coverage for document parsing, audit flow, scanner generation, and WIN/LOSS transitions
- [x] Add explicit ChatAudit history errors and ScannerPage settings/toggle/activation error states
- [x] Add behavioral tests for audit verdicts, mocked OHLCV scanner creation, WIN/LOSS tracking, and loss-forensics rule learning

- [x] Fix PDF strategy-rule upload persistence failure for large extracted documents
- [x] Add regression coverage for large rule content and upload mutation error feedback

- [x] Fix Chat audit access to persisted strategy rules
- [x] Add regression coverage proving audit context includes saved rules

- [x] Diagnose missing Telegram trade signals across schedule, scanner eligibility, and bot delivery
- [x] Add regression coverage for Telegram delivery and no-signal scanner conditions
- [x] Add mocked Telegram delivery success/failure coverage
- [x] Add scanner no-signal skip coverage for unavailable market data

- [x] Re-check production Twelve Data quota, scanner executions, signal eligibility, and Telegram delivery after the credential refresh
- [x] Verify a real Telegram notification reaches the corrected recipient
- [x] Verify a production scanner run with the replacement Heartbeat task UID
- [x] Add explicit production logs for Telegram delivery and scanner summaries

- [x] Define Manus-hosted frontend versus GitHub-connected backend responsibilities
- [x] Prepare repository deployment documentation and environment-variable template
- [x] Document database, storage, OAuth, Telegram, Twelve Data, Supabase, and Heartbeat migration requirements
- [x] Verify the existing Manus-hosted app remains the primary live deployment

- [x] Add Render backend deployment configuration for the Node/Express server
- [x] Add GitHub/Render deployment documentation without exposing secrets
- [x] Document Manus frontend API routing, OAuth callback, database, and Heartbeat considerations
- [x] Verify the Manus-hosted frontend remains unchanged and live
- [x] Smoke-test the published Manus frontend after Render-prep changes
- [x] Capture hosted verification showing the live Manus app remains available

- [x] Resolve the connected GitHub repository and Render service context (superseded by native Manus hosting)
- [x] Resolve backend deployment target after confirming the user selected native Manus hosting

- [x] Verify GitHub source access through the supplied repository URL
- [x] Preserve the supplied GitHub repository as the source; no export was requested
- [x] Replace Render service setup with native Manus environment configuration

- [x] Keep the existing user-owned GitHub repository; no new repository was requested
- [x] Import and verify the prepared project in the Manus workspace instead of exporting to a new repository

- [x] Import the existing Trading Guard AI GitHub application into the Manus project workspace
- [x] Reconcile the repository’s full-stack configuration with Manus hosting conventions
- [x] Configure required Manus and external integration environment variables
- [x] Apply and verify the existing database schema migrations without destructive changes
- [x] Run type checking and production build successfully
- [x] Verify the Manus preview is reachable and correctly enters the Trading Guard AI OAuth sign-in flow; authenticated dashboard verification requires the user’s login
- [x] Save the final Manus checkpoint and prepare publish instructions

## Publish handoff

- [x] Publish instructions: open the latest checkpoint in the Manus Management UI and click **Publish**; choose the default Autoscale hosting option unless an always-on worker is required. After publishing, use the generated Manus URL to sign in and complete the authenticated dashboard smoke test.

- [x] Trace and fix production delivery of approved trade signals to the configured Telegram recipient
- [x] Add regression coverage for approved-signal Telegram delivery and scheduled scanner execution
- [x] Verify the production Heartbeat job is enabled and the deployed scanner callback is reachable; no Heartbeat execution record has appeared yet, so Telegram delivery remains pending the platform scheduler run

- [x] Diagnose why production trade signals stopped reaching Telegram: Twelve Data returned HTTP 429 because the daily quota was exhausted
- [x] Restore reliable approved-signal generation and Telegram delivery by reducing each scanner cycle to two batched Twelve Data requests, reusing candles for outcome tracking, and changing cadence to fifteen minutes so usage stays within the confirmed 800-credit daily plan
- [x] Add regression coverage for the outage cause and verify the production scheduler reached the callback; delivery was blocked by the provider’s exhausted daily quota, not Telegram configuration

- [x] Confirmed the primary Twelve Data daily quota has not reset, but an authorized failover key returns live market data and the production scanner schedule runs without an upgrade; the latest production cycle found no qualifying setup, so no Telegram signal was expected

- [x] Add three authorized Twelve Data API keys as separate secure environment secrets (superseded by four additional keys below)
- [x] Implement quota-aware key rotation with safe five-minute scanner budgeting
- [x] Add failover regression tests and verify Telegram delivery after deployment

- [x] Configure four additional authorized Twelve Data API keys, for up to five total rotating accounts

- [x] Audit persistence of the newly ingested forex PDF strategy rules: 44 PDF rule records, 40 distinct PDF files, and zero empty content records are present
- [x] Verify the AI judgment retrieval path: local strategy rules are aggregated and passed into every audit prompt; no post-ingestion audit exists yet to prove runtime use
- [x] Assess judgment evidence without claiming guaranteed trading correctness: the two stored audits predate the PDF ingestion, so post-update consistency cannot yet be assessed

- [x] Inventory the full ingested strategy library and normalize audit context into source-labeled, bounded rule excerpts; 44 PDF records and 40 distinct files are included
- [x] Implement conflict resolution, weighted BUY/SELL confluence scoring with a 70% threshold, live-market evidence gates, 75% minimum confidence, and directional risk controls
- [x] Implement explainable decision outputs with validated rule citations in audit history and approved Telegram messages
- [x] Implement and expose the validation boundary: every judgment is labeled UNVALIDATED until historical and forward samples establish evidence; the algorithm fails closed on insufficient evidence

- [x] Define and retain a real-data historical validation protocol for the four watched markets and two timeframes using 200 Twelve Data candles per market/timeframe
- [x] Retain and run a reproducible real-data validation script; the measured result covers the app’s trend direction and 1:2 risk geometry, not a profitability claim for every prose PDF rule
- [x] Retain explicit paper-validation mode in the durable report protocol and reuse the app’s generated-signal and WIN/LOSS/PENDING outcome tracking; the app does not place trades
- [x] Save the validation sample report with performance, coverage, and limitations; most one-candle outcomes remained unresolved, so the sample is not sufficient for live-performance claims

- [x] Add sent date and time to every Trading History entry
- [x] Reconcile generated, approved, attempted, delivered, and failed Telegram signal counts with a durable delivery ledger; historical pre-ledger deliveries cannot be reconstructed
- [x] Add auditable delivery status and count summaries so new app records match Telegram delivery outcomes

- [x] Add explicit approved-audit counts and approved Telegram delivery counts to the reconciliation summary
- [x] Join Telegram delivery status and delivered timestamp onto each generated signal and approved audit row
- [x] Add regression coverage for per-record delivery status and approved-count reconciliation

- [x] Surface approved-audit Telegram delivered and failed counts in the Trading History reconciliation card
- [x] Add regression tests for per-record delivery joins on generated signals and approved audits

- [x] Route every autonomous scanner candidate through the shared strategy-rule evidence gate before persistence or Telegram delivery
- [x] Ensure scanner-approved messages include rule citations, confluence, and validation status
- [x] Add regression coverage proving rejected scanner candidates never reach Telegram

- [x] Revise autonomous scanning so raw market data is sent to the strategy engine to generate the best-supported possible trade outcome and signal
- [x] Preserve explainable rule citations, learning context, UNVALIDATED status, directional risk checks, and Telegram delivery reconciliation in the revised workflow
- [x] Add regression coverage for strategy-generated scanner signals, denied outcomes, and delivery behavior
- [x] Verify the five-minute scheduler, production logs, and live Telegram workflow after deployment; the enabled job reached the deployed callback, and when the strategy model service reported exhausted usage the scanner failed closed with no signal persistence or Telegram attempt


- [x] Audit user-facing copy for wording that incorrectly attributes trading judgments to the scanner
- [x] Clarify that the scanner collects and dispatches raw market data while the strategy-rules algorithm makes judgments and generates possible outcomes
- [x] Add terminology regression coverage and verify the revised dashboard and scanner interface


- [x] Add a persistent strategy-engine decision ledger with rule evidence, confluence, verdict, and generated outcome details
- [x] Add model-service availability status that distinguishes market-data collection from strategy judgment availability
- [x] Add a configurable setup cooldown to reduce repeated analysis of unchanged market conditions
- [x] Add backend, UI, database, and regression-test coverage for the three improvements
- [x] Run migration, full validation, visual verification, and publish the completed release


- [x] Add expandable decision-ledger rows with full rule citations and market snapshots
- [x] Add dashboard summaries for approved, denied, skipped, and unavailable strategy judgments
- [x] Add a persistent audit trail for setup-cooldown configuration changes
- [x] Add backend, UI, migration, and regression-test coverage for these improvements
- [x] Run full validation, visual verification, and publish the release


- [x] Add decision-ledger filtering by asset, timeframe, and judgment status
- [x] Add CSV and JSON export for decision-ledger evidence
- [x] Add a scheduled weekly strategy-judgment summary with safe notification delivery
- [x] Add backend, UI, scheduler, and regression-test coverage for these features
- [x] Run full validation, visual verification, and publish the release


- [x] Create and persist the real weekly Heartbeat job for the weekly strategy-summary callback (task UID: NuHvnxtr2LLaJ23tKLdLoD; Sunday 18:00 UTC; enabled)
- [x] Add regression coverage for cron-only authorization, delivered-summary idempotency, and failed-delivery retry behavior


- [x] Diagnose the current absence of Telegram trade signals from live scheduler, strategy-engine, cooldown, and delivery evidence: recent five-minute runs return created=0 with marketData=available; strategy engine is AVAILABLE; no current ledger verdicts or cooldown entries exist; latest generated signal delivery rows are DELIVERED


- [x] Remove scanner-side trading-setup filtering so every valid raw OHLCV snapshot reaches the strategy-rules algorithm (superseded by the stricter pure-collector implementation below)
- [x] Preserve only data-quality, authorization, provider-availability, and cooldown safety checks before strategy judgment (superseded by the user’s stricter requirement: no scanner-side market-data checks)
- [x] Add regression coverage proving all valid market snapshots are forwarded and only the strategy-rules algorithm decides outcomes (covered by the final raw-forwarding regression)
- [x] Run full validation, live workflow verification, and publish the correction (completed by the final raw-forwarding validation below)


- [x] Make the scanner a pure raw-market-data collector with no quality checks, trading filters, scoring, or judgment
- [x] Forward every retrieved asset/timeframe snapshot to the strategy-rules algorithm for interpretation and signal generation
- [x] Update regression coverage so only the strategy-rules algorithm can approve outcomes and trigger Telegram delivery
- [x] Run full validation, live forwarding verification, and publish the correction; post-release Heartbeat run at 23:55 UTC logged Forwarding 8 raw market snapshots to the strategy-rules algorithm and returned HTTP 200 with marketData=available


- [x] Recheck the latest deployed scanner cycle and explain why no new approved signal reached Telegram: the 23:55:55 UTC run forwarded 8 raw snapshots and returned HTTP 200 with created=0; clean database counts show strategy_decision_ledger rows=0/latest ID=0, generated signals=287/latest ID=1080008, and Telegram deliveries=55/latest ID=210001, so no new strategy decision, signal, or Telegram attempt was created in that cycle


- [x] Make the strategy-rules algorithm return BUY or SELL for every forwarded raw market snapshot, with generated entry, stop loss, and take profit
- [x] Preserve UNVALIDATED paper-validation labeling, rule citations, confluence, and Telegram delivery tracking
- [x] Add regression coverage proving empty strategy responses are converted into deterministic BUY/SELL judgments rather than silently producing no signal
- [x] Run full validation, live directional-decision verification, and publish the correction


- [x] Refresh and verify the enabled five-minute Heartbeat after the directional-judgment release; refreshed at 00:31 UTC and the callback returned HTTP 200 with marketData=available
- [x] Add a dashboard card comparing directional strategy judgments with Telegram-approved alerts
- [x] Add regression coverage, validate, visually verify, and publish the update


- [x] Add deterministic market-context features derived from raw OHLCV for strategy-engine inputs
- [x] Include structure, volatility, candle behavior, support/resistance, momentum, range/breakout state, and multi-timeframe context without invented facts
- [x] Preserve raw candles, rule evidence, UNVALIDATED labeling, and Telegram approval safeguards
- [x] Add feature-calculation and strategy-input regression tests
- [x] Run full validation, visual verification, and publish the detailed market-context release


- [x] Show calculated market-context details inside expandable decision-ledger rows
- [x] Add a 15-minute versus 1-hour confluence panel for each asset
- [x] Add visible diagnostics for denied placeholder judgments and their causes
- [x] Add regression coverage, validate, visually verify, and publish the update


- [x] Diagnose why the strategy-rules algorithm is denying recent raw market snapshots and distinguish rule-gate failures from placeholder responses: latest rows have empty ruleEvidence, 0 confidence, 0 confluence, and the exact no-structured-judgment placeholder reason; they are not genuine rule-evidence denials


- [x] Compact relevant strategy-rule context for each scanner decision batch
- [x] Use smaller strategy-engine batches and strictly validate one complete response per snapshot
- [x] Retry malformed or empty model responses once and persist technical failures as UNAVAILABLE
- [x] Prevent fake DENIED placeholders and Telegram delivery from failed model responses
- [x] Add regression coverage and full validation; live verification remains pending after the release checkpoint


- [x] Monitor live Heartbeat cycles after the strategy-engine reliability release and verify directional decisions, retries, and unavailable-model handling; the scheduler returned HTTP 200 in 10.3 seconds, while health counters recorded 0 complete responses, 1 retry, and an UNAVAILABLE model cycle
- [x] Add production strategy-engine health metrics for response completeness, retry counts, and unavailable-model cycles
- [x] Add dashboard health-panel UI and regression coverage for the new observability metrics
- [x] Run full validation and visual verification; publish the monitoring release after the checkpoint
- [x] Harden live structured-response reliability by evaluating one raw snapshot per model call after production showed an incomplete two-candidate response
- [x] Add regression coverage for single-snapshot batching, retry accounting, and complete directional output
- [x] Run validation and publish the hardening update; verify a post-release Heartbeat cycle after deployment
- [x] Reduce structured-call concurrency and compact prompt context after the first post-hardening Heartbeat exceeded the two-minute timeout
- [x] Add regression coverage for bounded concurrency and prompt-size limits
- [x] Publish and verify a timeout-resilient Heartbeat cycle after deployment; the 02:43 UTC run returned HTTP 200 in 10.3 seconds without a scheduler timeout
- [x] Normalize structured LLM content arrays and set an explicit output-token budget for scanner decisions after live calls returned empty decisions without timing out
- [x] Add regression coverage for content-part JSON parsing and bounded structured output requests
- [x] Verify the live directional workflow or record the remaining model-service limitation explicitly; production recorded 8 snapshots, 0 complete responses, and 1 retry on the latest cycle because the model returned an empty structured decisions array for EUR/USD:1H

- [x] Define a versioned trading-intelligence architecture that turns ingested PDF knowledge into executable strategy components rather than runtime-only retrieval
- [x] Convert ingested strategy knowledge into structured, testable rule primitives with provenance, weights, conflicts, and market applicability
- [x] Add a validated lesson-learning pipeline from WIN/LOSS outcomes without allowing unvalidated lessons to alter live signal behavior
- [x] Integrate executable strategy scoring with the existing market snapshot, UNVALIDATED labeling, and gate-free Telegram paper-routing boundary
- [x] Add intelligence-version auditability, paper-validation metrics, and dashboard visibility for learned strategy updates
- [x] Add regression coverage and publish the continual-intelligence release after full validation

- [x] Remove the rule-evidence approval gate from Telegram signal routing while preserving paper-only, UNVALIDATED labeling and no live execution
- [x] Replace simple component scoring with a richer PDF-derived intelligence model containing concepts, relationships, conflicts, applicability, and provenance
- [x] Route signals and explanations from the active intelligence version without requiring the removed evidence gate
- [x] Add regression coverage and dashboard transparency for gate-free routing and intelligence composition
- [x] Run full validation and visual verification; publish the changed behavior with remaining controls documented

- [x] Generate a deterministic decision trace from the same PDF-derived components that create each BUY/SELL paper outcome
- [x] Replace model-only explanation fallback with source-linked deterministic explanations in Telegram and the decision ledger
- [x] Show matched components, support/conflict reasoning, score totals, and level derivation without relying on model availability
- [x] Add regression coverage and full validation; visual verification passed, publish the deterministic explanation release

- [x] Audit whether all ingested PDF text and visual content are extractable and available for intelligence compilation; combined document extracted to 7,000+ searchable paragraphs, with visual chart content requiring source-image review
- [x] Build a comprehensive source-linked knowledge representation from the complete PDF contents, including conditions, exceptions, chart patterns, timeframes, risk rules, and cross-document relationships; parallel v1 model created from the document’s actual technical-analysis concepts
- [x] Prepare the compiled PDF-derived trading intelligence as the future authoritative paper-decision layer; current production intelligence remains active pending user-approved cutover
- [x] Add structural validation and provenance checks proving shadow decisions and explanations trace back to the combined-document knowledge representation; profitability validation remains pending
- [x] Run regression, structural paper-mode checks, production build, visual verification, and publish the complete-content intelligence shadow release

- [x] Preserve the current PDF-derived intelligence and do not remove or cut over until the replacement is reviewed and validated
- [x] Receive and audit the user-provided combined document containing the 40+ PDF contents
- [x] Build a complete knowledge representation and replacement trading-intelligence algorithm from that document
- [x] Implement the replacement in a parallel version with source provenance and paper-only decision outputs
- [x] Prepare replacement validation and present it for user approval before any cutover; no cutover performed

- [x] Create a rollback checkpoint for the current authoritative intelligence before cutover
- [x] Switch the scanner’s authoritative BUY/SELL decision path to replacement intelligence v1
- [x] Persist replacement intelligence version and source-linked decision traces as the active production model
- [x] Verify Telegram paper routing, UNVALIDATED labeling, risk geometry, and no-live-execution controls after cutover
- [x] Run full regression, production build, and visual verification; publish the replacement cutover after the release checkpoint

- [x] Monitor the first replacement-intelligence Heartbeat cycles and inspect production Telegram delivery traces; the latest successful run returned HTTP 200, marketData=available, and created 8 paper signals, with complete risk levels confirmed in the production database
- [x] Guarantee every complete replacement BUY/SELL outcome with entry, stop loss, and take profit is persisted and sent to Telegram; scanner regression now asserts eight complete outcomes produce eight delivery-ledger entries
- [x] Add outcome statistics by replacement-intelligence component and market regime through a protected tRPC endpoint and tested pure aggregator
- [x] Add a first paper-validation sample review that blocks lesson promotion until the sample is sufficient; dashboard explicitly remains in collecting-evidence state and does not claim profitability
- [x] Add dashboard visibility, regression coverage, full validation, visual verification, and publish the monitoring/statistics release

- [x] Restructure Telegram paper-signal messages into clear labeled sections without removing deterministic trace, source provenance, risk geometry, or UNVALIDATED labeling
- [x] Add formatter regression coverage for readable escaping, section order, and preserved decision details
- [x] Run full validation and publish the Telegram notification-format update

- [x] Verify a newly structured paper-signal message reaches Telegram and is recorded in the delivery ledger; post-publish Heartbeat created 8 replacement-v1 signals and all 8 SIGNAL delivery rows are DELIVERED
- [x] Add WIN/LOSS outcome Telegram messages linked to the originating signal with deduplication and delivery tracking
- [x] Add regression coverage for linked outcome formatting, delivery, and failure handling
- [x] Run full validation and publish the linked-outcome notification release; production verification completed after checkpoint 21b1fb16

- [x] Match paper-signal Telegram output exactly to the user-provided plain-text section order and wording
- [x] Update formatter regression tests for exact line breaks, bullets, and removal of extra HTML/footer text
- [x] Run full validation and publish the exact Telegram format update

- [x] Diagnose the reported paper signal that reached take profit but remains unrecorded; production confirms signal 1200003 was recorded WIN
- [x] Verify outcome-tracker timing, signal status, market-price comparison, and outcome Telegram delivery; the five-minute Heartbeat tracked=1 and the OUTCOME row is DELIVERED
- [x] Fix any outcome-recording issue, add regression coverage, and publish the correction; no code correction was required because the outcome was already recorded and delivered

- [x] Identify why the screenshot’s XAU/USD paper signal remains PENDING while a production XAU/USD signal is WIN; the screenshot is signal 1290004, distinct from the earlier closed signal 1200003
- [x] Reconcile signal identity, timestamp, status, and dashboard query results; the screenshot row matches signal 1290004 and was still PENDING because tracking evaluated close price only
- [x] Fix any mismatch, add regression coverage, and publish if implementation changes are needed; tracker now evaluates candle high/low extremes and has intrabar regression tests

- [x] Route BTC/USD signals and outcomes to the existing Telegram bot
- [x] Route EUR/USD, XAU/USD, and GBP/USD signals and outcomes to their designated new Telegram bots
- [x] Add secure per-asset Telegram bot token and chat-ID configuration without exposing credentials
- [x] Add routing and delivery-isolation regression tests, verify production delivery, and publish

- [x] Make manual trade audits fetch the latest scanner market snapshot for the submitted asset
- [x] Evaluate manually submitted trade signals with Replacement Intelligence v1 and return APPROVED or DENIED with reasons and adjustments
- [x] Preserve source-linked trace, paper-only safeguards, and asset-specific Telegram routing for approved manual audits
- [x] Add regression coverage, run validation, and publish the unified manual-audit release

- [x] Assess group-chat versus approved-subscriber-list delivery for the four Telegram bots; shared private asset groups selected
- [x] Preserve explicit consent and owner authorization for every additional recipient; group membership is controlled by the user and friends
- [x] Implement the selected recipient-management workflow without exposing bot credentials; group chat IDs remain secure environment secrets
- [x] Add recipient routing, unsubscribe, deduplication, and audit regression coverage; group routing preserves existing deduplicated delivery ledger
- [x] Validate and publish the multi-recipient paper-signal delivery update

- [x] Configure one private Telegram group chat ID for BTC/USD, EUR/USD, XAU/USD, and GBP/USD
- [x] Route each asset’s signal and outcome messages to its shared asset group
- [x] Verify group delivery and publish the shared-group routing release

- [x] Audit Replacement Intelligence v1 limitations and source-derived components
- [x] Upgrade source-grounded context reasoning, regime awareness, conflict resolution, and confidence calibration
- [x] Strengthen reviewed WIN/LOSS lesson promotion without self-modifying active intelligence
- [x] Add comprehensive regression coverage and forward-paper-validation reporting
- [x] Run validation and publish the upgraded intelligence release with evidence limitations documented

- [x] Start and track a fresh replacement-forex-v2 paper-validation sample across all assets and timeframes; the current dashboard shows 8 v2 outcomes and 0 resolved, with additional cycles continuing to accumulate evidence
- [x] Add component and market-regime calibration summaries to the dashboard, including confidence bands
- [x] Add a first-50 resolved-v2 review gate and keep lesson promotion blocked until review
- [x] Add regression coverage, validate, and publish the v2 validation release; full tests, typecheck, production build, and responsive desktop/mobile verification passed

- [x] Verify generated signal persistence and complete risk fields; all 8 active v2 signals are persisted with direction, entry, stop loss, take profit, and PENDING status
- [x] Verify outcome resolution, including intrabar high/low detection and Heartbeat timing; resolver uses candle high/low and production has successful tracked runs, but recent Heartbeat executions also show timeouts
- [x] Reconcile signal, outcome, and Telegram delivery records by asset and status; v2 has 8 SIGNAL deliveries, all PENDING, with no OUTCOME yet; historical totals reconcile with 150 WIN, 234 LOSS, and 117 PENDING
- [x] Fix any tracking discrepancy, add regression coverage, and document the result; no tracking-code discrepancy found, and existing intrabar/resolution/delivery regressions cover the behavior

- [x] Diagnose why recent paper signals are not visible in private asset Telegram groups; delivery was delayed by Heartbeat timing, and the user later confirmed receipt
- [x] Verify group chat IDs, bot membership/permissions, delivery statuses, and Heartbeat execution; group IDs validated, delivery ledger recorded successful sends, and Heartbeat timeouts explained the delay
- [x] Fix any group-routing or delivery issue, add regression coverage, and publish if code changes are needed; no routing code change was required after successful delivery confirmation

- [x] Keep manual Chat Audit responses in the audit chat area only
- [x] Stop manual-audit Telegram delivery without changing autonomous signal/outcome routing
- [x] Add regression coverage, run validation, and publish the audit-channel correction

- [x] Audit the replacement-forex-v2 BUY versus SELL distribution and recent paper outcomes; current sample is 45 BUY and 3 SELL, with 8 losses and 40 pending
- [x] Inspect v2 score symmetry, fallback direction, component weights, and source-linked traces for directional bias; BUY examples contain bullish structure/indicator/HTF evidence, and SELL examples contain bearish evidence, but unconditional tie fallback was a real bias risk
- [x] Add a source-grounded structure/momentum tie-break, correct v2 provenance wording, and add bearish-direction regression coverage
- [x] Document whether recent signals are intelligence-driven, generic, or biased; they are source-linked and context-driven, but the small BUY-heavy sample does not prove accuracy

- [x] Add a protected Winning Rate tab for Replacement Intelligence v1 historical records (superseded by the version-separated v1/v2 implementation below)
- [x] Aggregate generated, resolved, WIN, LOSS, and win-rate metrics by asset, timeframe, and confidence band (superseded by the version-separated aggregation below)
- [x] Add API, responsive UI tables, regression coverage, and visual verification for the Winning Rate tab (superseded by the version-separated implementation below)
- [x] Run full validation and publish the Winning Rate release (superseded by the version-separated release below)

- [x] Add a protected Winning Rate tab for both Replacement Intelligence v1 and v2, keeping their histories separate
- [x] Aggregate generated, resolved, WIN, LOSS, and win-rate metrics by version, asset, timeframe, and confidence band
- [x] Add API, responsive UI tables, regression coverage, and visual verification for both intelligence versions
- [x] Run full validation and publish the version-separated Winning Rate release

- [x] Extend Winning Rate confidence-band records to include every asset and timeframe for both Replacement Intelligence v1 and v2
- [x] Add aggregation/API coverage and responsive UI tables for asset-timeframe-confidence buckets
- [x] Run tests, visual verification, and publish the confidence-detail update

- [x] Reorganize confidence-band records into clearly separated asset and timeframe groups for both intelligence versions
- [x] Add grouped-layout regression coverage, responsive verification, and publish the presentation update

- [x] Send each WIN/LOSS outcome as a Telegram reply to its corresponding signal message
- [x] Preserve asset-specific routing, delivery records, and fallback behavior for older signals without message references
- [x] Add reply-linking regression tests, validate, and publish the update

- [x] Build v3 as an additive upgrade: retain all combined-document v2 intelligence and add the new PDF-derived macro/fundamental layer
- [x] Preserve v2 provenance, add v3 source attribution and conflict handling, and route scanner BUY/SELL judgments through the combined v3 logic
- [x] Add v3 paper-only validation, version-separated statistics, regression tests, visual verification, and publish the release

- [x] Add a configurable verified macro-data provider for v3 with safe unavailable-data handling (completed by the free official-data composite below)
- [x] Show macro-context availability and evidence in paper Telegram signals and manual audits (completed by the free official-data composite below)
- [x] Strengthen the v3 first-50 resolved-outcome review workflow and dashboard (completed by the existing review gate plus the dashboard comparison panel below)
- [x] Add tests, responsive verification, and publish the post-v3 follow-up release (completed by the free official-data release below)

- [x] Build the free official-data macro layer for U.S., euro-area, and U.K. context without Trading Economics
- [x] Add freshness, source provenance, unavailable-data safeguards, and connect verified context to v3 decisions
- [x] Show macro evidence in paper Telegram/audit outputs and add v2-v3 comparison metrics
- [x] Add regression tests, responsive verification, and publish the official-data macro release

- [x] Replace automatic Telegram signal messages with the requested compact paper format showing direction, asset/timeframe, levels, confidence/confluence, and score
- [x] Replace automatic WIN/LOSS replies with the requested compact linked-outcome format
- [x] Add secure inbound group-message handling so a reply containing “Reason” returns the detailed v3 explanation as a reply
- [x] Preserve asset routing, signal linkage, authorization, paper-only labeling, and add regression tests before publishing

- [x] Audit loss recording, loss analysis, lesson generation, review-gate promotion, and future-decision application for v2 and v3
- [x] Inspect live evidence for resolved losses, lessons, review status, and whether promoted lessons affect v3 decisions
- [x] Run focused regression/runtime checks and report the actual learning status and any gaps

- [x] Add structured, source-linked loss lesson fields with asset, timeframe, regime, component, failure cause, and guardrail provenance
- [x] Generate and group recurring loss patterns into review-ready lesson proposals without changing active v3 automatically
- [x] Apply only accepted lessons to a rollback-safe v3-derived version and expose review controls/status in the dashboard
- [x] Add migrations, tests, paper-mode validation, responsive verification, and publish the loss-learning release

- [x] Show recurring loss-learning patterns with review status and evidence counts
- [x] Add explicit accept/reject controls for individual lesson patterns with safe persistence
- [x] Add tests, responsive verification, and publish only these two review features

- [x] Add explicit Accept/Reject mutations and dashboard controls for eligible recurring loss-learning lesson patterns
- [x] Ensure pattern decisions update every associated lesson safely
- [x] Add regression tests and verify the review workflow on desktop and mobile
- [x] Finalize explicit lesson review controls after implementation

- [x] Add Best Time to Trade tab with hourly generated, resolved, take-profit, stop-loss, and win-rate analytics for assets, timeframes, and intelligence v1/v2/v3
- [x] Add Best Days to Trade tab with weekday generated, resolved, take-profit, stop-loss, and win-rate analytics for assets, timeframes, and intelligence v1/v2/v3
- [x] Add protected backend aggregations, navigation entries, responsive UI, regression tests, and visual verification for the new analytics tabs
- [x] Register the new Best Time to Trade and Best Days to Trade paths in the top-level router so direct navigation works
- [x] Fix missing win-rate visibility in Best Time to Trade and Best Days to Trade tables and verify the rendered metrics
- [x] Change Best Time to Trade and Best Days to Trade win rate to (take-profit hits / resolved signals) × 100 and update tests and display wording
- [x] Fix Chat Audit mobile horizontal overflow so message text, audit details, and composer remain visible
- [x] Rebuild Chat Audit as an interactive trading assistant with conversational capabilities and live app context
- [x] Fix Chat Audit mobile horizontal overflow by ensuring message bubbles and conversation area wrap correctly
- [x] Fix the persistent Chat Audit mobile overflow at the scroll viewport/container level
- [x] Add explicit Ask and Audit mode controls to Chat Audit
- [x] Add conversation export and clear-history controls to Chat Audit
- [x] Add regression tests and desktop/mobile verification for the combined Chat Audit update
- [x] Fix persistent Chat Audit mobile message clipping at the actual scroll viewport width
- [x] Automatically scroll Chat Audit to the newest message after reload/history load and after new responses
- [x] Add regression coverage and desktop/mobile verification for the chat behavior correction

- [x] Evaluate setup-aware stable take-profit targets instead of recalculating targets on every scan
- [x] Add best-signal selection and duplicate/overlapping setup controls for repeated 10–15 minute scans
- [x] Verify Forex Factory data access and permitted integration options before using it for macro context
- [x] Preserve paper-only and UNVALIDATED labeling while validating any new behavior with fresh outcomes

- [x] Define measurable economic-event-aware inputs for likely direction, event risk, and target zones
- [x] Define structure/liquidity breakout anticipation inputs that do not depend on oversized confirmation candles
- [x] Design stable take-profit and stop-loss rules tied to target zones and setup identity
- [x] Keep all new decisions paper-only and UNVALIDATED until fresh validation evidence exists

- [x] Define measurable exhaustion evidence after bullish and bearish liquidity-state breakouts
- [x] Define reversal-entry, target-zone, and stop-invalidation logic from market structure
- [x] Combine exhaustion detection with event-aware and setup-ranking paper intelligence
- [x] Validate reversal behavior separately without claiming any price level is certain or unreachable; fresh Twelve Data sample added to reports/latest-validation-report.json with separate reversalResults by asset/timeframe, including sparse candidates and unresolved outcomes
- [x] Ensure candidate ranking is evaluated immediately per scan and never waits for all signals in an hour
- [x] Preserve the first qualifying setup while later scans confirm, maintain, or invalidate it instead of extending its target

- [x] Define a defensible invalidation stop beyond structure with a volatility buffer, without claiming it can never be hit
- [x] Select realistic target zones first, then verify whether the resulting geometry supports 1:2 risk-to-reward
- [x] Reject or downgrade paper setups whose structural stop and target cannot coherently preserve the requested geometry; v3 retains deterministic BUY/SELL paper output, falls back to minimum 2R geometry when the opposing zone is too close, and downgrades confidence with an explicit trace

- [x] Verify whether Forex Factory offers a permitted, stable automated calendar access method
- [x] Compare Forex Factory access with reliable structured calendar alternatives
- [x] Do not integrate or publish a calendar source until the user approves the selected method

- [x] Connect the user-approved permitted structured Forex Factory-sourced calendar API after secure API-key validation; superseded by the validated user-supplied weekly JSON export path, so no API key is required or requested
- [x] Cache and normalize calendar events for USD, EUR, and GBP without increasing scanner polling pressure

- [x] Replace the direct Forex Factory API-key assumption with a permitted export-ingestion or approved calendar-provider path
- [x] Confirm the selected source before requesting credentials or implementing production calendar access

- [x] Investigate and validate the selected Forex Factory calendar export path before integration
- [x] Keep export ingestion cached, UTC-normalized, paper-only, and backed by FRED/ECB/BoE fallback data
- [x] Resolve the missing JSON/XML export-link visibility blocker and provide a workable calendar ingestion path

- [x] Validate supplied Forex Factory weekly JSON export URL and inspect its event schema before integration
- [x] Configure the validated export URL with caching, UTC normalization, and official-data fallback


## Replacement Intelligence v4

- [x] Receive and audit the user-provided combined Forex trading document before changing the authoritative v3 path; initial audit saved to reports/v4-document-audit.md
- [x] Extract v4 concepts, conditions, exceptions, timeframe rules, risk rules, and relationships with source provenance; normalized catalog saved to reports/v4-concept-catalog.md
- [x] Design v4 as an additive, versioned model built on v3 plus validated document-derived improvements; correlated evidence families are capped and unavailable inputs remain neutral
- [x] Preserve immediate setup selection, active-setup suppression, stable targets, structure-aware stops, exhaustion logic, and Forex Factory event context in the v3-authoritative scanner path and v4 shadow evaluation
- [x] Add v4 decision traces, version-separated statistics, and rollback-safe paper-only activation; v4 traces persist in the strategy snapshot while v3 remains the delivered signal version
- [x] Validate v4 with fresh market samples and separate reversal/outcome analysis without claiming guaranteed accuracy; fresh comparison saved to reports/latest-v4-shadow-validation.json and review notes saved to reports/v4-validation-notes.md
- [x] Run typecheck, tests, production build, visual verification, and publish only after the v4 validation review; v4 remains shadow-only and v3 remains the delivered paper intelligence


## Immediate Replacement Intelligence v4 Activation

- [x] Make Replacement Intelligence v4 the active authoritative paper-decision model for scanner Telegram signals; scanner auto-activates v4 on its next cycle and delivers v4-generated paper signals
- [x] Route manual audits, stored signal provenance, outcome lessons, and Telegram explanations through v4 version labeling
- [x] Update dashboard wording and version-separated analytics to distinguish active v4 from historical v3
- [x] Run direct v4 validation, SELL-direction verification, full tests, production build, and responsive visual verification without adding a promotion gate
- [x] Save and publish the active v4 release while preserving paper-only and UNVALIDATED safeguards


## v4 Operational Monitoring Follow-up

- [x] Add a compact `v4 active` provenance marker to every newly delivered Telegram paper signal
- [x] Verify the first v4 signal delivery and persisted provenance trace across Telegram routing records; live check at 2026-08-22 21:26 UTC confirmed 8 v4 signals, 8 DELIVERED Telegram records, stored Telegram message IDs, and mixed BUY/SELL directions
- [x] Add v4 outcome monitoring dimensions for asset, timeframe, direction, event risk, and geometry fallback
- [x] Run routing tests, full regression suite, production build, and responsive visual verification
- [x] Save and publish the operational monitoring update while preserving paper-only and UNVALIDATED safeguards; v4 is live in the database and remains paper-only/UNVALIDATED


## Weekend Market and Entry-Signal Audit

- [x] Verify weekend closure handling for EUR/USD, GBP/USD, and XAU/USD in the active scanner path; no dedicated weekend guard currently exists
- [x] Verify whether the uploaded Forex trading document contains explicit entry signals, setup conditions, and indicator/confluence guidance; confirmed and recorded in reports/weekend-entry-signal-audit.md
- [x] Compare the documented entry guidance with the active v4 evaluator and report any concrete implementation gap; v4 implements a bounded subset and does not yet encode every paragraph or discretionary exception one-to-one


## Exhaustive Forex Document Entry-Signal Audit

- [x] Preserve and inspect the complete extracted text and embedded-document coverage
- [x] Catalog every explicit entry trigger and setup condition with chapter/section provenance
- [x] Catalog confirmations, filters, invalidation conditions, and risk requirements
- [x] Classify each item as deterministic, conditional, discretionary, example-only, or unsupported for automation
- [x] Deliver the exhaustive entry-signal and good-setup catalog as a readable project report


## Scanner Coverage Audit

- [x] Inventory the scanner’s raw OHLCV and enriched market-context fields
- [x] Map scanner-provided and v4-derived inputs to every document pre-trade checklist item
- [x] Identify conditional and missing inputs without implying the scanner has unavailable data
- [x] Record and report scanner coverage and concrete gaps


## Stateful Entry-Signal Locator Redesign

- [x] Replace routine interval-driven signal eligibility with a persistent entry-locator lifecycle per asset and timeframe
- [x] Accumulate bounded scanner snapshots and derived setup evidence without treating stale data as current
- [x] Rank independent setup evidence families and reconcile supporting versus conflicting signals deterministically
- [x] Gate signals on coherent entry conditions, event risk, stable structure-aware geometry, and active-setup deduplication
- [x] Preserve designated Telegram routing, compact provenance, paper-only status, and UNVALIDATED labeling
- [x] Add monitoring for accumulated setup state, wait/suppress reasons, evidence conflicts, and emitted signals
- [x] Test state transitions, conflict resolution, stale snapshots, and real paper delivery before publishing


## Attached Catalog Qualification Change

- [x] Audit Exhaustive_Entry-Signal_and_Good-Setup_Catalog.docx against current locator thresholds
- [x] Define strong independent indicator families and deterministic conflict handling
- [x] Allow one or two strong setup indicators to qualify a paper setup without requiring every catalog condition
- [x] Add regression coverage for one-indicator, two-indicator, contradictory, stale, event-risk, and geometry cases
- [x] Run full verification and publish the revised locator while preserving paper-only and UNVALIDATED safeguards


## One-versus-Two Indicator Emission Monitoring

- [x] Persist the number of independent strong setup families used for each emitted paper signal
- [x] Expose emitted one-indicator versus two-or-more-indicator counts in v4 monitoring
- [x] Add regression coverage and verify the monitoring-only change without changing thresholds


## Indicator-First v4 Pipeline Redesign

- [x] Audit and document the current v4 evaluator-versus-entry-locator ordering
- [x] Define explicit document-derived setup-indicator objects with direction, strength, family, prerequisites, and provenance
- [x] Construct v4 candidate judgments only from detected setup indicators and their combined evidence
- [x] Resolve compatible and contradictory indicator directions deterministically before candidate construction
- [x] Integrate indicator-first evidence into the stateful locator, decision trace, monitoring, and Telegram paper signal
- [x] Add regression coverage and run full verification without claiming certain outcomes


## Corrected Indicator-First Causal Order

- [x] Make setup indicators explicit first-class outputs derived from scanner measurements before any candidate direction or levels are constructed
- [x] Ensure one or more compatible detected indicators form the sole evidence basis for the v4 candidate judgment
- [x] Preserve explicit conflict resolution, freshness, event-risk, geometry, locator, provenance, and Telegram safeguards after the causal refactor
- [x] Add tests proving no candidate is constructed from absent indicators and that multi-indicator judgments reflect the detected evidence


## Corrected Accumulation Behavior

- [x] Treat a snapshot with no directional setup indicator as WAITING/ACCUMULATING rather than a terminal evaluation failure
- [x] Preserve rich fresh scanner snapshots and later indicator evidence across cycles until a setup qualifies
- [x] Ensure candidate construction begins only after accumulated evidence contains a qualifying indicator or compatible combination
- [x] Add regression coverage for no-indicator first snapshot followed by later qualifying evidence


## Locator Timing and Qualification Monitoring

- [x] Observe locator states across multiple five-minute scanner cycles
- [x] Measure per-asset/timeframe wait duration before qualification
- [x] Compare accumulated-snapshot and immediate setup classes when resolved outcomes exist
- [x] Calculate observed scanner-to-Telegram delivery duration and report timing limitations


## Missing Telegram Signal Investigation

- [x] Diagnose why the latest v4 scan has not produced a new Telegram signal
- [x] Verify locator qualification, active-signal suppression, market-data freshness, and Telegram delivery records
- [x] Report the verified cause and any required user action


## Heartbeat Recovery Investigation

- [x] Determine why the scanner Heartbeat has no recorded execution after 00:30 UTC
- [x] Verify the production callback path and deployment health
- [x] Repair or recreate the scanner schedule only if required, without creating duplicate schedules
- [x] Verify a post-fix scheduler execution and document whether a signal was generated or intentionally skipped


## Free Autoscale Recovery Path

- [x] Keep Reserved Hosting disabled and continue on free Autoscale
- [x] Maintain exactly one active five-minute scanner Heartbeat after recovery replacement
- [x] Monitor multiple post-choice scheduler intervals for successful callbacks and scanner results
- [x] Report whether free Autoscale recovered and clearly state any remaining platform limitation


## Callback Accessibility Investigation

- [x] Determine why the active scanner Heartbeat callback is inaccessible
- [x] Compare scheduler responses with direct production and local production route behavior
- [x] Apply a safe free-path correction if the cause is actionable
- [x] Verify callback accessibility and document any remaining platform limitation


## Free Callback Monitoring and Status View

- [x] Monitor the next scheduled Heartbeat intervals and preserve exact run timestamps and HTTP outcomes
- [x] Add a protected callback-status data procedure with schedule and latest-run diagnostics
- [x] Add a responsive dashboard status card showing last callback, next run, HTTP status, and failure reason
- [x] Add regression tests, verify one active scanner schedule, and report remaining limitations


## Heartbeat Regression Comparison

- [x] Capture the last known successful Heartbeat and current failed-run evidence
- [x] Compare historical and current callback route, bundle, deployment, and schedule configuration
- [x] Identify the most likely regression cause without changing production data
- [x] Report what changed and the safest remedy


## Live Callback Probe

- [x] Inspect the latest production runtime logs and Heartbeat execution result
- [x] Manually POST to the scanner callback endpoint without trade input
- [x] Report the exact response and whether the application callback was reached


## GitHub Synchronization

- [x] Compare the current verified checkpoint with dodoocaleb123-bit/trading-guard-ai
- [x] Prepare a safe synchronization commit without overwriting unrelated GitHub work
- [x] Push the verified project code to GitHub
- [x] Confirm GitHub commit and file parity with the local checkpoint


## Deployed Application Diagnostic

- [x] Inventory deployed public, scheduled, and tRPC/API routes
- [x] Probe public and protected endpoint behavior without mutating data
- [x] Validate live database connectivity, schema access, and application health
- [x] Summarize endpoint status, database status, and required remediation


## Version-Aware v4 Signal Eligibility

- [x] Confirm which BTC/USD pending setups are v3 versus v4 and trace the current suppression decision
- [x] Ensure legacy v3 pending setups do not block authoritative v4 setups for the same asset/timeframe
- [x] Preserve suppression of duplicate active v4 setups and paper-only UNVALIDATED delivery
- [x] Add regression coverage and verify the updated behavior


## v4 Performance Card Reconciliation

- [x] Trace the v4 outcome query, router procedure, and performance-card rendering
- [x] Reconcile the card’s filter with live generated-signal intelligenceVersion values
- [x] Fix the mismatch or stale-query behavior without changing trade records
- [x] Add regression coverage and verify the corrected displayed count


## Winning Rate Freshness UX

- [x] Add a last-updated timestamp to the Winning Rate analytics data
- [x] Add an informational version-count reconciliation warning when source totals differ from displayed version totals
- [x] Add regression coverage and verify desktop/mobile rendering


## Analytics Controls and v4 Signal Inventory

- [x] Add an excluded-record inspection view for records outside recognized v1–v4 versions
- [x] Add manual and automatic refresh controls to Winning Rate analytics
- [x] Show latest scanner and Heartbeat timestamps beside analytics freshness
- [x] Add regression coverage and verify responsive rendering
- [x] Query every v4 Telegram signal and report its details and delivery status

- [x] Fix Winning Rate analytics queries to accept the readonly v1–v4 version tuple without a Drizzle TypeScript error
- [x] Add a protected excluded-record drill-down procedure for source records outside the recognized v1–v4 analytics set
- [x] Add Winning Rate manual refresh, 60-second automatic refresh, scanner/Heartbeat telemetry, and excluded-record inspection UI
- [x] Query the live database and compile the complete inventory of all trade signals sent by authoritative Replacement Intelligence v4
- [x] Monitor the production Heartbeat after the analytics release and confirm whether callback routing has stabilized on free Autoscale

## Pending live verification

- [x] Re-run the live scanner and scheduler checks without mutating trade data; all outputs remain paper-only and UNVALIDATED

## Legacy v4 signal isolation

- [x] Prevent the eight pre-entry-locator v4 signals from blocking current entry-indicator-based v4 qualification
- [x] Preserve duplicate suppression for signals emitted by the current stateful Entry Locator process
- [x] Add regression coverage proving legacy v4 pending rows are ignored while current locator rows still block duplicates
- [x] Run typecheck, tests, production build, and safe scanner verification; keep all outputs paper-only and UNVALIDATED

## Locator-era monitoring follow-up

- [x] Monitor the next current Entry Locator v4 Heartbeat cycles and record whether new signals are emitted
- [x] Add clear legacy v4 versus current Entry Locator v4 provenance labels to dashboard signal views
- [x] Add outcome-review summaries scoped to current Entry Locator v4 signals
- [x] Review the first resolved locator-era outcomes without changing thresholds prematurely
- [x] Add regression coverage, verify responsive UI, and publish the release

## Heartbeat callback repair follow-up

- [x] Inspect the active Heartbeat task, callback URL, route registration, and recent production 404 responses
- [x] Confirm no code or scheduler repair was required because the production callback recovered; preserve paper-trading thresholds and existing records
- [x] Verify a successful production scanner cycle and inspect current Entry Locator v4 emissions
- [x] Run tests, typecheck, production build, and publish the repair with an accurate operational report

## Legacy v4 archival and no-signal diagnosis

- [x] Archive exactly the 8 legacy v4 PENDING signals as INVALIDATED, preserving their rows and Telegram delivery history
- [x] Verify that archived legacy rows are excluded from active blocking and remain visible in history/analytics
- [x] Diagnose why the current Entry Locator v4 has not emitted a signal despite successful Heartbeat runs
- [x] Report the current locator state, scanner result, and any safe next action without changing thresholds

## Manual Entry Locator v4 simulation

- [x] Run a read-only manual simulation for BTC/USD and EUR/USD using fresh market snapshots
- [x] Compare indicator families, direction, confidence, confluence, freshness, and geometry wait reasons
- [x] Confirm no signal, Telegram delivery, database row, threshold, or locator state was changed by the simulation

## BTC/USD geometry and threshold sensitivity test

- [x] Inspect exact BTC/USD 15MIN structure levels, ATR/risk distance, and target-clearance inputs
- [x] Run a temporary in-memory confidence-threshold sensitivity test without changing production configuration
- [x] Confirm no signal row, locator state, Telegram delivery, or threshold setting is changed by the test
- [x] Report whether the lower threshold changes qualification and explain the remaining geometry gates

## Final end-to-end operational diagnostic

- [x] Verify live production health and scheduled callback reachability without triggering a scan
- [x] Verify recent Twelve Data retrieval evidence and v4 decision-processing timestamps
- [x] Reconcile Entry Locator states, v4 signal records, outcomes, and Telegram delivery statuses
- [x] Report any remaining operational blocker while preserving paper-only behavior

## Unresolved paper-trade contradiction monitor

- [x] Recheck unresolved current signals against each fresh scanner snapshot
- [x] Detect material contradictory indicators without inventing certainty or changing the original signal
- [x] Persist deduplicated adjustment/reply history linked to the original signal and Telegram message
- [x] Send structured Telegram replies only for paper-trade adjustments, with asset, timeframe, contradiction, and adjustment details
- [x] Add idempotency and regression coverage; verify no reply spam and no real-trading action

## Adjustment history follow-up

- [x] Monitor available live Heartbeat cycles; no contradiction reply was emitted because no unresolved current locator-era signal existed
- [x] Add a protected adjustment-history query and responsive dashboard panel
- [x] Verify the panel, run tests, and publish without changing thresholds or outcome-review rules

## Close-of-day follow-ups

- [x] Add asset and adjustment-action filters to the paper-trade adjustment history panel
- [x] Monitor available Heartbeat cycles for a current locator-era signal and contradiction reply
- [x] Reconcile any threaded Telegram adjustment reply with the persisted adjustment record
- [x] Run verification and publish the close-of-day update without changing thresholds

## Stronger setup while an asset/timeframe trade is unresolved

- [x] Define a deterministic comparison between a new v4 setup and the active unresolved setup for the same asset/timeframe
- [x] Decide whether a stronger setup should be a linked upgrade/adjustment rather than a second independent signal
- [x] Preserve the original signal, avoid duplicate Telegram entries, and keep all changes paper-only
- [x] Present the design for confirmation before implementing production behavior changes

## Confirmed linked setup-upgrade implementation

- [x] Add a durable linked upgrade record and superseded paper-signal lifecycle status
- [x] Compare new qualified v4 candidates against the active unresolved thesis using deterministic improvement criteria
- [x] Send one idempotent threaded setup-upgrade Telegram reply while preserving the original signal history
- [x] Keep outcome accounting, duplicate suppression, and all trading actions paper-only
- [x] Add regression coverage, run full verification, and publish the release

## Setup-upgrade follow-up

- [x] Add a protected upgrade-chain query and responsive Trade History view linking original and replacement paper signals
- [x] Monitor available Heartbeat cycles for the first stronger-setup upgrade and threaded Telegram reply
- [x] Calculate observed upgrade frequency from live paper records without changing thresholds
- [x] Add regression coverage, verify the UI, and publish the follow-up release

## Manual paper-trade stop-loss tracking investigation

- [x] Determine why the latest BTC/USD v4 paper signal remains PENDING after the user observed a stop-loss touch; it later resolved as LOSS after the next live tracking cycle
- [x] Compare outcome-tracker timing and Twelve Data price/high/low evidence with the user’s manual demo-trade observation; the tracker closed the signal at 13:30:28 UTC from the live candle range
- [x] Apply a safe correction only if the live tracking path is confirmed incomplete or incorrect; no tracker correction was needed because the signal resolved correctly on the subsequent live cycle
- [x] Add regression coverage, verify without creating real orders, and publish any corrective release; tracker behavior was verified without creating orders and the risk-reward correction was separately regression-tested and published

## Verify ongoing v4 indicator search coverage

- [x] Confirm the active five-minute scanner continues forwarding all four assets and both supported timeframes to v4; the active five-minute Heartbeat is enabled and latest completed cycles returned marketData=available
- [x] Review locator snapshot accumulation and qualifying-indicator state for every asset/timeframe pair; BTC/USD has accumulated 54 snapshots per timeframe, while weekend-closed EUR/USD, GBP/USD, and XAU/USD currently have zero fresh snapshots
- [x] Report current v4 search coverage and paper-validation status without changing thresholds or generating test trades

## Locator-era risk-reward geometry investigation

- [x] Trace why the latest locator-era v4 signal stored 1:2.00 while its Telegram levels implied 1:3.63; the structural target was used when it exceeded 2R while persistence remained hardcoded at 2.00
- [x] Confirm whether the mismatch comes from candidate-level geometry, persistence, or message formatting; candidate-level geometry caused the mismatch and Telegram correctly displayed those candidate prices
- [x] Correct future locator-era signal geometry to preserve the required 1:2 ratio; structural support/resistance now informs qualification but the emitted target is normalized to exact 2R
- [x] Add regression coverage, verify the correction, and publish any changed release; focused tests passed, offline full regression passed, TypeScript passed, and production build passed

## Post-fix signal and Telegram delivery verification

- [x] Verify the next post-fix v4 signal geometry and confirm its price-implied ratio is exactly 1:2; no post-fix signal has qualified yet, while the exact-2R level helper passed focused regression coverage
- [x] Diagnose the absence of new Telegram signals across Heartbeat runs, locator qualification, market-data availability, and delivery records; Heartbeat and market data are healthy, but locators are waiting on coherent 2R geometry or fresh weekend-closed-market inputs
- [x] Correct and regression-test any confirmed application blocker without creating live trades; corrected future target geometry and added the Trade History verification badge
- [x] Verify the result, publish the completed follow-up, and report the operational cause

## BTC/USD coherent 2R explanation and monitoring

- [x] Explain how the BTC/USD locator determines whether there is enough clear price space for an exact 1:2 paper target
- [x] Recheck live BTC/USD locator wait reasons, recent snapshots, and Heartbeat results
- [x] Carry out safe post-fix monitoring without changing thresholds or creating live trades
- [x] Verify and publish the completed explanation and monitoring update

## Thorough end-to-end application health check

- [x] Check deployed app endpoints, frontend rendering, and runtime logs
- [x] Check database connectivity, scanner settings, Heartbeat execution, and Twelve Data availability
- [x] Check all locator states, generated signals, outcomes, and Telegram delivery records
- [x] Run regression tests, TypeScript validation, and production build
- [x] Consolidate findings and publish the completed health-check report

- [x] Move the Google Fonts import before other CSS statements to remove the Vite import-order warning, then revalidate the build

## Post-health-check follow-up verification

- [x] Check for the first post-fix locator-era v4 signal and verify its price-implied ratio is exactly 1:2; no new post-fix signal has qualified yet, while the correction is covered by passing exact-2R tests
- [x] Recheck the production `/healthz` 503 anomaly and active scanner Heartbeat execution; `/healthz` remains an Autoscale edge 503 while Heartbeat is succeeding with marketData=available
- [x] Review the current resolved paper-outcome sample and separate it from legacy records; current locator-era sample is 1 LOSS, with no new post-fix outcomes
- [x] Publish the completed follow-up status without changing thresholds or creating live trades

## Latest live monitoring cycle

- [x] Check the newest Heartbeat result and production `/healthz` response; the latest Heartbeat succeeded at 14:51:45 UTC while `/healthz` remains an Autoscale edge 503
- [x] Check for a new post-fix locator-era v4 signal and exact 1:2 geometry; no new post-fix signal qualified and the existing locator-era record is the pre-fix BTC/USD 1H LOSS
- [x] Update the current locator-era paper-outcome sample; it remains 1 LOSS, 0 WIN, 0 PENDING for the current locator-era sample and 0 post-fix outcomes
- [x] Publish the monitoring result without changing thresholds or creating live trades

## Latest post-fix monitoring cycle

- [x] Check the newest Heartbeat execution and production health response; latest cycle reached the app and returned HTTP 200, while `/healthz` remains an Autoscale edge 503
- [x] Check for a new post-fix v4 signal and verify exact 1:2 geometry if present; no new post-fix signal qualified
- [x] Review the current locator-era paper-outcome sample; it remains one BTC/USD 1H LOSS and zero post-fix outcomes
- [x] Publish the monitoring result without changing thresholds or creating live trades

- [x] Treat Twelve Data timeout responses as failover-eligible, add regression coverage, and publish the correction without changing trading thresholds; focused 2-test, full 126-test, TypeScript, and build validation passed

## Scheduler warning and post-fix verification

- [x] Inspect the supplied scheduler-status screenshot and correlate the displayed 2:51 PM, 3:03 PM, and 3:05 PM timestamps; the screenshot showed app scan 2:51 PM, scheduler attempt 3:03 PM, and next run 3:05 PM
- [x] Verify whether the 3:03 PM Heartbeat attempt reached the application and inspect its exact response; it reached the app with HTTP 200 but returned `marketData=unavailable` after a 20-second Twelve Data timeout
- [x] Check the next Heartbeat after the Twelve Data timeout-failover release; the subsequent 15:08 run succeeded with HTTP 200 and marketData=available, while the active scheduler later became stale at its 15:10 next-run marker
- [x] Check current v4 signal geometry and locator-era paper outcomes; no new post-fix signal qualified and the current locator-era sample remains one BTC/USD 1H LOSS
- [x] Publish the scheduler diagnosis without changing thresholds or creating live trades

- [x] Correct the scheduler-status diagnosis so a reached callback with `marketData=unavailable` is not reported as an unreachable callback, add regression coverage, and publish the fix; market-data failures now record app reachability, the dashboard has a distinct reached-with-error state, focused 13-test and full 127-test suites passed, TypeScript passed, and production build passed

## EUR/USD zero-snapshot monitoring

- [x] Correlate the displayed EUR/USD 2:32 PM card timestamps with the latest scanner and Heartbeat records; the zero-snapshot cards match the weekend-closed-market state and their 2:32 PM update timestamp
- [x] Check Twelve Data availability and freshness for EUR/USD and the other watched assets; the latest Heartbeat at 15:20 returned marketData=available and direct provider checks were healthy
- [x] Verify post-fix v4 signal, outcome, and dashboard status; no post-fix signal qualified and the current locator-era sample remains one BTC/USD 1H LOSS
- [x] Publish the EUR/USD diagnosis without creating live trades or bypassing freshness rules

## Confidence threshold discrepancy and monitoring

- [x] Trace why the BTC/USD card displays a 68% confidence threshold when earlier explanations referenced 60%; the rule is intentionally dynamic based on the number of strong setup indicators
- [x] Verify current threshold configuration, live locator states, Heartbeat, and market-data availability; one strong-indicator setups use 68%/45%, two-or-more use 60%/45%, and the latest Heartbeat returned HTTP 200 with marketData=available
- [x] Check post-fix v4 geometry and paper-outcome records while carrying out the monitoring follow-ups; no new post-fix signal qualified and the current locator-era sample remains one LOSS
- [x] Correct any confirmed threshold-display or logic mismatch, test it, and publish the result without creating live trades; no mismatch was confirmed, so no threshold change was made

## Renewed EUR/USD snapshot investigation

- [x] Trace EUR/USD inclusion in the scanner market-data request and active Heartbeat schedule; EUR/USD remains in the four-asset watchlist and is requested for both 15min and 1h on every active five-minute cycle
- [x] Verify live Twelve Data EUR/USD availability and locator freshness for both timeframes; Twelve Data returned EUR/USD data, but the default exchange-local timestamp was interpreted as future UTC and rejected by the freshness gate
- [x] Carry out post-fix signal, geometry, outcome, and monitoring checks; no new post-fix signal qualified, the current locator-era sample remains one BTC/USD 1H LOSS, and exact-2R tests remain passing
- [x] Apply and publish a safe correction only if a confirmed blocker exists; explicit UTC time-series requests were added and validated without changing thresholds or creating trades

- [x] Add an explicit UTC timezone to Twelve Data time-series requests so provider exchange-local timestamps cannot be rejected as future snapshots; add regression coverage and publish; focused 11-test, full 128-test, TypeScript, and build validation passed

## Renewed multi-asset snapshot investigation

- [x] Correlate the supplied 3:40 PM locator cards with the latest production Heartbeat and app timestamps; the cards predate the current replacement task’s missing execution history
- [x] Compare deployed and direct Twelve Data batch responses for EUR/USD, GBP/USD, XAU/USD, and BTC/USD; the application parser and direct UTC batch response both returned all four symbols
- [x] Trace non-BTC locator persistence and freshness rejection after the UTC correction; the prior rows still show the old future-timestamp wait state because no post-release callback has persisted a new state
- [x] Apply and publish a correction only if a confirmed production-data issue remains; no additional application correction is indicated, and the UTC fix is already published
- [x] Report the verified cause without creating live trades or bypassing freshness safeguards

- [x] Investigate the replacement Heartbeat task remaining enabled without a next execution time or recorded runs after 15:52 UTC; confirmed at 16:01 UTC with zero runs and no next-execution timestamp, indicating a platform scheduler-registration stall

## Five-minute Heartbeat reliability

- [x] Audit the active scanner Heartbeat lifecycle, callback authentication, timeout behavior, and duplicate-run safeguards
- [x] Assess reliable missed-run detection and recovery options that remain compatible with free Autoscale; added app-side stale-cycle detection and documented platform-managed recovery boundaries
- [x] Implement safe idempotent observability or recovery improvements if the application can control them; added a unique five-minute UTC run ledger and duplicate callback suppression
- [x] Validate and publish the reliability update, keeping v4 paper-only and unchanged; full tests, TypeScript, build, and dashboard verification passed
- [x] Document what the platform can guarantee and what remains outside application control in HEARTBEAT_RELIABILITY.md

## Heartbeat task identity reconciliation

- [x] Confirm the dashboard is querying the removed WJbf... task while the active scanner task is AT5...
- [x] Trace where the callback-status card obtains its task UID and scheduler registry data
- [x] Reconcile the stored scanner task identity with the active Heartbeat without changing the callback path or trading logic; the status procedure now selects and persists the sole active scanner task when the stored UID is stale
- [x] Add regression coverage, verify the corrected dashboard status, and publish the update; scheduler tests, full suite, TypeScript, and production build passed

## Heartbeat monitoring follow-up

- [x] Inspect the active Heartbeat registry and recent production cycles, then correlate scheduler attempts with app-side run-ledger rows; active task is enabled, last recorded success was 16:28 UTC, and the registry still showed no later run during the check
- [x] Add a dedicated recent-run history view and repeated-failure warning to the scanner callback dashboard
- [x] Validate the monitoring update, publish it, and report the observed production-cycle results; tests, TypeScript, build, desktop/mobile screenshots, and production deployment passed

## Heartbeat alert follow-up

- [x] Verify the latest Heartbeat execution and correlate it with the app-side run ledger; the registry still reports the last successful run at 16:28 UTC, while the newly deployed ledger will populate on the next reached callback
- [x] Investigate any recurring Heartbeat 403 permission failures and document the operational cause; the 16:08 and 16:14 failures were platform cron-cookie permission responses before the app callback ran
- [x] Add safe owner-facing repeated-failure visibility or notification without altering paper-trading behavior; the dashboard warns after two failures and app-side consecutive failures notify the project owner once per failure streak
- [x] Validate and publish the alerting update, then recheck the live scheduler state; full tests, TypeScript, build, and deployment passed

## Locator freshness investigation

- [x] Inspect live EUR/USD and GBP/USD locator rows, snapshot timestamps, and the latest scanner Heartbeat runs; current locator rows and scanner ledger were queried from production
- [x] Determine whether GBP/USD is receiving fresh five-minute market snapshots and identify any confirmed upstream gap; GBP/USD has fresh 15MIN and 1H rows and no current upstream freshness gap
- [x] Apply only a verified safe correction, validate the result, and report the live state without changing v4 thresholds or paper-trading behavior; no correction was warranted

## Telegram signal-delivery investigation

- [x] Trace the latest Heartbeat runs through market-data availability and locator qualification; recent cycles reached the app with marketData=available and locators remained WAITING on tied/mixed evidence or crowded structural 2R geometry
- [x] Compare current generated-signal, outcome, and Telegram-delivery records to identify the exact blocking stage; no new v4 signal exists after the 11:32 UTC v4 LOSS, while outcome replies continue to deliver successfully
- [x] Report why no current Telegram signal arrived, without creating trades or changing v4 behavior; Telegram delivery is not the blocker, because the locator did not qualify a new signal

## Adaptive risk-to-reward geometry request

- [x] Audit current v4 stop/target geometry and identify the existing exact-2R enforcement points
- [x] Define a conservative selectable ratio policy for 1:1, 1:1.5, 1:2, and 1:3 using structural clearance and setup evidence
- [x] Implement adaptive paper-only geometry with explicit selected-ratio audit traces and no guaranteed-win claims
- [x] Add regression tests, validate the scanner-to-Telegram path, and publish only after confirming existing v4 behavior remains safe

## Adaptive breakout-aware geometry implementation

- [x] Audit current v4 geometry, breakout context, and dependent exact-2R guards
- [x] Implement selectable 1:3, 1:2, 1:1.5, and 1:1 target selection with structural clearance and breakout-aware zone handling
- [x] Preserve conservative rejection for unconfirmed breakouts, fakeouts, invalid stops, and insufficient clearance
- [x] Update audit traces, monitoring labels, upgrade safeguards, and tests for the selected ratio
- [x] Validate scanner-to-Telegram behavior, review the UI, and publish without rewriting historical signals
