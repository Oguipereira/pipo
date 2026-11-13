import "server-only";
import { addDays, today, weekday, DEFAULT_TIMEZONE, type Day } from "./dates";
import type { Habit, HabitLog } from "./habits";
import type { Category } from "./data/habits";
import { sampleContributions } from "./sample";

/**
 * Modo demonstração (só desenvolvimento): `PIPO_DEMO=1 npm run dev`.
 * As funções de dados devolvem um conjunto fictício e determinístico, sem banco
 * nem login. Usado para prints do README e revisão visual. Nunca liga em produção.
 */
export const DEMO =
  process.env.PIPO_DEMO === "1" && process.env.NODE_ENV !== "production" && !process.env.VERCEL;

export const demoToday = (): Day => today(DEFAULT_TIMEZONE);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const demoCategories: Category[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Programação", color: "#39d353", isCode: true },
  { id: "00000000-0000-4000-8000-000000000002", name: "Estudos", color: "#58a6ff", isCode: false },
  { id: "00000000-0000-4000-8000-000000000003", name: "Saúde", color: "#f778ba", isCode: false },
  { id: "00000000-0000-4000-8000-000000000004", name: "Pessoal", color: "#d29922", isCode: false },
];

const [PROG, EST, SAUDE, PESSOAL] = demoCategories.map((c) => c.id);

const habit = (n: number, h: Omit<Habit, "id" | "archivedAt" | "position">): Habit => ({
  id: `00000000-0000-4000-9000-00000000000${n}`,
  archivedAt: null,
  position: n,
  ...h,
});

export const demoHabits: Habit[] = [
  habit(1, { name: "Água", kind: "quantity", target: 8, unit: "copos", scheduleDays: 127, startDate: "2026-05-01", categoryId: SAUDE }),
  habit(2, { name: "Academia", kind: "boolean", target: null, unit: null, scheduleDays: 62, startDate: "2026-06-01", categoryId: SAUDE }),
  habit(3, { name: "Estudar programação", kind: "github", target: null, unit: null, scheduleDays: 62, startDate: "2026-04-01", categoryId: PROG }),
  habit(4, { name: "Leitura", kind: "quantity", target: 20, unit: "páginas", scheduleDays: 127, startDate: "2026-07-15", categoryId: PESSOAL }),
  habit(5, { name: "Inglês", kind: "quantity", target: 30, unit: "min", scheduleDays: 0b0101010, startDate: "2026-08-01", categoryId: EST }),
];

export function demoCommitCounts(): Map<Day, number> {
  return sampleContributions(demoToday(), 371, 7);
}

export function demoLogs(): HabitLog[] {
  const rand = rng(42);
  const end = demoToday();
  const logs: HabitLog[] = [];
  for (const h of demoHabits) {
    for (let d = h.startDate; d <= end; d = addDays(d, 1)) {
      if (h.kind === "github") continue;
      const wd = weekday(d);
      if (!(h.scheduleDays & (1 << wd))) continue;
      // Hoje: só alguns já marcados, para o check-in parecer um dia real.
      if (d === end && h.position > 2) continue;
      const r = rand();
      if (r < 0.2) continue;
      const target = h.target ?? 1;
      const value = h.kind === "boolean" ? 1 : r > 0.55 ? target : Math.max(1, Math.round(target * r));
      logs.push({ habitId: h.id, date: d, value, targetSnapshot: h.target });
    }
  }
  return logs;
}

// ---------------------------------------------------------------------------
// GitHub (repositórios, commits, linguagens, bibliotecas)
// ---------------------------------------------------------------------------

const DEMO_REPOS = [
  { id: "00000000-0000-4000-a000-000000000001", fullName: "demo/pipo", primaryLanguage: "TypeScript", weight: 5 },
  { id: "00000000-0000-4000-a000-000000000002", fullName: "demo/financas-api", primaryLanguage: "Python", weight: 3 },
  { id: "00000000-0000-4000-a000-000000000003", fullName: "demo/portfolio", primaryLanguage: "TypeScript", weight: 2 },
  { id: "00000000-0000-4000-a000-000000000004", fullName: "demo/estudos-go", primaryLanguage: "Go", weight: 1 },
  { id: "00000000-0000-4000-a000-000000000005", fullName: "demo/dotfiles", primaryLanguage: "Shell", weight: 0 },
];

export function demoRepos() {
  return DEMO_REPOS.map((r, i) => ({
    id: r.id,
    fullName: r.fullName,
    url: `https://github.com/${r.fullName}`,
    isPrivate: i === 1,
    isFork: false,
    ignored: r.weight === 0,
    primaryLanguage: r.primaryLanguage,
    pushedAt: `${addDays(demoToday(), -i * 3)}T18:00:00Z`,
  }));
}

