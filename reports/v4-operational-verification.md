# v4 Operational Monitoring Verification

The dashboard now includes an Active v4 outcome monitor with deterministic dimensions for asset, timeframe, direction, event risk, and structural geometry. The overview and Winning Rate pages remain readable on desktop, and the existing paper-only/UNVALIDATED wording remains visible.

The live database query performed during this release found no generated signals labeled `forex-trading-combined-document-v4` yet. This is expected until the next scanner cycle after the authoritative-v4 code is live; it is not evidence that v4 delivery has failed. First-signal verification therefore remains an operational follow-up, while the routing and formatter tests confirm the new path and `v4 active` Telegram marker.

The compact signal formatter now emits `Paper only · UNVALIDATED · v4 active`. Full tests and the production build passed before this visual verification.


## Live v4 activation check

At the latest live database check, `forex-trading-combined-document-v4` was present as `ACTIVE` with activation time `2026-08-22 21:00:34 UTC`. The query found zero generated v4 signals and zero delivered v4 Telegram signals at `2026-08-22 21:21 UTC`. The implementation is therefore active, but first-delivery confirmation must wait for the next qualifying scanner setup and heartbeat cycle; no test signal was inserted or fabricated.


## First live v4 paper scan

A controlled post-activation scan used real Twelve Data market data and created eight v4 paper signals: one 15MIN and one 1H signal for each EUR/USD, XAU/USD, GBP/USD, and BTC/USD. The live database query confirmed all eight records carry `forex-trading-combined-document-v4`, each has a `PENDING` outcome state, and each has a corresponding `DELIVERED` Telegram record with a stored Telegram message ID. The sample included both BUY and SELL directions. Supabase mirroring returned 404 warnings during the one-off scan, but local persistence and Telegram delivery succeeded; this does not change the paper-signal record or its UNVALIDATED status.
