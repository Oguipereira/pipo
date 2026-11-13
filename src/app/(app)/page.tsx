import { Suspense } from "react";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { addDays, diffDays, type Day } from "@/lib/dates";
import { checkInItems, loadHabitBoard, type HabitBoard } from "@/lib/data/board";
import { getContributionDays } from "@/lib/data/github";
import { getProjects, type Project } from "@/lib/data/projects";
import { getEvents } from "@/lib/data/agenda";
import { occurrences, upcomingDeadlines, countdown, type Occurrence } from "@/lib/agenda";
import { OccurrenceItem } from "@/components/occurrence";
import { dueLabel, nextTask } from "@/lib/projects";
import { dayCompletion } from "@/lib/habits";
import { buildGrid, levelFromCount, levelFromRatio, type Level } from "@/lib/heatmap";
import { sampleContributions, sampleHabitRatios } from "@/lib/sample";
import { computeStreaks } from "@/lib/streak";
import { CheckIn } from "@/components/check-in";
import { Heatmap, HeatLegend } from "@/components/heatmap";
import { HeatSwitch } from "@/components/heat-switch";
import { PageHeader } from "@/components/page-header";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const [viewer, query] = await Promise.all([getViewer(), searchParams]);
  const board = await loadHabitBoard(viewer.timezone);
  const { today } = board;
  const yesterday = addDays(today, -1);
  const day = query.dia === "ontem" ? yesterday : today;
  const yearStart = addDays(today, -364);
  const [contributions, projects, events] = await Promise.all([
    getContributionDays(yearStart, today),
    getProjects(),
    getEvents(),
  ]);
  const todayEvents = occurrences(events, today, today);
  const nextDeadline = upcomingDeadlines(events, addDays(today, 1), 30)[0];

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${today}T12:00:00Z`));

  return (
    <div className="space-y-14">
      <div>
        <PageHeader path="hoje" />
        <p className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 text-[15px] text-dust">
          <span className="first-letter:uppercase">{dateLabel}</span>
          <Link href="/relatorio" className="text-[13px] text-faint hover:text-dust">
            relatório do mês
          </Link>
        </p>
      </div>

      <section aria-labelledby="checkin">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 id="checkin" className="text-[13px] text-faint">
            para marcar
          </h2>
          <nav aria-label="Dia do check-in" className="flex gap-4 text-[13px]">
            <DayLink href="/" active={day === today}>
              hoje
            </DayLink>
            <DayLink href="/?dia=ontem" active={day === yesterday}>
              ontem
            </DayLink>
          </nav>
        </div>
        <CheckIn
          day={day}
          items={checkInItems(board, day)}
          emptyText={
            board.habits.length === 0 ? (
              <>
                Seus hábitos do dia aparecem aqui, prontos para marcar com um toque.{" "}
                <InlineLink href="/habitos/novo">Criar o primeiro</InlineLink>
              </>
            ) : (
              "Nenhum hábito agendado para este dia."
            )
          }
        />
      </section>

      <section aria-label="Atividade no último ano">
        <HeatSwitch
          views={[
            { key: "code", label: "código", content: <CodeActivity today={today} yearStart={yearStart} days={contributions} /> },
            { key: "habits", label: "hábitos", content: <HabitActivity board={board} yearStart={yearStart} /> },
          ]}
        />
      </section>

      <div className="grid gap-12 md:grid-cols-2">
        <TodayAgenda items={todayEvents} next={nextDeadline} today={today} />
        <NextSteps projects={projects.filter((p) => p.status === "active")} today={today} />
      </div>
    </div>
  );
}

function TodayAgenda({ items, next, today }: { items: Occurrence[]; next?: Occurrence; today: Day }) {
  return (
    <section>
      <h2 className="text-[13px] text-faint">na agenda hoje</h2>
      {items.length ? (
        <ul className="mt-1">
          {items.map((o) => (
            <li key={o.event.id}>
              <OccurrenceItem occurrence={o} today={today} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[15px] text-dust">
          Nada marcado. <InlineLink href="/agenda/novo">Novo compromisso</InlineLink>
        </p>
      )}
      {next ? (
        <p className="mt-3 text-[13px] text-faint">
          <span className="text-alert/90">{countdown(next.day, today)}</span>:{" "}
          <Link href={`/agenda/${next.event.id}?dia=${next.day}`} className="text-dust hover:text-chalk">
            {next.event.title}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

function NextSteps({ projects, today }: { projects: Project[]; today: Day }) {
  if (projects.length === 0) {
    return (
      <Quiet title="próximos passos">
        Cada projeto ativo mostra aqui a próxima tarefa do plano. <InlineLink href="/projetos">Projetos</InlineLink>
      </Quiet>
    );
  }
  return (
    <section>
      <h2 className="text-[13px] text-faint">próximos passos</h2>
      <ul className="mt-2 divide-y divide-seam/50">
        {projects.map((p) => {
          const next = nextTask(p.milestones, p.tasks);
          const due = next ? dueLabel(next.dueDate, today, next.status) : null;
          return (
            <li key={p.id}>
              <Link href={`/projetos/${p.id}`} className="group flex items-baseline gap-3 py-3">
                <span aria-hidden className="block size-2 shrink-0 translate-y-[-1px] rounded-[2px]" style={{ background: p.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-faint">{p.name}</span>
                  <span className="block truncate text-[15px] text-chalk group-hover:underline group-hover:decoration-seam group-hover:underline-offset-4">
                    {next ? next.title : "Plano vazio ou concluído"}
                  </span>
                </span>
                {next ? <span className="num shrink-0 text-[12px] text-faint">T{next.number}</span> : null}
                {due ? <span className={`shrink-0 text-[12px] ${due.late ? "text-alert" : "text-faint"}`}>{due.text}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CodeActivity({
  today,
  yearStart,
  days,
}: {
  today: Day;
  yearStart: Day;
  days: { date: Day; count: number; level: number }[];
}) {
  const real = days.some((d) => d.count > 0);
  const counts = real ? new Map(days.map((d) => [d.date, d.count])) : sampleContributions(today);
  const levels = real ? new Map(days.map((d) => [d.date, d.level as Level])) : null;
  const max = Math.max(1, ...counts.values());

  const grid = buildGrid(today, (day) => {
    const n = counts.get(day) ?? 0;
    return {
      level: levels?.get(day) ?? levelFromCount(n, max),
      label: `${n} contribuiç${n === 1 ? "ão" : "ões"} em ${fmt(day)}`,
    };
  });
  const total = sumRange(counts, yearStart, today);
  const streak = computeStreaks((d) => (counts.get(d) ?? 0) > 0, { start: yearStart, today });

  return (
    <ActivityBlock
      value={total.toLocaleString("pt-BR")}
      caption={real ? "contribuições no GitHub no último ano" : "commits no último ano"}
      facts={[
        ["sequência atual", plural(streak.current, "dia")],
        ["recorde", plural(streak.best, "dia")],
      ]}
      heatmap={<Heatmap grid={grid} label="Contribuições por dia no último ano" highlight={today} sweep />}
      note={
        real
          ? "Como o GitHub conta: commits, PRs, issues e reviews."
          : "Exemplo. Suas contribuições aparecem aqui depois da primeira sincronização com o GitHub."
      }
    />
  );
}

function HabitActivity({ board, yearStart }: { board: HabitBoard; yearStart: Day }) {
  const { today, habits, ratio } = board;
  const real = habits.length > 0;
  const sample = real ? null : sampleHabitRatios(today);

  const completion = (day: Day): number | null =>
    sample ? (sample.get(day) ?? 0) : dayCompletion(habits, ratio, day);

  const grid = buildGrid(today, (day) => {
    const c = completion(day);
    if (c === null) return { level: 0, off: true, label: `${fmt(day)}: nenhum hábito agendado` };
    return { level: levelFromRatio(c), label: `${Math.round(c * 100)}% dos hábitos em ${fmt(day)}` };
  });

  const firstStart = real
    ? habits.map((h) => h.startDate).reduce((a, b) => (a < b ? a : b))
    : yearStart;
  const start = diffDays(yearStart, firstStart) > 0 ? firstStart : yearStart;

  let total = 0;
  let count = 0;
  for (let d = start; diffDays(d, today) >= 0; d = addDays(d, 1)) {
    const c = completion(d);
    if (c === null || (d === today && c === 0)) continue;
    total += c;
    count++;
  }
  const perfect = computeStreaks((d) => (completion(d) ?? 0) >= 1, {
    start,
    today,
    isScheduled: (d) => completion(d) !== null,
  });

  return (
    <ActivityBlock
      value={`${count ? Math.round((total / count) * 100) : 0}%`}
      caption="dos hábitos cumpridos no último ano"
      facts={[
        ["dias perfeitos seguidos", String(perfect.current)],
        ["recorde", String(perfect.best)],
      ]}
      heatmap={<Heatmap grid={grid} label="Hábitos cumpridos por dia no último ano" highlight={today} />}
      note={real ? "Média dos hábitos agendados em cada dia." : "Exemplo. Seus hábitos aparecem aqui quando você criar o primeiro."}
      legend={<HeatLegend less="0%" more="100%" />}
    />
  );
}

function ActivityBlock({
  value,
  caption,
  facts,
  heatmap,
  note,
  legend = <HeatLegend />,
}: {
  value: string;
  caption: string;
  facts: [string, string][];
  heatmap: React.ReactNode;
  note: string;
  legend?: React.ReactNode;
}) {
  return (
    <div>
      <p className="num text-[44px] leading-none font-medium text-chalk md:text-[52px]">{value}</p>
      <p className="mt-2 text-[15px] text-dust">{caption}</p>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        {facts.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="text-faint">{k}</dt>
            <dd className="num text-chalk">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-7">{heatmap}</div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-[12px] text-faint">{note}</p>
        <div className="hidden sm:block">{legend}</div>
      </div>
    </div>
  );
}

function DayLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={active ? "text-chalk" : "text-faint hover:text-dust"}
    >
      {children}
    </Link>
  );
}

function Quiet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[13px] text-faint">{title}</h2>
      <div className="mt-2 max-w-[42ch] text-[15px] leading-relaxed text-dust">{children}</div>
    </section>
  );
}

function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-chalk underline decoration-seam underline-offset-4 hover:decoration-heat-3">
      {children}
    </Link>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function sumRange(map: Map<Day, number>, from: Day, to: Day) {
  let total = 0;
  for (const [day, n] of map) if (day >= from && day <= to) total += n;
  return total;
}

function fmt(day: Day) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-14" aria-busy>
      <PageHeader path="hoje" />
      <div className="h-[240px]" />
    </div>
  );
}
