# Official macro-source research

## FRED
Official FRED API documentation says all web-service requests require an API key; users request or view keys after logging into a FRED account. The key is a 32-character lowercase alphanumeric value passed as `api_key` or through the documented request mechanism. FRED is suitable for official U.S. macro series and release metadata, but requires a user-supplied key for API access.

Source: https://fred.stlouisfed.org/docs/api/api_key.html

## ECB
The ECB data API overview URL was reachable only through a security check in the browser session, so endpoint details were not independently verified in this pass. Treat ECB integration as pending official endpoint verification; do not rely on guessed paths.

Source: https://data.ecb.europa.eu/help/api/overview

## Design implication
Use verified, server-side adapters with explicit source, series, timestamp, freshness, and status fields. If a source is blocked, missing, stale, or unauthorized, return an UNAVAILABLE macro context and preserve the v2 decision base rather than fabricating values.

## ECB and Bank of England verification update

The official ECB policy-rate page exposes a current policy-rate table with the deposit facility rate and effective date in its HTML table. The adapter uses that official page and fails closed if the expected table structure is absent.

The official Bank of England Bank Rate page exposes the current official Bank Rate and identifies the `IUDBEDR` series in its chart source. The adapter reads the current official Bank Rate from that page and records the fetch timestamp.

Sources:
- https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html
- https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp
