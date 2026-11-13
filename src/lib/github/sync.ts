import "server-only";
import { addDays, localDate } from "../dates";
import { aggregateFiles } from "../languages";
import { findManifests, parseManifest } from "../manifests";
import type { AdminClient } from "../supabase/admin";
import type { Json } from "../supabase/database.types";
import { applyTaskLinks } from "./apply-links";
import { GitHubClient, GitHubError } from "./client";
import {
  CONTRIBUTIONS_QUERY,
  HISTORY_QUERY,
  REPOS_QUERY,
  type CommitDetail,
  type ContributionsResponse,
  type HistoryResponse,
  type RepoNode,
  type ReposResponse,
  type TreeResponse,
} from "./queries";
import {
  commitRow,
  contributionRows,
  dayEndIso,
  dayStartIso,
  historySince,
  repoLanguageRows,
  repoRow,
  reposNeedingCommits,
} from "./transform";

export type SyncTrigger = "manual" | "cron";

export type SyncOptions = {
  db: AdminClient;
  userId: string;
  timezone: string;
  token: string;
  trigger: SyncTrigger;
  /** Tempo máximo desta execução; o que faltar fica para a próxima. */
  budgetMs: number;
  fetchImpl?: typeof fetch;
};

export type SyncStats = {
  contributionDays: number;
  repos: number;
  reposWithNewCommits: number;
  commits: number;
  commitsDetailed: number;
  manifests: number;
  dependencies: number;
  tasksLinked: number;
  tasksClosed: number;
  pending: string[];
};

/** Reserva de cota que nunca é usada, para não travar outras ferramentas do usuário. */
const GRAPHQL_RESERVE = 300;
const REST_RESERVE = 300;

/**
 * Sincroniza um usuário: contribuições → repositórios → commits novos →
 * vínculos #T12 → linguagens por commit → dependências. Incremental e
 * interrompível: cada etapa grava o progresso e respeita tempo e rate limit.
 */
