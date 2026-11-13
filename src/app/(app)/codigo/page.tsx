import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { addDays, today as todayIn, type Day } from "@/lib/dates";
import { DEMO } from "@/lib/demo";
import { getCommitCounts } from "@/lib/data/habits";
import {
  COMMITS_PAGE,
  getCommits,
  getLanguageMonthly,
  getLanguageShares,
  getLastSync,
  getLibraryOverrides,
  getLibraryUsage,
  getRepoActivity,
  getRepos,
} from "@/lib/data/github";
import { compact, fmtShortDay, fmtTime, plural, relativeTime } from "@/lib/format";
import { commitTitle } from "@/lib/github/transform";
import { isGitHubConfigured } from "@/lib/github/token";
import { buildGrid, levelFromCount } from "@/lib/heatmap";
import { areaOf, isCodeLanguage, LANGUAGE_COLORS } from "@/lib/languages";
import { LIBRARY_CATEGORIES, libraryCategory } from "@/lib/libraries";
import { computeStreaks } from "@/lib/streak";
import { Heatmap, HeatLegend } from "@/components/heatmap";
import { LibraryCategorySelect } from "@/components/library-category-select";
import { PageHeader } from "@/components/page-header";
import { RadialChart } from "@/components/radial-chart";
import { SyncButton } from "@/components/sync-button";
import { setRepoIgnored } from "./actions";

export const metadata: Metadata = { title: "código" };

type Query = Record<string, string | string[] | undefined>;

// Classes explícitas para o Tailwind gerar todas.
const HEAT_BG = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];

const TABS = [
  { key: "commits", label: "commits" },
  { key: "linguagens", label: "linguagens" },
  { key: "bibliotecas", label: "bibliotecas" },
  { key: "repositorios", label: "repositórios" },
] as const;

