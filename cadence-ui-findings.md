# Cadence diagnostics UI verification

- Desktop `/scanner` full-page preview: the five-minute cadence card renders above adaptive geometry, shows received/skipped/completed/failed/duplicate counters, average interval, source split, latest run list, and remains readable without clipping.
- Mobile `/scanner` full-page preview at 375px: the metrics stack into a single column, long descriptions wrap, source and latest-run lines wrap, and no horizontal overflow or hidden text was observed.
- Current preview evidence shows live ledger values including received cycles, skipped windows, successful completion count, and external/Heartbeat source labels.
