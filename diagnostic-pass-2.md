# Diagnostic Pass 2 Findings

The live payload exposed 124 historical strategy-rule rows containing `undefined` or `Guardrail: undefined`. These rows were preserved in the database for history but were being returned by the shared rule loader and could appear in the Strategy rules page or enter prompts. The shared loader now excludes only blank or malformed undefined guardrails, so valid imported rules remain available and historical rows are not deleted.

The Chat audit screenshot also displayed a historical generic model fallback, `I could not produce a response.` The current conversation handler could still emit that fallback when the model returned no readable content. A deterministic normalizer now handles string, array, and object-shaped model content and returns a clear retry message that explicitly says no trade decision was created when no readable content exists.

The initial normalizer implementation caused a TypeScript recursive-inference error. That was corrected with an explicit string return type and annotated locals. Focused validation then passed: 15 tests across chat, rule integrity, and scanner behavior, plus TypeScript. The prior complete validation also passed tests, production build, and schema check before this second hardening change.

Current live scanner logs at 03:30 UTC show both Twelve Data batches returning all four requested series, eight raw snapshots forwarded, successful external-trigger completion, and successful Telegram outcome replies. The remaining failed Telegram rows are historical HTTP 429 outcome attempts from 2026-08-24, not current failures.
