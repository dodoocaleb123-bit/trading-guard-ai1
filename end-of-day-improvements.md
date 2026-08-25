# End-of-Day Improvements

## Implemented

The application shell now lazy-loads the Home control-room module, producing separate `Home` and `AIChatBox` chunks. This reduces the initial JavaScript chunk from the prior approximately 1.01 MB to approximately 633 KB while preserving the assistant’s on-demand loading behavior.

The scanner dashboard now explains current health separately from historical skipped-window totals. It reports the latest cycle age, avoids treating historical skipped windows as a current failure, and provides a concise next-session check: confirm a new `SUCCEEDED` cycle, `marketData=available`, and no run error.

A follow-up diagnostic found that the banner briefly displayed a false warning while the cadence query was still loading. The banner now shows a neutral `checking` state until live diagnostics arrive. The loaded state was revalidated on desktop and mobile.

## Validation

Focused scheduler and strategy-health tests passed: 16 tests. The full suite passed with 44 test files and 164 tests. TypeScript validation passed, the production build passed, Drizzle schema validation passed, and `git diff --check` passed. The build output confirms the new Home route chunk and the existing lazy chat chunk.

The published site returned HTTP 200, unauthenticated scheduled-callback smoke testing returned HTTP 403, and the external scanner health endpoint returned HTTP 200. Desktop and mobile screenshots confirmed the dashboard and scanner remain readable and unclipped.

No scanner cadence, Twelve Data, Telegram, v4 Entry Locator, paper-only, or UNVALIDATED behavior was changed.
