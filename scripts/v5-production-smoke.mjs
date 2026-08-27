const baseUrl = (process.env.V5_PRODUCTION_BASE_URL || "").replace(/\/$/, "");
const sessionCookie = process.env.V5_SESSION_COOKIE || "";
const lookbackMinutes = Number(process.env.V5_SMOKE_LOOKBACK_MINUTES || 30);

if (!baseUrl || !sessionCookie) {
  console.error("Usage requires V5_PRODUCTION_BASE_URL and V5_SESSION_COOKIE.");
  process.exit(2);
}

const input = encodeURIComponent(JSON.stringify({ json: {} }));
const url = `${baseUrl}/api/trpc/scanner.decisions?input=${input}`;
const response = await fetch(url, { headers: { cookie: sessionCookie, accept: "application/json" } });
if (!response.ok) throw new Error(`Authenticated scanner query failed: HTTP ${response.status}`);
const payload = await response.json();
const rows = payload?.[0]?.result?.data?.json ?? payload?.result?.data?.json ?? [];
const cutoff = Date.now() - lookbackMinutes * 60_000;
const recent = rows.filter((row) => new Date(row.createdAt).getTime() >= cutoff);
const checked = recent.filter((row) => {
  if (!row.marketSnapshot) return false;
  try {
    const snapshot = JSON.parse(row.marketSnapshot);
    const workflow = snapshot?.replacementIntelligence?.workflow;
    return Boolean(workflow && Array.isArray(workflow.zones) && typeof workflow.dominant4h === "string" && typeof workflow.trend1h === "string" && workflow.confirmation && (workflow.status === "QUALIFIED" || workflow.status === "WAITING"));
  } catch {
    return false;
  }
});
const qualified = checked.filter((row) => JSON.parse(row.marketSnapshot).replacementIntelligence.workflow.status === "QUALIFIED");
const waiting = checked.filter((row) => JSON.parse(row.marketSnapshot).replacementIntelligence.workflow.status === "WAITING");
const ratios = qualified.map((row) => JSON.parse(row.marketSnapshot).replacementIntelligence.workflow.riskReward).filter((value) => Number.isFinite(Number(value)));
if (!checked.length) throw new Error(`No complete v5 hierarchy payload found in the last ${lookbackMinutes} minutes.`);
console.log(JSON.stringify({ ok: true, checked: checked.length, qualified: qualified.length, waiting: waiting.length, actualRatios: ratios, latestCreatedAt: checked.map((row) => row.createdAt).sort().at(-1) }, null, 2));
