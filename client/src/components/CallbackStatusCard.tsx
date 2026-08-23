import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ServerCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function formatDateTime(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
}

function formatRelativeMinutes(value: number | null | undefined) {
  if (value == null) return "No application run";
  if (value < 1) return "Less than a minute ago";
  return `${value} minute${value === 1 ? "" : "s"} ago`;
}

export function CallbackStatusCard() {
  const query = trpc.scanner.callbackStatus.useQuery(undefined, { refetchInterval: 60_000 });
  const data = query.data;
  const status = data?.status ?? "SCHEDULER_UNAVAILABLE";
  const healthy = status === "HEALTHY";
  const unavailable = status === "SCHEDULER_UNAVAILABLE";
  const staleCycle = Boolean(data?.staleCycle);
  const recentRuns = data?.recentRuns ?? [];
  const repeatedFailures = recentRuns.filter((run) => run.status === "FAILED").length >= 2;
  const StatusIcon = healthy ? CheckCircle2 : unavailable ? ServerCog : AlertTriangle;
  const badgeClass = healthy
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
    : unavailable
      ? "border-slate-500/25 bg-slate-500/10 text-slate-700"
      : "border-amber-500/25 bg-amber-500/10 text-amber-700";

  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-xl">Scanner callback</CardTitle>
              {data && <Badge variant="outline" className={badgeClass}>{data.label}</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Free Autoscale Heartbeat visibility for the five-minute market scanner.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {query.isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Scheduler status could not be read from the Heartbeat registry. No callback health claim is made.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
              <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${healthy ? "text-emerald-600" : unavailable ? "text-slate-600" : "text-amber-600"}`} />
              <p className="text-sm leading-6 text-muted-foreground">{data?.diagnosis ?? "Loading scheduler status…"}</p>
            </div>
            {staleCycle && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>The next Heartbeat time is overdue by more than two minutes. This is a platform scheduling warning; the app cannot force a missed callback, but the durable run ledger will show whether a later callback reached the app.</p>
              </div>
            )}
            {repeatedFailures && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>At least two of the five most recent app-side callback records failed. Review the stored errors and the Heartbeat execution history before expecting new Telegram signals.</p>
              </div>
            )}
            <div className="rounded-xl border bg-muted/20 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">Recent app-side run history</span>
                <span className="text-xs text-muted-foreground">{recentRuns.length ? `${recentRuns.length} recorded` : "No callbacks recorded yet"}</span>
              </div>
              {recentRuns.length > 0 && (
                <div className="mt-3 divide-y rounded-lg border bg-background">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium">{formatDateTime(run.startedAt)}</p>
                        <p className="text-[11px] text-muted-foreground">{run.finishedAt ? `Finished ${formatDateTime(run.finishedAt)}` : "Still running"}{run.error ? ` · ${run.error}` : ""}</p>
                      </div>
                      <Badge variant="outline" className={run.status === "SUCCEEDED" ? "border-emerald-500/25 text-emerald-700" : run.status === "FAILED" ? "border-rose-500/25 text-rose-700" : "border-amber-500/25 text-amber-700"}>{run.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Last app scan</div>
                <p className="mt-2 text-sm font-semibold">{formatDateTime(data?.appLastRunAt)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatRelativeMinutes(data?.minutesSinceApplicationRun)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><ServerCog className="h-3.5 w-3.5" />Last scheduler attempt</div>
                <p className="mt-2 text-sm font-semibold">{formatDateTime(data?.schedulerLastAttemptAt)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">External Heartbeat registry time</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Next scheduled run</div>
                <p className="mt-2 text-sm font-semibold">{formatDateTime(data?.nextExecutionAt)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">UTC schedule, displayed locally</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />Scanner state</div>
                <p className="mt-2 text-sm font-semibold">{data?.schedulerJob?.isEnable ? "Enabled" : "Not enabled"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{data?.schedulerJob?.cronExpression ?? "No cron registered"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>Task: {data?.taskUid ? `${data.taskUid.slice(0, 12)}…` : "Not configured"}</span>
              <span>Callback: {data?.schedulerJob?.callbackPath ?? "/api/scheduled/trading-guard-scanner"}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
