import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { syncUser } from "./sync";
import type { AdminClient } from "../supabase/admin";

// ---------------------------------------------------------------------------
// Banco em memória com o subconjunto da API do supabase-js usado pela sincronização.
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

const KEYS: Record<string, string[]> = {
  repos: ["user_id", "github_id"],
  commits: ["repo_id", "sha"],
  contribution_days: ["user_id", "date"],
  commit_languages: ["commit_id", "language"],
  task_commits: ["task_id", "commit_id"],
};

function fakeDb(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = { ...seed };
  let seq = 0;
  const table = (name: string) => (tables[name] ??= []);

  function builder(name: string) {
    let op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
    let payload: Row[] = [];
    let values: Row = {};
    let opts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
    const filters: ((r: Row) => boolean)[] = [];
    let limit = Infinity;
    let returning = false;
    let single = false;

    const api = {
      select() {
        if (op !== "select") returning = true;
        return api;
      },
      insert(rows: Row | Row[]) {
        op = "insert";
        payload = Array.isArray(rows) ? rows : [rows];
        return api;
      },
      upsert(rows: Row[], o: typeof opts = {}) {
        op = "upsert";
        payload = rows;
        opts = o;
        return api;
      },
      update(v: Row) {
        op = "update";
        values = v;
        return api;
      },
      delete() {
        op = "delete";
        return api;
      },
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), api),
      neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), api),
      in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), api),
      is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), api),
      lt: (c: string, v: string) => (filters.push((r) => String(r[c]) < v), api),
      order: () => api,
      limit: (n: number) => ((limit = n), api),
      single: () => ((single = true), api),
      maybeSingle: () => ((single = true), api),
      then(resolve: (v: { data: unknown; error: null }) => void) {
        resolve(run());
      },
    };

    function run() {
      const rows = table(name);
      let data: Row[] = [];
      if (op === "select") data = rows.filter((r) => filters.every((f) => f(r))).slice(0, limit);
      if (op === "insert") {
        data = payload.map((p) => ({ id: `id${++seq}`, status: "running", ...p }));
        rows.push(...data);
      }
      if (op === "upsert") {
        const keys = (opts.onConflict ?? KEYS[name].join(",")).split(",");
        for (const p of payload) {
          const existing = rows.find((r) => keys.every((k) => r[k] === p[k]));
          if (existing) {
            if (!opts.ignoreDuplicates) {
              Object.assign(existing, p);
              data.push(existing);
            }
          } else {
            const row = { id: `id${++seq}`, ignored: false, commits_synced_at: null, deps_synced_at: null, files_fetched_at: null, ...p };
            rows.push(row);
            data.push(row);
          }
        }
      }
      if (op === "update") {
        data = rows.filter((r) => filters.every((f) => f(r)));
        data.forEach((r) => Object.assign(r, values));
      }
      if (op === "delete") {
        const keep = rows.filter((r) => !filters.every((f) => f(r)));
        tables[name] = keep;
      }
      const out = op === "select" || returning ? data : null;
      return { data: single ? (out?.[0] ?? null) : out, error: null };
    }
    return api;
  }

  return { db: { from: builder } as unknown as AdminClient, tables };
}

// ---------------------------------------------------------------------------
// GitHub simulado
// ---------------------------------------------------------------------------
function fakeGitHub() {
  const sha = (n: number) => String(n).repeat(40).slice(0, 40);
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "x-ratelimit-remaining": "4900" } });
    if (url.endsWith("/graphql")) {
      const { query } = JSON.parse(String(init?.body));
      if (query.includes("contributionsCollection")) {
        return json({
          data: {
            viewer: {
              id: "U_me",
              databaseId: 1,
              login: "me",
              contributionsCollection: {
                contributionCalendar: {
                  totalContributions: 3,
                  weeks: [{ contributionDays: [{ date: "2026-11-11", contributionCount: 3, contributionLevel: "THIRD_QUARTILE" }] }],
                },
              },
            },
            rateLimit: { remaining: 4990, resetAt: null },
          },
        });
      }
      if (query.includes("repositories(")) {
        return json({
          data: {
            viewer: {
              repositories: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    databaseId: 10,
                    name: "pipo",
                    nameWithOwner: "me/pipo",
                    url: "https://github.com/me/pipo",
                    description: null,
                    isPrivate: false,
                    isFork: false,
                    isArchived: false,
                    pushedAt: new Date().toISOString(),
                    owner: { login: "me" },
                    defaultBranchRef: { name: "main" },
                    primaryLanguage: { name: "TypeScript" },
                    languages: { edges: [{ size: 100, node: { name: "TypeScript", color: "#3178c6" } }] },
                  },
                ],
              },
            },
          },
        });
      }
      if (query.includes("history(")) {
        return json({
          data: {
            repository: {
              defaultBranchRef: {
                target: {
                  history: {
                    pageInfo: { hasNextPage: false, endCursor: null },
                    nodes: [
                      // 23h30 em São Paulo de 10/11 (02:30 UTC de 11/11)
                      { oid: sha(1), message: "feat: login #T1", authoredDate: "2026-11-11T02:30:00Z", url: "u1", additions: 10, deletions: 1 },
                      { oid: sha(2), message: "docs", authoredDate: "2026-11-11T15:00:00Z", url: "u2", additions: 2, deletions: 0 },
                    ],
                  },
                },
              },
            },
          },
        });
      }
    }
    if (url.includes("/commits/")) {
      return json({ sha: "x", files: [{ filename: "src/a.ts", additions: 10, deletions: 1, status: "modified" }] });
    }
    if (url.includes("/git/trees/")) {
      return json({ truncated: false, tree: [{ path: "package.json", type: "blob" }, { path: "src/a.ts", type: "blob" }] });
    }
    if (url.includes("/contents/package.json")) {
      return new Response(JSON.stringify({ dependencies: { next: "16.4.6" }, devDependencies: { vitest: "5.1.0" } }), {
        status: 200,
        headers: { "x-ratelimit-remaining": "4800" },
      });
    }
    return new Response("not found", { status: 404 });
  });
  return fetchImpl as unknown as typeof fetch;
}

