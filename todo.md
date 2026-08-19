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

- [ ] Diagnose why recent paper signals are not visible in private asset Telegram groups
- [ ] Verify group chat IDs, bot membership/permissions, delivery statuses, and Heartbeat execution
- [ ] Fix any group-routing or delivery issue, add regression coverage, and publish if code changes are needed

- [x] Keep manual Chat Audit responses in the audit chat area only
- [x] Stop manual-audit Telegram delivery without changing autonomous signal/outcome routing
- [x] Add regression coverage, run validation, and publish the audit-channel correction
