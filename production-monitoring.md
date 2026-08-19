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
