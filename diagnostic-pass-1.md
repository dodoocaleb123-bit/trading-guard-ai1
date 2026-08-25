# Diagnostic Pass 1 Findings

Date: 2026-08-25 UTC

The published site returned HTTP 200. The scheduled callback correctly returned HTTP 403 without its secret, and the external scanner health endpoint returned HTTP 200 without requiring the trigger secret. The latest production scanner runs at 03:00, 03:05, 03:10, 03:15, 03:20, and 03:25 UTC completed with marketData=available and no run errors. The 03:10 row recorded one duplicate callback suppression, which is expected idempotency behavior. The external trigger is producing the recent five-minute runs; the enabled managed Heartbeat remains the fallback.

The live database contains zero PENDING current-v4 Entry Locator signals and zero undefined strategy lessons. Aggregate totals still include historical pending signals and failed delivery attempts; these require classification, not automatic deletion. The dashboard reports 127 received and 127 completed cycles, 0 failed cycles, 1 duplicate suppressed, and 161 skipped windows over its 24-hour diagnostic window. The skipped windows are consistent with the managed fallback’s historical gaps while the external trigger is active; they are not accompanied by current failed runs.

Automated validation passed: 42 test files and 159 tests, TypeScript no-emit, production build, and `drizzle-kit check`. The first combined command returned exit code 1 only because `drizzle-kit generate --dry-run` is unsupported; the supported `drizzle-kit check` then completed successfully. Desktop and mobile screenshots for `/` and `/scanner` rendered without visible clipping or horizontal overflow in the captured viewports.
