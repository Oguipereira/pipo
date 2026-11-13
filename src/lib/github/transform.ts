import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { addDays, localDate, type Day } from "../dates";
import type { CommitNode, ContributionLevel, ContributionsResponse, RepoNode } from "./queries";

// Funções puras que transformam respostas do GitHub em linhas do banco.

const LEVELS: Record<ContributionLevel, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export function contributionRows(data: ContributionsResponse, userId: string) {
  return data.viewer.contributionsCollection.contributionCalendar.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({
      user_id: userId,
      date: d.date,
      count: d.contributionCount,
      level: LEVELS[d.contributionLevel] ?? 0,
    })),
  );
}

export function repoRow(node: RepoNode, userId: string) {
  return {
    user_id: userId,
    github_id: node.databaseId,
    full_name: node.nameWithOwner,
    name: node.name,
    owner: node.owner.login,
    url: node.url,
    description: node.description,
    default_branch: node.defaultBranchRef?.name ?? null,
    is_private: node.isPrivate,
    is_fork: node.isFork,
    is_archived: node.isArchived,
    primary_language: node.primaryLanguage?.name ?? null,
    pushed_at: node.pushedAt,
  };
}

export function repoLanguageRows(node: RepoNode, repoId: string, userId: string) {
  return node.languages.edges.map((e) => ({
    repo_id: repoId,
    user_id: userId,
    language: e.node.name,
    color: e.node.color,
    bytes: e.size,
  }));
}

/** Commit → linha do banco, com o dia calculado no fuso do usuário (docs/SPEC.md §3). */
export function commitRow(node: CommitNode, repoId: string, userId: string, timeZone: string) {
  return {
    user_id: userId,
    repo_id: repoId,
    sha: node.oid,
    message: node.message,
    committed_at: node.authoredDate,
    local_date: localDate(node.authoredDate, timeZone),
    url: node.url,
    additions: node.additions,
    deletions: node.deletions,
  };
}

/** Início do intervalo do calendário de contribuições, com o offset do fuso do usuário. */
export function dayStartIso(day: Day, timeZone: string): string {
  const offset = format(new Date(`${day}T12:00:00Z`), "xxx", { in: tz(timeZone) });
  return `${day}T00:00:00${offset}`;
}

export function dayEndIso(day: Day, timeZone: string): string {
  const offset = format(new Date(`${day}T12:00:00Z`), "xxx", { in: tz(timeZone) });
  return `${day}T23:59:59${offset}`;
}

export type RepoSyncState = {
  id: string;
  ignored: boolean;
  pushedAt: string | null;
  commitsSyncedAt: string | null;
};

/** Repositórios cujo histórico precisa ser (re)buscado: novos ou com push desde a última vez. */
export function reposNeedingCommits(repos: RepoSyncState[], today: Day, backfillDays = 365): RepoSyncState[] {
  const cutoff = addDays(today, -backfillDays);
  return repos
    .filter((r) => !r.ignored && r.pushedAt)
    .filter((r) => r.pushedAt!.slice(0, 10) >= cutoff)
    .filter((r) => !r.commitsSyncedAt || r.pushedAt! > r.commitsSyncedAt)
    .sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""));
}

/**
 * Desde quando buscar commits: 1 ano na primeira vez; depois, desde a última
 * sincronização com 2 dias de folga (commits com data de autoria antiga chegam atrasados).
 */
export function historySince(commitsSyncedAt: string | null, now: Date, backfillDays = 365): string {
  const base = commitsSyncedAt ? new Date(commitsSyncedAt) : new Date(now.getTime() - backfillDays * 86_400_000);
  const since = commitsSyncedAt ? new Date(base.getTime() - 2 * 86_400_000) : base;
  return since.toISOString();
}

/** Primeira linha da mensagem do commit. */
export function commitTitle(message: string): string {
  return message.split("\n", 1)[0].trim();
}
