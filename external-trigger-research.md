# External five-minute trigger research

## cron-job.org
- Official site: https://cron-job.org/en/
- Official FAQ: https://cron-job.org/en/faq/
- Free service; supports schedules as frequent as once per minute.
- Supports custom HTTP methods, POST request bodies, arbitrary custom headers, HTTPS URLs, test runs, execution history, and failure/recovery notifications.
- FAQ states requests time out after 30 seconds.
- FAQ states execution can have slight delays and explicitly does not guarantee punctuality.
- Therefore it is a viable lighter external trigger, but not an absolute five-minute guarantee. The app must remain idempotent and return quickly.

## Architecture implication
Use a dedicated authenticated POST endpoint with a UTC five-minute run key and database lease/idempotency check. Retain the existing managed Heartbeat as fallback only after duplicate suppression is verified. The external service must be configured by the user because account ownership and credentials are required.

## Twelve Data quota facts
- Official credits guidance: https://support.twelvedata.com/en/articles/5615854-credits
- Official trial/basic-plan guidance: https://support.twelvedata.com/en/articles/5335783-trial
- Official batch-request guidance: https://support.twelvedata.com/en/articles/5203360-batch-api-requests
- `/time_series` consumes one API credit per symbol, even when symbols are batched into one HTTP request.
- The Basic plan is documented as 800 API credits per day, resetting at midnight UTC.
- The application retrieves four symbols for each of two intervals, so a complete cycle is 8 symbol-credits, assuming all requests are successful and no failover retries are charged separately.
- Three-minute polling is 480 cycles per 24-hour day, or approximately 3,840 symbol-credits/day. Five-minute polling is 288 cycles/day, or approximately 2,304 symbol-credits/day. The five configured 800-credit keys would provide approximately 4,000 credits/day if each key has a separate full allowance, leaving only about 160 credits/day at three-minute cadence before retries, manual requests, or other endpoints.
- cron-job.org is not punctuality-guaranteed; a trigger may be delayed. Its 30-second timeout is compatible with this scanner's normal seconds-long callback, but it does not guarantee exact five-minute delivery.
