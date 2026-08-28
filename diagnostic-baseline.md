# Full-App Diagnostic Baseline

## Authenticated frontend

The authenticated control room loaded in the browser after Google sign-in. The sidebar rendered Overview, White AI, Cherry AI, Strategy rules, Trade history, Scanner, Winning rate, Best Time to Trade, and Best Days to Trade. The overview displayed live market pulse data, strategy-judgment totals, v5 state cards, and the latest scanner status without a blank page or visible application error.

The overview showed the latest scanner cycle at approximately 00:30 UTC as `Twelve Data data unavailable (429)`, while the latest complete 15M + 1H + 4H market-data cycle was also shown at approximately 00:30 UTC. 1H cards rendered as `V5 context refreshes`, `CONTEXT ONLY`, and `Last 1H context refresh`, confirming that the context-only persistence correction is present in the authenticated UI.

## Local baseline

TypeScript completed without errors. The production build completed with the existing large-chunk advisory only. The code-focused regression suite passed 56 test files and 235 tests. Five credential/network tests are intentionally excluded from deterministic regression because they require live external provider connectivity.

## Scheduling baseline

The active five-minute callback is `/api/scheduled/trading-guard-scanner` with cron expression `0 */5 * * * *`. The older recovery job is disabled. The active job is enabled and has a future execution time in the scheduler listing.

## Initial diagnostic note

The provider 429 shown in the dashboard is an external quota/rate-limit condition, not by itself an application defect. It must remain fail-closed: no v5 signal should be emitted from incomplete data. Continue diagnosis across the scheduler ledger, grouped Twelve Data routing, v5 persistence, Telegram/tracking, API procedures, and both chat channels.


## White AI reproduction

Authenticated White AI rendered, but its persisted history contains the technical assistant message `Cannot read properties of undefined (reading '0')`. Sending a new safe question left the composer in a pending/spinner state and did not render a response during the follow-up observation. This is a confirmed live chat-path defect requiring browser-console and server-log correlation before continuing the full pass.


## Restarted diagnostic baseline

After the White AI fix was implemented locally, the deterministic baseline was rerun: TypeScript passed, production build passed with the existing large-chunk advisory, and 56 test files / 235 tests passed with the five live-credential network tests excluded. The active five-minute Heartbeat job remained enabled; the older recovery job remained disabled.

The authenticated browser reproduction was repeated before the fix: White AI rendered the stored technical error `Cannot read properties of undefined (reading '0')`, and a new question eventually persisted the same technical error instead of a readable answer. This confirmed a real chat-path defect rather than a purely historical display artifact.


## Clean-pass authenticated chat checks

After the local fix, White AI no longer displayed the raw `Cannot read properties...` message. The stored history was rendered as a readable White AI unavailable notice, and the layout remained intact with fixed header, export/clear controls, and composer. Cherry AI opened successfully with its independent-review title, empty-state prompt, and composer; its channel remained separate from White AI.


## Clean-pass Scanner check

The authenticated Scanner page loaded successfully. It showed the external trigger as the source, a fresh five-minute cadence, and all required timeframe retrieval cards as AVAILABLE for the latest cycle: 15M, 1H, and 4H. The v5 smoke check showed PASS with 48 payloads checked. The adaptive geometry panel rendered paper-only WAITING states, and the 1H/4H rows showed context refresh state timestamps rather than signal-emission fields. No blank panel or visible application error appeared.


## Clean-pass Strategy rules check

The authenticated Strategy rules page loaded successfully with refresh and playbook-import controls. The stored forex playbooks rendered with titles, source labels, content excerpts, and import timestamps. No client error, empty broken panel, or missing route state was observed.


## Clean-pass Trade history check

The authenticated Trade history route loaded with generated-signal counts, Telegram delivery reconciliation, current delivery health, approved-audit totals, and recent signal records. It showed 8 generated signals, 8 delivered messages, 0 recorded delivery failures, 16 recent delivery attempts with 0% current failure rate, and no stale failed outcomes in the current view. Signal cards included stored evidence candles, outcomes, and paper-only v5 attribution. No visible frontend error appeared.


## Clean-pass Winning rate check

The authenticated Winning rate page loaded with manual refresh and automatic refresh controls. Analytics freshness was current, version counts were reconciled, and Replacement Intelligence v5 performance totals rendered with by-asset, by-timeframe, and confidence-band breakdowns. No loading error or runtime error appeared.


## Clean-pass Best Time to Trade check

The authenticated Best Time to Trade route loaded successfully and rendered complete UTC-hour tables for Replacement Intelligence v5 across assets and timeframes. It showed intentional zero/empty values where no signals existed and populated rows for recorded outcomes. No loading failure or runtime error appeared.


## Clean-pass Best Days to Trade check