export async function syncUser(opts: SyncOptions): Promise<{ status: string; stats: SyncStats; error?: string }> {
  const { db, userId, timezone, trigger } = opts;
  const deadline = Date.now() + opts.budgetMs;
  const gh = new GitHubClient(opts.token, opts.fetchImpl);
  const stats: SyncStats = {
    contributionDays: 0,
    repos: 0,
    reposWithNewCommits: 0,
    commits: 0,
    commitsDetailed: 0,
    manifests: 0,
    dependencies: 0,
    tasksLinked: 0,
    tasksClosed: 0,
    pending: [],
  };

  const timeLeft = () => deadline - Date.now();
  const graphqlOk = () => timeLeft() > 5_000 && gh.graphqlRemaining > GRAPHQL_RESERVE;
  const restOk = () => timeLeft() > 5_000 && gh.restRemaining > REST_RESERVE;

  const { data: run, error: runError } = await db
    .from("sync_runs")
    .insert({ user_id: userId, trigger })
    .select("id")
    .single();
  if (runError || !run) throw new Error(`Não foi possível registrar a sincronização: ${runError?.message}`);

  let status = "ok";
  let errorMessage: string | undefined;

  try {
    const now = new Date();
    const today = localDate(now, timezone);

    // 1. Contribuições (calendário do GitHub, último ano)
    const contributions = await gh.graphql<ContributionsResponse>(CONTRIBUTIONS_QUERY, {
      from: dayStartIso(addDays(today, -364), timezone),
      to: dayEndIso(today, timezone),
    });
    const viewerNodeId = contributions.viewer.id;
    const dayRows = contributionRows(contributions, userId);
    await must(db.from("contribution_days").upsert(dayRows, { onConflict: "user_id,date" }));
    stats.contributionDays = dayRows.length;

    // 2. Repositórios (até 500, mais recentes primeiro)
    const nodes: RepoNode[] = [];
    let after: string | null = null;
    for (let page = 0; page < 10; page++) {
      const res: ReposResponse = await gh.graphql<ReposResponse>(REPOS_QUERY, { after });
      nodes.push(...res.viewer.repositories.nodes.filter(Boolean));
      if (!res.viewer.repositories.pageInfo.hasNextPage || !graphqlOk()) break;
      after = res.viewer.repositories.pageInfo.endCursor;
    }
    const repos = await must(
      db
        .from("repos")
        .upsert(
          nodes.map((n) => repoRow(n, userId)),
          { onConflict: "user_id,github_id" },
        )
        .select("id, github_id, owner, name, ignored, pushed_at, commits_synced_at, deps_synced_at, default_branch"),
    );
    stats.repos = repos.length;
    const repoIds = repos.map((r) => r.id);
    const byGithubId = new Map(repos.map((r) => [r.github_id, r]));
    if (repoIds.length) {
      await must(db.from("repo_languages").delete().eq("user_id", userId).in("repo_id", repoIds));
      const langRows = nodes.flatMap((n) => {
        const repo = byGithubId.get(n.databaseId);
        return repo ? repoLanguageRows(n, repo.id, userId) : [];
      });
      if (langRows.length) await must(db.from("repo_languages").insert(langRows));
    }

    // 3. Commits novos, repositório por repositório
    const newCommits: { id: string; message: string; committed_at: string }[] = [];
    const queue = reposNeedingCommits(
      repos.map((r) => ({ id: r.id, ignored: r.ignored, pushedAt: r.pushed_at, commitsSyncedAt: r.commits_synced_at })),
      today,
    );
    for (const state of queue) {
      if (!graphqlOk()) {
        stats.pending.push("commits");
        break;
      }
      const repo = repos.find((r) => r.id === state.id)!;
      const since = historySince(repo.commits_synced_at, now);
      let cursor: string | null = null;
      let complete = true;
      let found = 0;
      for (;;) {
        const res: HistoryResponse = await gh.graphql<HistoryResponse>(HISTORY_QUERY, {
          owner: repo.owner,
          name: repo.name,
          author: viewerNodeId,
          since,
          after: cursor,
        });
        const history = res.repository?.defaultBranchRef?.target?.history;
        if (!history) break; // repositório vazio
        const rows = history.nodes.map((c) => commitRow(c, repo.id, userId, timezone));
        if (rows.length) {
          const inserted = await must(
            db
              .from("commits")
              .upsert(rows, { onConflict: "repo_id,sha", ignoreDuplicates: true })
              .select("id, message, committed_at"),
          );
          newCommits.push(...inserted);
          found += inserted.length;
        }
        if (!history.pageInfo.hasNextPage) break;
        if (!graphqlOk()) {
          complete = false;
          break;
        }
        cursor = history.pageInfo.endCursor;
      }
      if (found) stats.reposWithNewCommits++;
      if (complete) {
        await must(db.from("repos").update({ commits_synced_at: now.toISOString() }).eq("id", repo.id));
      } else {
        stats.pending.push("commits");
        break;
      }
    }
    stats.commits = newCommits.length;

    // 4. Vínculos #T12 → tarefas
    if (newCommits.length) {
      const links = await applyTaskLinks(
        db,
        userId,
        newCommits.map((c) => ({ id: c.id, message: c.message, committedAt: c.committed_at })),
      );
      stats.tasksLinked = links.linked;
      stats.tasksClosed = links.closed;
    }

    // 5. Linguagens: arquivos alterados em cada commit (fila, mais recentes primeiro)
    const batch = trigger === "manual" ? 60 : 250;
    const pendingFiles = await must(
      db
        .from("commits")
        .select("id, sha, repo_id")
        .eq("user_id", userId)
        .is("files_fetched_at", null)
        .order("committed_at", { ascending: false })
        .limit(batch),
    );
    const repoById = new Map(repos.map((r) => [r.id, r]));
    for (const commit of pendingFiles) {
      if (!restOk()) {
        stats.pending.push("languages");
        break;
      }
      const repo = repoById.get(commit.repo_id);
      if (!repo) continue;
      const detail = await gh.rest<CommitDetail>(`/repos/${repo.owner}/${repo.name}/commits/${commit.sha}`);
      const totals = aggregateFiles(detail?.files ?? []);
      if (totals.length) {
        await must(
          db.from("commit_languages").upsert(
            totals.map((t) => ({ commit_id: commit.id, user_id: userId, ...t })),
            { onConflict: "commit_id,language" },
          ),
        );
      }
      await must(db.from("commits").update({ files_fetched_at: new Date().toISOString() }).eq("id", commit.id));
      stats.commitsDetailed++;
    }
    if (pendingFiles.length === batch && !stats.pending.includes("languages")) stats.pending.push("languages");

    // 6. Dependências dos repositórios que mudaram desde a última leitura
    const depsQueue = repos
      .filter((r) => !r.ignored && r.default_branch && r.pushed_at)
      .filter((r) => !r.deps_synced_at || r.pushed_at! > r.deps_synced_at)
      .filter((r) => r.pushed_at!.slice(0, 10) >= addDays(today, -365))
      .sort((a, b) => (b.pushed_at ?? "").localeCompare(a.pushed_at ?? ""))
      .slice(0, trigger === "manual" ? 8 : 30);
    for (const repo of depsQueue) {
      if (!restOk()) {
        stats.pending.push("dependencies");
        break;
      }
      const tree = await gh.rest<TreeResponse>(
        `/repos/${repo.owner}/${repo.name}/git/trees/${encodeURIComponent(repo.default_branch!)}?recursive=1`,
      );
      const manifests = findManifests((tree?.tree ?? []).filter((t) => t.type === "blob").map((t) => t.path));
      const rows: Database_Dependency[] = [];
      for (const path of manifests) {
        if (!restOk()) break;
        const text = await gh.rest<string>(
          `/repos/${repo.owner}/${repo.name}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(repo.default_branch!)}`,
          "application/vnd.github.raw+json",
        );
        if (!text) continue;
        stats.manifests++;
        for (const dep of parseManifest(path, text)) {
          rows.push({
            user_id: userId,
            repo_id: repo.id,
            ecosystem: dep.ecosystem,
            name: dep.name,
            version: dep.version,
            is_dev: dep.isDev,
            manifest_path: path,
          });
        }
      }
      await must(db.from("dependencies").delete().eq("repo_id", repo.id).eq("user_id", userId));
      if (rows.length) await must(db.from("dependencies").insert(rows));
      await must(db.from("repos").update({ deps_synced_at: new Date().toISOString() }).eq("id", repo.id));
      stats.dependencies += rows.length;
    }

    if (stats.pending.length) status = "partial";
  } catch (e) {
    status = "error";
    errorMessage = e instanceof GitHubError || e instanceof Error ? e.message : String(e);
  } finally {
    stats.pending = [...new Set(stats.pending)];
    await db
      .from("sync_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        stats: stats as unknown as Json,
        rate_limit_remaining: Number.isFinite(gh.graphqlRemaining) ? gh.graphqlRemaining : null,
        error: errorMessage ?? null,
      })
      .eq("id", run.id);
  }

  return { status, stats, error: errorMessage };
}

type Database_Dependency = {
  user_id: string;
  repo_id: string;
  ecosystem: string;
  name: string;
  version: string | null;
  is_dev: boolean;
  manifest_path: string;
};

/** Desembrulha a resposta do Supabase ou lança o erro. */
async function must<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as T;
}