const MESSAGES = [
  "feat: check-in com um toque #T3",
  "fix: dia local no fuso do usuário",
  "refactor: extrai cálculo de streak",
  "feat: heatmap por hábito",
  "chore: atualiza dependências",
  "test: casos de agenda seg–sex",
  "feat: endpoint de transações",
  "fix: paginação da lista de commits",
  "docs: README com prints",
  "feat: gráfico radial de linguagens #T7",
  "style: espaçamentos no celular",
  "feat: parser de pyproject.toml",
];

let demoCommitCache: { key: string; list: (import("./data/github").CommitItem & { repoId: string })[] } | null = null;

function demoCommitList() {
  const key = demoToday();
  if (demoCommitCache?.key === key) return demoCommitCache.list;
  const rand = rng(99);
  const active = DEMO_REPOS.filter((r) => r.weight > 0);
  const totalWeight = active.reduce((s, r) => s + r.weight, 0);
  const list: (import("./data/github").CommitItem & { repoId: string })[] = [];
  let n = 0;
  for (const [day, count] of demoCommitCounts()) {
    for (let i = 0; i < count; i++) {
      let pick = rand() * totalWeight;
      const repo = active.find((r) => (pick -= r.weight) < 0) ?? active[0];
      // 9h–20h em São Paulo = 12h–23h UTC, sempre no mesmo dia.
      const hour = 9 + Math.floor(rand() * 12);
      const sha = (++n).toString(16).padStart(8, "0").repeat(5);
      list.push({
        id: `demo-${n}`,
        sha,
        message: MESSAGES[Math.floor(rand() * MESSAGES.length)],
        committedAt: `${day}T${String(hour + 3).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00Z`,
        localDate: day,
        url: `https://github.com/${repo.fullName}/commit/${sha}`,
        additions: Math.floor(rand() * 120),
        deletions: Math.floor(rand() * 40),
        repo: repo.fullName,
        repoId: repo.id,
      });
    }
  }
  list.sort((a, b) => b.committedAt.localeCompare(a.committedAt));
  demoCommitCache = { key, list };
  return list;
}

export function demoCommitPage(opts: { from: Day; to: Day; repoIds?: string[]; page?: number; search?: string }) {
  const page = opts.page ?? 0;
  const filtered = demoCommitList().filter(
    (c) =>
      c.localDate >= opts.from &&
      c.localDate <= opts.to &&
      (!opts.repoIds?.length || opts.repoIds.includes(c.repoId)) &&
      (!opts.search || c.message.toLowerCase().includes(opts.search.toLowerCase())),
  );
  return { total: filtered.length, items: filtered.slice(page * 40, page * 40 + 40) };
}

export function demoRepoActivity(from: Day, to: Day) {
  const map = new Map<string, { repoId: string; fullName: string; commits: number; lastCommitAt: string | null }>();
  for (const c of demoCommitList()) {
    if (c.localDate < from || c.localDate > to) continue;
    const r = map.get(c.repoId) ?? { repoId: c.repoId, fullName: c.repo, commits: 0, lastCommitAt: c.committedAt };
    r.commits++;
    map.set(c.repoId, r);
  }
  return [...map.values()].sort((a, b) => b.commits - a.commits);
}

export function demoLanguageShares() {
  const shares = [
    { language: "TypeScript", lines: 48210, commits: 640 },
    { language: "Python", lines: 21330, commits: 310 },
    { language: "SQL", lines: 6120, commits: 95 },
    { language: "CSS", lines: 5400, commits: 180 },
    { language: "Go", lines: 3900, commits: 60 },
    { language: "Shell", lines: 1200, commits: 40 },
    { language: "Dockerfile", lines: 420, commits: 18 },
    { language: "Markdown", lines: 3100, commits: 120 },
    { language: "JSON", lines: 2500, commits: 150 },
  ];
  return { source: "commits" as const, coverage: { detailed: 1180, total: 1296 }, shares };
}