export default function CodePage({ searchParams }: PageProps<"/codigo">) {
  return (
    <div className="space-y-12">
      <PageHeader path="código" />
      <Suspense fallback={<div className="h-64" aria-busy />}>
        <Code searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Code({ searchParams }: { searchParams: Promise<Query> }) {
  const [viewer, query] = await Promise.all([getViewer(), searchParams]);
  const today = todayIn(viewer.timezone);
  const yearStart = addDays(today, -364);
  const tab = TABS.find((t) => t.key === query.aba)?.key ?? "commits";
  const configured = DEMO || isGitHubConfigured();

  const [lastSync, counts, activity] = await Promise.all([
    getLastSync(),
    getCommitCounts(yearStart, today),
    getRepoActivity(yearStart, today),
  ]);
  const max = Math.max(1, ...counts.values());
  const grid = buildGrid(today, (day) => {
    const n = counts.get(day) ?? 0;
    return { level: levelFromCount(n, max), label: `${plural(n, "commit")} em ${fmtShortDay(day)}` };
  });
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  const streak = computeStreaks((d) => (counts.get(d) ?? 0) > 0, { start: yearStart, today });

  return (
    <>
      <SyncStatus configured={configured} lastSync={lastSync} />

      <section aria-label="Seus commits no último ano">
        <p className="num text-[44px] leading-none font-medium text-chalk md:text-[52px]">{total.toLocaleString("pt-BR")}</p>
        <p className="mt-2 text-[15px] text-dust">commits seus no último ano</p>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
          <Fact k="dias com commit" v={String(streak.activeDays)} />
          <Fact k="recorde" v={plural(streak.best, "dia")} />
          {activity[0] ? <Fact k="mais ativo" v={activity[0].fullName.split("/").pop()!} /> : null}
        </dl>
        <div className="mt-7">
          <Heatmap grid={grid} label="Seus commits por dia no último ano" highlight={today} sweep />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-faint">
          <span>Cada dia no seu fuso ({viewer.timezone}).</span>
          <HeatLegend />
        </div>
      </section>

      <nav aria-label="Seções de código" className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <ul className="flex gap-6 border-b border-seam/70">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "commits" ? "/codigo" : `/codigo?aba=${t.key}`}
                scroll={false}
                aria-current={tab === t.key ? "page" : undefined}
                className={`-mb-px block whitespace-nowrap border-b pb-2.5 text-[14px] ${
                  tab === t.key ? "border-heat-3 text-chalk" : "border-transparent text-faint hover:text-dust"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "commits" ? <CommitsTab query={query} today={today} timezone={viewer.timezone} /> : null}
      {tab === "linguagens" ? <LanguagesTab query={query} today={today} /> : null}
      {tab === "bibliotecas" ? <LibrariesTab query={query} today={today} /> : null}
      {tab === "repositorios" ? <ReposTab today={today} /> : null}
    </>
  );
}

function SyncStatus({ configured, lastSync }: { configured: boolean; lastSync: Awaited<ReturnType<typeof getLastSync>> }) {
  if (!configured) {
    return (
      <div className="max-w-prose space-y-2 border-l-2 border-alert/60 pl-4 text-[14px] leading-relaxed text-dust">
        <p className="text-chalk">O GitHub ainda não está conectado.</p>
        <p>
          Configure <code className="text-chalk">GITHUB_TOKEN</code> (token fine-grained, somente leitura) e{" "}
          <code className="text-chalk">SUPABASE_SECRET_KEY</code> nas variáveis de ambiente da Vercel. O passo a passo
          está no README.
        </p>
      </div>
    );
  }
  const when = lastSync?.finishedAt ?? lastSync?.startedAt;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-[13px] text-faint">
        {lastSync ? (
          <>
            {lastSync.status === "error" ? (
              <span className="text-alert">Última sincronização falhou: {lastSync.error}</span>
            ) : lastSync.status === "running" ? (
              "Sincronizando…"
            ) : (
              <>
                Sincronizado {when ? relativeTime(when) : ""}
                {lastSync.status === "partial" ? ", com itens na fila para a próxima rodada" : ""}.
              </>
            )}{" "}
            Atualiza sozinho a cada 4 horas.
          </>
        ) : DEMO ? (
          "Modo demonstração."
        ) : (
          "Ainda não sincronizado. A primeira vez traz o último ano e pode levar alguns minutos."
        )}
      </p>
      <SyncButton disabled={DEMO} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commits
// ---------------------------------------------------------------------------

const PERIODS = [
  { key: "7", label: "7 dias", days: 7 },
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
  { key: "365", label: "1 ano", days: 365 },
];

async function CommitsTab({ query, today, timezone }: { query: Query; today: Day; timezone: string }) {
  const period = PERIODS.find((p) => p.key === query.periodo) ?? PERIODS[1];
  const repoId = typeof query.repo === "string" ? query.repo : "";
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const page = Math.max(0, Number(query.p) || 0);
  const from = addDays(today, -(period.days - 1));
  const [repos, { items, total }] = await Promise.all([
    getRepos(),
    getCommits({ from, to: today, repoIds: repoId ? [repoId] : undefined, page, search: search || undefined }),
  ]);

  const byDay = new Map<Day, typeof items>();
  for (const c of items) byDay.set(c.localDate, [...(byDay.get(c.localDate) ?? []), c]);
  const params = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (period.key !== "30") p.set("periodo", period.key);
    if (repoId) p.set("repo", repoId);
    if (search) p.set("q", search);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `/codigo?${p.toString()}`;
  };

  return (
    <section aria-label="Commits" className="space-y-6">
      <form action="/codigo" className="flex flex-wrap items-center gap-3 text-[13px]">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <label key={p.key} className="cursor-pointer">
              <input type="radio" name="periodo" value={p.key} defaultChecked={p.key === period.key} className="peer sr-only" />
              <span className="block rounded-[3px] px-2.5 py-1.5 text-faint peer-checked:bg-heat-0 peer-checked:text-chalk peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-heat-4">
                {p.label}
              </span>
            </label>
          ))}
        </div>
        <select
          name="repo"
          defaultValue={repoId}
          aria-label="Repositório"
          className="h-8 max-w-48 rounded-[3px] border border-seam bg-ink px-2 text-dust"
        >
          <option value="">todos os repositórios</option>
          {repos
            .filter((r) => !r.ignored)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
        </select>
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="buscar na mensagem"
          className="h-8 w-44 rounded-[3px] border border-seam bg-transparent px-2 text-chalk placeholder:text-faint"
        />
        <button type="submit" className="h-8 rounded-[3px] bg-heat-0 px-3 text-chalk hover:bg-seam">
          Filtrar
        </button>
      </form>

      <p className="text-[13px] text-faint">{plural(total, "commit")} no período.</p>

      {items.length === 0 ? (
        <p className="text-[15px] text-dust">Nenhum commit encontrado com esses filtros.</p>
      ) : (
        <div className="space-y-7">
          {[...byDay].map(([day, commits]) => (
            <div key={day}>
              <h3 className="mb-1 text-[12px] text-faint">{day === today ? "hoje" : fmtShortDay(day)}</h3>
              <ul className="divide-y divide-seam/50">
                {commits.map((c) => (
                  <li key={c.id} className="py-2.5">
                    <a href={c.url} target="_blank" rel="noreferrer" className="group block">
                      <span className="block truncate text-[14px] text-chalk group-hover:underline group-hover:decoration-seam group-hover:underline-offset-4">
                        {commitTitle(c.message)}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-faint">
                        <span>{c.repo.split("/").pop()}</span>
                        <span className="num">{fmtTime(c.committedAt, timezone)}</span>
                        <span className="num">{c.sha.slice(0, 7)}</span>
                        <span className="num">
                          <span className="text-heat-3">+{c.additions}</span> −{c.deletions}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between text-[14px]">
        {page > 0 ? (
          <Link href={params({ p: String(page - 1) })} className="text-dust hover:text-chalk">
            ← mais recentes
          </Link>
        ) : (
          <span />
        )}
        {(page + 1) * COMMITS_PAGE < total ? (
          <Link href={params({ p: String(page + 1) })} className="text-dust hover:text-chalk">
            mais antigos →
          </Link>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Linguagens
// ---------------------------------------------------------------------------

async function LanguagesTab({ query, today }: { query: Query; today: Day }) {
  const days = query.periodo === "90" ? 90 : 365;
  const from = addDays(today, -(days - 1));
  const [{ shares, source, coverage }, monthly] = await Promise.all([
    getLanguageShares(from, today),
    getLanguageMonthly(addDays(today, -364), today),
  ]);
  const code = shares.filter((s) => isCodeLanguage(s.language));
  const totalLines = code.reduce((s, l) => s + l.lines, 0);

  if (code.length === 0) {
    return <p className="text-[15px] text-dust">As linguagens aparecem aqui depois da primeira sincronização com commits.</p>;
  }

  const top = code.slice(0, 8);
  const rest = code.slice(8).reduce((s, l) => s + l.lines, 0);
  const slices = [
    ...top.map((l) => ({ label: l.language, value: l.lines, color: LANGUAGE_COLORS[l.language] })),
    ...(rest > 0 ? [{ label: "outras", value: rest, color: "#7f8894" }] : []),
  ];

  const areas = new Map<string, number>();
  for (const l of code) areas.set(areaOf(l.language), (areas.get(areaOf(l.language)) ?? 0) + l.lines);
  const areaList = [...areas].sort((a, b) => b[1] - a[1]);

  // Linguagem × mês: um quadradinho por mês, intensidade = fatia daquele mês.
  const months = [...new Set(monthly.map((m) => m.month))].sort();
  const monthTotals = new Map(months.map((m) => [m, monthly.filter((x) => x.month === m && isCodeLanguage(x.language)).reduce((s, x) => s + x.lines, 0)]));
  const evolutionLangs = top.slice(0, 5).map((l) => l.language);

  return (
    <section aria-label="Linguagens" className="space-y-12">
      <div className="flex gap-4 text-[13px]">
        <Link href="/codigo?aba=linguagens" scroll={false} className={days === 365 ? "text-chalk" : "text-faint hover:text-dust"}>
          1 ano
        </Link>
        <Link href="/codigo?aba=linguagens&periodo=90" scroll={false} className={days === 90 ? "text-chalk" : "text-faint hover:text-dust"}>
          90 dias
        </Link>
      </div>

      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,360px)_1fr]">
        <RadialChart slices={slices} label="Distribuição de linguagens por linhas alteradas" />
        <ol className="space-y-2.5">
          {code.slice(0, 10).map((l) => (
            <li key={l.language} className="flex items-baseline gap-3 text-[14px]">
              <span aria-hidden className="block size-2 shrink-0 rounded-[2px]" style={{ background: LANGUAGE_COLORS[l.language] ?? "#7f8894" }} />
              <span className="flex-1 text-chalk">{l.language}</span>
              <span className="num text-dust">{sharePct(l.lines, totalLines)}</span>
              <span className="num w-24 text-right whitespace-nowrap text-faint">{compact(l.lines)} lin.</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="mb-3 text-[13px] text-faint">por área</h3>
        <div className="flex h-2 overflow-hidden rounded-full bg-heat-0">
          {areaList.map(([area, lines], i) => (
            <span
              key={area}
              title={`${area}: ${Math.round((lines / totalLines) * 100)}%`}
              style={{ width: `${(lines / totalLines) * 100}%`, opacity: 1 - i * 0.16 }}
              className="block h-full bg-heat-4"
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {areaList.map(([area, lines]) => (
            <li key={area}>
              <span className="text-dust">{area}</span>{" "}
              <span className="num text-chalk">{Math.round((lines / totalLines) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {months.length > 1 ? (
        <div>
          <h3 className="mb-3 text-[13px] text-faint">mês a mês</h3>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-[3px] text-[12px]">
              <tbody>
                {evolutionLangs.map((lang) => (
                  <tr key={lang}>
                    <th scope="row" className="pr-3 text-left font-normal whitespace-nowrap text-dust">
                      {lang}
                    </th>
                    {months.map((m) => {
                      const lines = monthly.find((x) => x.month === m && x.language === lang)?.lines ?? 0;
                      const share = lines / Math.max(1, monthTotals.get(m) ?? 0);
                      const level = share <= 0 ? 0 : share < 0.1 ? 1 : share < 0.25 ? 2 : share < 0.5 ? 3 : 4;
                      return (
                        <td key={m} title={`${lang} em ${m.slice(0, 7)}: ${Math.round(share * 100)}%`}>
                          <span className={`block size-3.5 rounded-[2px] ${HEAT_BG[level]}`} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="max-w-prose text-[12px] leading-relaxed text-faint">
        {source === "commits"
          ? `Linhas adicionadas e removidas nos seus commits, por extensão de arquivo. ${coverage.detailed.toLocaleString("pt-BR")} de ${coverage.total.toLocaleString("pt-BR")} commits do período já analisados; o resto entra nas próximas sincronizações.`
          : "Estimativa pelos bytes de cada repositório, ponderada pelos seus commits. Fica mais precisa conforme os commits são analisados."}{" "}
        Lockfiles, arquivos gerados e dependências não contam; docs e config ficam fora do gráfico.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bibliotecas
// ---------------------------------------------------------------------------

async function LibrariesTab({ query, today }: { query: Query; today: Day }) {
  const days = query.periodo === "90" ? 90 : 365;
  const from = addDays(today, -(days - 1));
  const [libs, overrides] = await Promise.all([getLibraryUsage(from, today), getLibraryOverrides()]);
  if (libs.length === 0) {
    return (
      <p className="max-w-prose text-[15px] leading-relaxed text-dust">
        As bibliotecas aparecem aqui depois que a sincronização ler os <code>package.json</code>,{" "}
        <code>requirements.txt</code> e <code>pyproject.toml</code> dos seus repositórios.
      </p>
    );
  }
  const maxWeight = Math.max(1, ...libs.map((l) => l.weight));
  const grouped = new Map<string, typeof libs>();
  for (const lib of libs) {
    const cat = libraryCategory(lib.ecosystem, lib.name, overrides);
    grouped.set(cat, [...(grouped.get(cat) ?? []), lib]);
  }
  const order = [...LIBRARY_CATEGORIES, ...[...grouped.keys()].filter((k) => !(LIBRARY_CATEGORIES as readonly string[]).includes(k))];

  return (
    <section aria-label="Bibliotecas" className="space-y-10">
      <p className="max-w-prose text-[13px] text-faint">
        Dependências diretas dos seus repositórios, ordenadas pelo uso: em quantos repositórios aparecem e quanto você
        commitou neles {days === 365 ? "no último ano" : "nos últimos 90 dias"}.
      </p>
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {order
          .filter((cat) => grouped.has(cat))
          .map((cat) => (
            <div key={cat}>
              <h3 className="mb-2 text-[13px] text-faint">{cat.toLowerCase()}</h3>
              <ul className="space-y-1.5">
                {grouped
                  .get(cat)!
                  .slice(0, 12)
                  .map((lib) => (
                    <li key={`${lib.ecosystem}:${lib.name}`} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate text-[14px] text-chalk">{lib.name}</span>
                        {lib.devOnly ? <span className="text-[11px] text-faint">dev</span> : null}
                        {lib.ecosystem === "pypi" ? <span className="text-[11px] text-faint">py</span> : null}
                      </span>
                      <LibraryCategorySelect
                        ecosystem={lib.ecosystem}
                        name={lib.name}
                        value={cat}
                        custom={overrides.has(`${lib.ecosystem}:${lib.name}`)}
                      />
                      <span className="col-span-2 flex items-center gap-2">
                        <span className="block h-1 flex-1 overflow-hidden rounded-full bg-heat-0">
                          <span className="block h-full bg-heat-3" style={{ width: `${(lib.weight / maxWeight) * 100}%` }} />
                        </span>
                        <span className="num w-16 text-right text-[11px] text-faint">{plural(lib.repos, "repo")}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Repositórios
// ---------------------------------------------------------------------------

async function ReposTab({ today }: { today: Day }) {
  const [repos, activity] = await Promise.all([getRepos(), getRepoActivity(addDays(today, -364), today)]);
  if (repos.length === 0) {
    return <p className="text-[15px] text-dust">Os repositórios aparecem aqui depois da primeira sincronização.</p>;
  }
  const commitsOf = new Map(activity.map((a) => [a.repoId, a.commits]));
  return (
    <section aria-label="Repositórios" className="space-y-4">
      <p className="max-w-prose text-[13px] text-faint">
        Repositórios ignorados (forks, dotfiles, testes) somem de todas as estatísticas, inclusive do hábito automático.
      </p>
      <ul className="divide-y divide-seam/50">
        {repos.map((r) => (
          <li key={r.id} className={`flex items-center gap-4 py-3 ${r.ignored ? "opacity-50" : ""}`}>
            <div className="min-w-0 flex-1">
              <a href={r.url} target="_blank" rel="noreferrer" className="block truncate text-[14px] text-chalk hover:underline hover:decoration-seam hover:underline-offset-4">
                {r.fullName}
              </a>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-faint">
                {r.primaryLanguage ? <span>{r.primaryLanguage}</span> : null}
                {r.isPrivate ? <span>privado</span> : null}
                {r.isFork ? <span>fork</span> : null}
                <span className="num">{plural(commitsOf.get(r.id) ?? 0, "commit")} no ano</span>
              </p>
            </div>
            <form action={setRepoIgnored.bind(null, r.id, !r.ignored)}>
              <button type="submit" className="text-[13px] text-faint underline decoration-seam underline-offset-4 hover:text-dust">
                {r.ignored ? "Considerar" : "Ignorar"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

function sharePct(part: number, total: number) {
  const p = (part / Math.max(1, total)) * 100;
  return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`;
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-faint">{k}</dt>
      <dd className="num text-chalk">{v}</dd>
    </div>
  );
}
