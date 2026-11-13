import "server-only";
import type { Day } from "../dates";
import {
  DEMO,
  demoCommitCounts,
  demoCommitPage,
  demoLanguageMonthly,
  demoLanguageShares,
  demoLibraries,
  demoRepoActivity,
  demoRepos,
} from "../demo";
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

// ---------------------------------------------------------------------------
// Repositórios e commits
// ---------------------------------------------------------------------------

export type RepoSummary = {
  id: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  isFork: boolean;
  ignored: boolean;
  primaryLanguage: string | null;
  pushedAt: string | null;
};

export async function getRepos(): Promise<RepoSummary[]> {
  if (DEMO) return demoRepos();
  const supabase = await createClient();
  const rows = await fetchAll((a, b) =>
    supabase
      .from("repos")
      .select("id, full_name, url, is_private, is_fork, ignored, primary_language, pushed_at")
      .order("pushed_at", { ascending: false, nullsFirst: false })
      .range(a, b),
  );
  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    url: r.url,
    isPrivate: r.is_private,
    isFork: r.is_fork,
    ignored: r.ignored,
    primaryLanguage: r.primary_language,
    pushedAt: r.pushed_at,
  }));
}

export type CommitItem = {
  id: string;
  sha: string;
  message: string;
  committedAt: string;
  localDate: Day;
  url: string;
  additions: number;
  deletions: number;
  repo: string;
};

export const COMMITS_PAGE = 40;

export async function getCommits(opts: {
  from: Day;
  to: Day;
  repoIds?: string[];
  page?: number;
  search?: string;
}): Promise<{ items: CommitItem[]; total: number }> {
  if (DEMO) return demoCommitPage(opts);
  const supabase = await createClient();
  const page = opts.page ?? 0;
  let q = supabase
    .from("commits")
    .select(
      "id, sha, message, committed_at, local_date, url, additions, deletions, repos!commits_repo_id_user_id_fkey!inner(full_name, ignored)",
      { count: "exact" },
    )
    .eq("repos.ignored", false)
    .gte("local_date", opts.from)
    .lte("local_date", opts.to)
    .order("committed_at", { ascending: false })
    .range(page * COMMITS_PAGE, page * COMMITS_PAGE + COMMITS_PAGE - 1);
  if (opts.repoIds?.length) q = q.in("repo_id", opts.repoIds);
  if (opts.search) q = q.ilike("message", `%${opts.search.replace(/[%_]/g, "\\$&")}%`);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    items: (data ?? []).map((c) => ({
      id: c.id,
      sha: c.sha,
      message: c.message,
      committedAt: c.committed_at,
      localDate: c.local_date,
      url: c.url,
      additions: c.additions,
      deletions: c.deletions,
      repo: c.repos.full_name,
    })),
  };
}

export type RepoActivity = { repoId: string; fullName: string; commits: number; lastCommitAt: string | null };

export async function getRepoActivity(from: Day, to: Day): Promise<RepoActivity[]> {
  if (DEMO) return demoRepoActivity(from, to);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("repo_commit_counts", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    repoId: r.repo_id,
    fullName: r.full_name,
    commits: r.commits,
    lastCommitAt: r.last_commit_at,
  }));
}

// ---------------------------------------------------------------------------
// Linguagens e bibliotecas (fase 4)
// ---------------------------------------------------------------------------

export type LanguageShare = { language: string; lines: number; commits: number };

/**
 * Linhas alteradas por linguagem no período. Se nenhum commit do período foi
 * detalhado ainda, usa a distribuição de bytes dos repositórios ponderada pelos
 * commits de cada um (reserva, docs/SPEC.md §4.4).
 */
export async function getLanguageShares(
  from: Day,
  to: Day,
): Promise<{ shares: LanguageShare[]; source: "commits" | "repos"; coverage: { detailed: number; total: number } }> {
  if (DEMO) return demoLanguageShares();
  const supabase = await createClient();
  const [{ data: stats, error }, coverage] = await Promise.all([
    supabase.rpc("language_stats", { p_from: from, p_to: to }),
    commitCoverage(from, to),
  ]);
  if (error) throw new Error(error.message);
  if (stats && stats.length) {
    return {
      source: "commits",
      coverage,
      shares: stats.map((s) => ({ language: s.language, lines: Number(s.lines), commits: s.commits })),
    };
  }

  const activity = await getRepoActivity(from, to);
  if (!activity.length) return { source: "repos", coverage, shares: [] };
  const { data: langs } = await supabase
    .from("repo_languages")
    .select("repo_id, language, bytes")
    .in(
      "repo_id",
      activity.map((a) => a.repoId),
    );
  const totals = new Map<string, LanguageShare>();
  for (const repo of activity) {
    const rows = (langs ?? []).filter((l) => l.repo_id === repo.repoId);
    const sum = rows.reduce((s, l) => s + Number(l.bytes), 0);
    for (const l of rows) {
      const t = totals.get(l.language) ?? { language: l.language, lines: 0, commits: 0 };
      // "linhas" aqui é um peso relativo: commits do repositório × fração de bytes.
      t.lines += Math.round((repo.commits * 100 * Number(l.bytes)) / Math.max(1, sum));
      t.commits += repo.commits;
      totals.set(l.language, t);
    }
  }
  return { source: "repos", coverage, shares: [...totals.values()].sort((a, b) => b.lines - a.lines) };
}

async function commitCoverage(from: Day, to: Day) {
  const supabase = await createClient();
  const base = () =>
    supabase.from("commits").select("id", { count: "exact", head: true }).gte("local_date", from).lte("local_date", to);
  const [{ count: total }, { count: detailed }] = await Promise.all([
    base(),
    base().not("files_fetched_at", "is", null),
  ]);
  return { total: total ?? 0, detailed: detailed ?? 0 };
}

export type LanguageMonth = { month: Day; language: string; lines: number };

export async function getLanguageMonthly(from: Day, to: Day): Promise<LanguageMonth[]> {
  if (DEMO) return demoLanguageMonthly();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("language_monthly", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ month: r.month, language: r.language, lines: Number(r.lines) }));
}

export type LibraryUse = {
  ecosystem: "npm" | "pypi";
  name: string;
  repos: number;
  activeRepos: number;
  weight: number;
  devOnly: boolean;
};

export async function getLibraryUsage(from: Day, to: Day): Promise<LibraryUse[]> {
  if (DEMO) return demoLibraries();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("library_usage", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ecosystem: r.ecosystem as "npm" | "pypi",
    name: r.name,
    repos: r.repos,
    activeRepos: r.active_repos,
    weight: Number(r.weight),
    devOnly: r.dev_only,
  }));
}

/** Categorias definidas pelo usuário: chave "ecossistema:nome". */
export async function getLibraryOverrides(): Promise<Map<string, string>> {
  if (DEMO) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("library_categories").select("ecosystem, name, category");
  return new Map((data ?? []).map((r) => [`${r.ecosystem}:${r.name}`, r.category]));
}