export function demoLanguageMonthly() {
  const rand = rng(5);
  const out: { month: Day; language: string; lines: number }[] = [];
  const end = demoToday();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(`${end.slice(0, 7)}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - i);
    const month = d.toISOString().slice(0, 10);
    out.push({ month, language: "TypeScript", lines: Math.round(2500 + rand() * 3000) });
    out.push({ month, language: "Python", lines: Math.round((i < 6 ? 2600 : 700) * (0.6 + rand())) });
    out.push({ month, language: "SQL", lines: Math.round(300 + rand() * 700) });
    out.push({ month, language: "CSS", lines: Math.round(200 + rand() * 600) });
    if (i < 4) out.push({ month, language: "Go", lines: Math.round(600 + rand() * 900) });
  }
  return out;
}

export function demoLibraries() {
  const lib = (ecosystem: "npm" | "pypi", name: string, repos: number, weight: number, devOnly = false) => ({
    ecosystem,
    name,
    repos,
    activeRepos: repos,
    weight,
    devOnly,
  });
  return [
    lib("npm", "react", 3, 1050),
    lib("npm", "next", 2, 980),
    lib("npm", "typescript", 3, 1050, true),
    lib("npm", "tailwindcss", 2, 980),
    lib("npm", "@supabase/supabase-js", 2, 880),
    lib("npm", "zod", 2, 880),
    lib("npm", "date-fns", 1, 640),
    lib("npm", "vitest", 2, 880, true),
    lib("npm", "eslint", 3, 1050, true),
    lib("npm", "framer-motion", 1, 240),
    lib("pypi", "fastapi", 1, 310),
    lib("pypi", "sqlalchemy", 1, 310),
    lib("pypi", "pydantic", 1, 310),
    lib("pypi", "pandas", 1, 310),
    lib("pypi", "pytest", 1, 310, true),
    lib("pypi", "ruff", 1, 310, true),
  ];
}

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------

export function demoProjects(): import("./data/projects").Project[] {
  const today = demoToday();
  const t = (
    n: number,
    title: string,
    milestoneId: string | null,
    status: "todo" | "doing" | "done",
    position: number,
    extra: { dueInDays?: number; via?: "commit" | "manual" } = {},
  ) => ({
    id: `00000000-0000-4000-b000-${String(n).padStart(12, "0")}`,
    number: n,
    title,
    notes: null,
    status,
    dueDate: extra.dueInDays != null ? addDays(today, extra.dueInDays) : null,
    milestoneId,
    categoryId: null,
    position,
    doneAt: status === "done" ? `${addDays(today, -n)}T18:00:00Z` : null,
    doneVia: status === "done" ? (extra.via ?? "manual") : null,
  });
  const m = (id: string, title: string, position: number) => ({ id, title, position, dueDate: null });
  return [
    {
      id: "00000000-0000-4000-c000-000000000001",
      name: "pipo",
      description: "Hábitos, código e projetos de dev num quadradinho por dia.",
      status: "active",
      color: "#39d353",
      categoryId: demoCategories[0].id,
      position: 0,
      repoIds: [DEMO_REPOS[0].id],
      milestones: [m("m-1", "Fundação", 0), m("m-2", "Hábitos e GitHub", 1), m("m-3", "Lançamento", 2)],
      tasks: [
        t(1, "Login com GitHub e allowlist", "m-1", "done", 0, { via: "commit" }),
        t(2, "Tema escuro e heatmap", "m-1", "done", 1),
        t(3, "Check-in com um toque", "m-2", "done", 0, { via: "commit" }),
        t(4, "Sincronização incremental", "m-2", "doing", 1, { dueInDays: 2 }),
        t(5, "Relatório mensal", "m-3", "todo", 0, { dueInDays: 9 }),
        t(6, "README com prints", "m-3", "todo", 1),
      ],
    },
    {
      id: "00000000-0000-4000-c000-000000000002",
      name: "API de finanças",
      description: "FastAPI + Postgres para controlar gastos.",
      status: "active",
      color: "#58a6ff",
      categoryId: demoCategories[0].id,
      position: 1,
      repoIds: [DEMO_REPOS[1].id],
      milestones: [m("m-4", "Transações", 0)],
      tasks: [
        t(7, "Endpoint de transações", "m-4", "done", 0, { via: "commit" }),
        t(8, "Importar extrato OFX", "m-4", "todo", 1, { dueInDays: -1 }),
        t(9, "Categorias automáticas", null, "todo", 0),
      ],
    },
    {
      id: "00000000-0000-4000-c000-000000000003",
      name: "Portfólio",
      description: null,
      status: "paused",
      color: "#d29922",
      categoryId: null,
      position: 2,
      repoIds: [DEMO_REPOS[2].id],
      milestones: [],
      tasks: [t(10, "Página de projetos", null, "todo", 0)],
    },
  ];
}

export function demoProjectCommitCounts(projectId: string, from: Day, to: Day) {
  const repoIds = demoProjects().find((p) => p.id === projectId)?.repoIds ?? [];
  const map = new Map<Day, number>();
  for (const c of demoCommitList()) {
    if (!repoIds.includes(c.repoId) || c.localDate < from || c.localDate > to) continue;
    map.set(c.localDate, (map.get(c.localDate) ?? 0) + 1);
  }
  return map;
}

export function demoProjectActivity(from: Day, to: Day) {
  const map = new Map<string, { commits: number; lastCommitAt: string | null }>();
  for (const p of demoProjects()) {
    const commits = demoCommitList().filter((c) => p.repoIds.includes(c.repoId) && c.localDate >= from && c.localDate <= to);
    map.set(p.id, { commits: commits.length, lastCommitAt: commits[0]?.committedAt ?? null });
  }
  return map;
}
