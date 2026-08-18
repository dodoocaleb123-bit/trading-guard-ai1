# Trading History visual verification

The desktop screenshot at `/trade-history` shows the new sent date/time under each generated signal, separate Generated / Telegram Delivered / Telegram Failed / Audits metrics, and a Signal reconciliation card. Existing historical signals display zero confirmed Telegram deliveries because delivery-audit rows were introduced after those signals were created; this is an expected historical boundary and makes the mismatch visible rather than hiding it.

The mobile screenshot shows the same cards stacked vertically and the signal rows remain readable with sent timestamps and outcome badges. The page is long because it displays the full history list, but the narrow layout does not clip the reconciliation metrics or timestamp text.
