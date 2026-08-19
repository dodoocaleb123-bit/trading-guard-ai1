# Production monitoring notes

- Scanner Heartbeat task: `R3EHFcL98vEFqbos8UpCoi`
- Enabled cadence: every five minutes
- Latest observed run: scheduled 2026-08-19 14:07:53 UTC, finished 14:08:00 UTC
- HTTP status: 200
- Duration: 6,442 ms
- Response: `{"ok":true,"users":1,"created":8,"tracked":0,"marketData":"available"}`
- Previous observed runs at 13:57:54, 13:47:31, 13:39:51, and 13:27:45 UTC completed successfully with marketData available; those cycles created 0 signals.
- The latest successful cycle created 8 replacement-intelligence paper outcomes, confirming the production callback is executing after cutover.
- Telegram delivery-level confirmation and component/regime outcome rows still require database/application verification; no profitability conclusion is drawn from this scheduler result.

## UI verification

The Overview dashboard renders the new Replacement paper validation panel on desktop and narrow mobile widths. Component and regime columns collapse cleanly on mobile; the panel shows the current collecting-evidence state without overflow. The dashboard currently displays zero replacement outcomes because the first live cycle was executed before this metadata/statistics checkpoint was published, while the existing 8 open signals remain visible in the broader signal metrics.

## Linked outcome release verification

The first post-publish scanner Heartbeat finished at 2026-08-19 14:29:47 UTC with HTTP 200, marketData available, and 8 created paper signals. The production database shows all 8 latest signals labeled replacement-forex-v1, with BUY direction, complete entry/stop-loss/take-profit levels, market-regime metadata, and SIGNAL Telegram delivery status DELIVERED with timestamps from 14:29:44 to 14:29:47 UTC. Outcome notifications will be emitted when these pending signals resolve to WIN or LOSS and will use dedupe keys of the form outcome:<signalId>:<status>.

## Take-profit outcome diagnosis

The reported take-profit event was recorded successfully. Signal 1200003 (XAU/USD, 15MIN, BUY) was opened at 14:07:57 UTC with take profit 4488.21999? The production record shows take profit 4488.21965000, closed at 14:34:52 UTC at live price 4489.04892, status WIN, and an OUTCOME Telegram delivery marked DELIVERED at 14:34:52 UTC. The Heartbeat run that performed the tracking completed successfully at 14:34:52 UTC with tracked=1. The apparent delay was the five-minute polling interval and likely a stale dashboard view, not a missing outcome record.
