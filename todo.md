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
