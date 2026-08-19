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


- [ ] Monitor live Heartbeat cycles after the strategy-engine reliability release and verify directional decisions, retries, and unavailable-model handling
- [x] Add production strategy-engine health metrics for response completeness, retry counts, and unavailable-model cycles
- [x] Add dashboard health-panel UI and regression coverage for the new observability metrics
- [x] Run full validation and visual verification; publish the monitoring release after the checkpoint
- [x] Harden live structured-response reliability by evaluating one raw snapshot per model call after production showed an incomplete two-candidate response
- [x] Add regression coverage for single-snapshot batching, retry accounting, and complete directional output
- [x] Run validation and publish the hardening update; verify a post-release Heartbeat cycle after deployment
- [x] Reduce structured-call concurrency and compact prompt context after the first post-hardening Heartbeat exceeded the two-minute timeout
- [x] Add regression coverage for bounded concurrency and prompt-size limits
- [ ] Publish and verify a timeout-resilient Heartbeat cycle after deployment
- [x] Normalize structured LLM content arrays and set an explicit output-token budget for scanner decisions after live calls returned empty decisions without timing out
- [x] Add regression coverage for content-part JSON parsing and bounded structured output requests
- [ ] Publish and verify a live directional decision cycle or record the remaining model-service limitation explicitly