The authenticated Best Days to Trade route loaded successfully with version-separated weekday tables for every tracked asset and timeframe. Populated and empty rows were rendered consistently, including intentional zero-data states. No route, loading, or runtime error appeared.


## Clean-pass Overview check

The authenticated Overview loaded and settled successfully. It showed 71 ingested rules, 8 audits, live market pulse values saved at 00:40, reconciled v5 counts, refreshed 1H context-only cards, and current v5 state cards. It also correctly surfaced a Twelve Data 429 warning for the latest cycle while separately showing the latest complete market-data cycle at 00:40. This is expected provider-status observability, not a UI crash; no visible runtime error appeared.


## Final clean-pass White AI check

White AI now renders the previously persisted technical failure as a readable assistant-specific unavailable message. The authenticated page retains the requested layout and controls, and the browser console had no current output or client exception after the final load. This confirmed the local fix contained both current malformed LLM responses and already-persisted malformed history.


## Clean-pass Overview after all fixes

After restarting the full diagnosis following the global lease repair, Overview loaded and settled successfully. At 00:50 UTC it showed live market pulse values, 8 audits, 38% historical paper win rate, 11,886 strategy judgments, and refreshed 1H context-only cards. The page correctly distinguished the latest scanner cycle from the latest complete market-data cycle and surfaced a current Twelve Data 429 warning without emitting a signal. No client error appeared.


## Clean-pass Cherry AI check

Cherry AI loaded and settled successfully in the authenticated browser. Its independent trade-review empty state, channel-specific subtitle, navigation control, clear control, and composer rendered correctly. No visible client exception appeared.


## Clean-pass Scanner check

The authenticated Scanner route loaded and settled successfully. Scanner freshness was fresh at 1 minute with external-trigger source and a five-minute cadence. The latest 00:50 cycle reported 15M, 1H, and 4H as AVAILABLE; the v5 production smoke check passed with 48 payloads checked; 15M/5M adaptive geometry cards rendered; and 1H/4H records were explicitly context-only. No visible runtime error appeared.


## Clean-pass Strategy rules check

The authenticated Strategy rules route loaded and settled successfully. It displayed the ingested playbooks, readable source excerpts, refresh control, and file-import form. No loading failure or runtime error appeared.


## Clean-pass Trade history check

The authenticated Trade history route loaded and settled successfully. It showed 8 generated signals, 8 delivered Telegram messages, zero recorded delivery failures, six approved audits, reconciled generated-versus-delivery counts, current 24-hour delivery health at 0% failure, and resolved paper outcomes with evidence. No visible loading or runtime error appeared.


## Clean-pass Winning rate check

The authenticated Winning rate route loaded and settled successfully. It showed automatic refresh, eight recognized v5 records, version reconciliation, 8 generated signals, 7 resolved, 3 wins, 4 losses, a 43% historical paper win rate, and complete per-asset, timeframe, and confidence-band tables. No loading or runtime error appeared.


## Clean-pass Best Time to Trade check

The authenticated Best Time to Trade route loaded and settled successfully. Replacement Intelligence v5 rendered complete UTC-hour tables for each tracked asset/timeframe, with populated outcome rows where records existed and intentional zero-data states elsewhere. No loading or runtime error appeared.


## Clean-pass Best Days to Trade check

The authenticated Best Days to Trade route loaded and settled successfully. Replacement Intelligence v5 rendered all weekday tables for each tracked asset/timeframe, with populated outcome rows where available and intentional zero-data states elsewhere. No loading or runtime error appeared.

## Post-memory-fix White AI check

The authenticated White AI page renders the old malformed response as a readable channel-specific unavailable notice, with the fixed header, controls, and composer intact. A new safe question was submitted after the memory-bound changes; after waiting, the request remained in the loading state and no new assistant response was visible. This is a current live transport/LLM-path issue requiring log correlation, separate from the historical rendering crash.

## Clean post-timeout chat pass

White AI now renders historical malformed responses as readable unavailable notices and a live request returns a readable service-unavailable fallback instead of remaining pending indefinitely. Cherry AI renders its independent-review history, paper-only audit evidence, composer, and channel-specific UI without a visible runtime error. The upstream LLM service is currently unavailable, but the client and server failure handling is bounded and readable.

## Post-timeout clean browser pass: Overview and Scanner

Overview rendered authenticated dashboard data and showed a fresh 1:00 AM market pulse, context-only 1H cards, and expected Twelve Data 429 warning without a client crash. Scanner settled successfully: latest successful cycle 1:10 AM, external-trigger source, 5-minute cadence, 15M/1H/4H all AVAILABLE, v5 smoke PASS with 47 payloads checked, and fresh 1H/4H state saves. The provider warning is an external quota condition, not a frontend/runtime exception.

