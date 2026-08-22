# Economic Calendar Integration Research Notes

## Forex Factory

The public Forex Factory calendar page was retrieved successfully through text extraction on 2026-08-22. It displayed a calendar timezone of America/New_York (GMT -4), printed timestamp, event times, event names, and impact/detail indicators. Examples included GDP, CPI, unemployment, industrial production, retail sales, and other releases.

Direct browser navigation to Forex Factory was blocked in this environment, so automated access and site terms were not independently verified from the site’s user guide. Search results did not identify a clearly documented official public API. Community scrapers and third-party services exist, but they may be brittle, rate-limited, or subject to provider terms.

## Implication for Trading Guard AI

Forex Factory is useful as a reference calendar for scheduled event timing and impact context, but it should not be made the production system’s sole source without a permitted and stable integration method. A structured calendar provider or official government release feed is safer for automated use. The existing app’s FRED, ECB, and Bank of England observations remain useful for official macro context but do not by themselves provide a complete forecast/previous/actual/impact calendar.

## Structured alternatives checked

The JB News Calendar API documentation at https://www.jblanked.com/news/api/docs/calendar/ documents endpoints for today, week, and date-range Forex Factory calendar data. It describes API-key authentication, currency and impact filters, and fields including event name, currency, category, impact, date, actual, forecast, previous, outcome, strength, and quality. Its documentation states that free API usage has been reduced to one request per day due to traffic, so it is not sufficient for high-frequency polling without a suitable paid/credit plan or caching strategy.

Myfxbook’s RSS page at https://www.myfxbook.com/rss describes free RSS feeds for individual, non-commercial use, including forex news and calendar events. RSS is useful for updates but may not provide the structured forecast/actual/previous fields or sufficiently deterministic event data needed for a signal engine.

These sources support a practical conclusion: the app can potentially receive Forex Factory-sourced events through a third-party structured service, but the source’s quota, terms, freshness, field completeness, and permitted use must be confirmed before production integration. Direct scraping remains the least reliable option.

## Export-path verification

Current search results for the Forex Factory calendar explicitly show a **Weekly Export** section with **ICS, CSV, JSON, and XML** formats. The public calendar page also displays event names, times, and impact/detail indicators. A direct text extraction of the `?week` page did not expose the individual export URLs, so the exact machine-readable endpoint still needs to be obtained from the calendar page or supplied by the user. The export path should not be automated until its URL stability, access behavior, refresh cadence, and permitted use are confirmed.
