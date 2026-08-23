# Heartbeat Reliability

Trading Guard AI uses a Manus Heartbeat HTTP callback at `/api/scheduled/trading-guard-scanner`. The callback authenticates the cron identity and requires a task UID before it can run the scanner. The callback path and v4 paper-trading logic are unchanged.

## App-side protections

Every accepted callback is recorded in `scanner_run_ledger` with the task UID, a five-minute UTC run key, start time, completion time, status, aggregate counts, market-data status, and any error. The run key is unique per task and five-minute bucket. If a platform retry or duplicate callback arrives for a bucket already recorded, the callback returns a successful duplicate response instead of running the scanner twice.

The dashboard callback card reconciles a stale stored task UID to the sole active scanner task with the expected callback path and persists the replacement UID. If more than one active candidate exists, it refuses to guess and reports that the registry cannot safely confirm the task. The card also displays the latest app-side ledger row and warns when the registry’s next execution time is more than two minutes overdue.

## Platform boundary

The app can make callback execution idempotent, persist failures, and expose stale-cycle evidence. It cannot force the external scheduler to create a run, repair a platform permission or maintenance response, or guarantee that an HTTP request reaches the deployed service at an exact wall-clock second. A healthy dashboard state means the latest scheduler attempt is reflected by an application run; it does not guarantee that a future scheduler attempt will occur.

The preferred recovery path for a missed cycle is to inspect the Heartbeat task in the Management UI, confirm that it is enabled and targets the production URL, and use the platform’s run/investigation controls if the registry shows a failure. The app’s durable ledger then provides the callback-side result for correlation.

## Validation policy

All scanner outputs remain paper-only and `UNVALIDATED`. The reliability layer does not loosen locator thresholds, alter market-data freshness rules, change Telegram routing, or modify exact 1:2 risk-reward geometry.

## Operational checks

After a deployment or task-identity change, verify that the callback card shows the active task UID, an enabled state, a five-field market scanner schedule, a recent scheduler attempt, and a corresponding `SUCCEEDED` or `FAILED` ledger row. For a failed row, review its persisted error before retrying. For a stale-cycle warning with no ledger row, the problem is upstream of the application callback and must be investigated in the Heartbeat registry.

*Last updated: 2026-08-23.*

## References

1. [Manus periodic updates guidance](https://manus.im)
2. [Trading Guard AI scheduled callback](/api/scheduled/trading-guard-scanner)