describe("syncUser", () => {
  it("sincroniza contribuições, repositórios, commits, linguagens, dependências e #T", async () => {
    const { db, tables } = fakeDb({
      categories: [{ id: "cat-code", user_id: "u", is_code: true }],
      tasks: [{ id: "task-1", user_id: "u", number: 1, status: "todo", category_id: "cat-code", projects: null }],
    });

    const result = await syncUser({
      db,
      userId: "u",
      timezone: "America/Sao_Paulo",
      token: "t",
      trigger: "manual",
      budgetMs: 60_000,
      fetchImpl: fakeGitHub(),
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe("ok");
    expect(tables.contribution_days).toMatchObject([{ user_id: "u", date: "2026-11-11", count: 3, level: 3 }]);
    expect(tables.repos).toHaveLength(1);
    expect(tables.repos[0].commits_synced_at).toBeTruthy();
    expect(tables.repo_languages).toHaveLength(1);

    // dia local no fuso do usuário
    expect(tables.commits.map((c) => c.local_date).sort()).toEqual(["2026-11-10", "2026-11-11"]);
    expect(tables.commits.every((c) => c.files_fetched_at)).toBe(true);
    expect(tables.commit_languages.map((l) => l.language)).toEqual(["TypeScript", "TypeScript"]);

    expect(tables.dependencies.map((d) => [d.name, d.is_dev])).toEqual([
      ["next", false],
      ["vitest", true],
    ]);

    // #T1 vinculou e concluiu a tarefa de programação
    expect(tables.task_commits).toHaveLength(1);
    expect(tables.tasks[0]).toMatchObject({ status: "done", done_via: "commit", done_at: "2026-11-11T02:30:00Z" });

    expect(tables.sync_runs[0]).toMatchObject({ status: "ok", trigger: "manual" });
    expect(result.stats).toMatchObject({ commits: 2, commitsDetailed: 2, dependencies: 2, tasksLinked: 1, tasksClosed: 1 });
  });

  it("segunda execução não duplica commits nem refaz vínculos", async () => {
    const { db, tables } = fakeDb({
      categories: [{ id: "cat-code", user_id: "u", is_code: true }],
      tasks: [{ id: "task-1", user_id: "u", number: 1, status: "todo", category_id: "cat-code", projects: null }],
    });
    const opts = { db, userId: "u", timezone: "America/Sao_Paulo", token: "t", trigger: "manual" as const, budgetMs: 60_000 };
    await syncUser({ ...opts, fetchImpl: fakeGitHub() });
    // usuário reabre a tarefa e o repositório recebe push de novo
    tables.tasks[0].status = "todo";
    tables.repos[0].commits_synced_at = "2000-01-01T00:00:00Z";
    const second = await syncUser({ ...opts, fetchImpl: fakeGitHub() });

    expect(second.stats.commits).toBe(0);
    expect(tables.commits).toHaveLength(2);
    expect(tables.task_commits).toHaveLength(1);
    expect(tables.tasks[0].status).toBe("todo");
  });

  it("registra erro do GitHub sem lançar", async () => {
    const { db, tables } = fakeDb();
    const fetchImpl = vi.fn(async () => new Response("bad", { status: 401 })) as unknown as typeof fetch;
    const result = await syncUser({
      db,
      userId: "u",
      timezone: "UTC",
      token: "t",
      trigger: "cron",
      budgetMs: 60_000,
      fetchImpl,
    });
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/Token do GitHub inválido/);
    expect(tables.sync_runs[0]).toMatchObject({ status: "error" });
  });
});
