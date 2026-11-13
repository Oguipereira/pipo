import "server-only";
import type { Day } from "../dates";
import { DEMO, demoCommitCounts } from "../demo";
import { levelFromCount } from "../heatmap";
import { createClient } from "../supabase/server";
import { fetchAll } from "./fetch-all";

export type ContributionDay = { date: Day; count: number; level: number };

export async function getContributionDays(from: Day, to: Day): Promise<ContributionDay[]> {
  if (DEMO) {
    const counts = [...demoCommitCounts()].filter(([d]) => d >= from && d <= to);
    const max = Math.max(1, ...counts.map(([, n]) => n));
    return counts.map(([date, count]) => ({ date, count, level: levelFromCount(count, max) }));
  }
  const supabase = await createClient();
  const rows = await fetchAll((a, b) =>
    supabase
      .from("contribution_days")
      .select("date, count, level")
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .range(a, b),
  );
  return rows;
}

export type SyncRun = {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  stats: Record<string, unknown>;
};

export async function getLastSync(): Promise<SyncRun | null> {
  if (DEMO) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sync_runs")
    .select("id, status, trigger, started_at, finished_at, error, stats")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    trigger: data.trigger,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    error: data.error,
    stats: (data.stats ?? {}) as Record<string, unknown>,
  };
}
