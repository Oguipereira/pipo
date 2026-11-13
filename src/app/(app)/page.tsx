import { Suspense } from "react";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { addDays, today as todayIn, type Day } from "@/lib/dates";
import { buildGrid, levelFromCount, levelFromRatio } from "@/lib/heatmap";
import { sampleContributions, sampleHabitRatios } from "@/lib/sample";
import { computeStreaks } from "@/lib/streak";
import { Heatmap, HeatLegend } from "@/components/heatmap";
import { HeatSwitch } from "@/components/heat-switch";
import { PageHeader } from "@/components/page-header";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const viewer = await getViewer();
  const now = new Date();
  const today = todayIn(viewer.timezone, now);
  const yearStart = addDays(today, -364);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: viewer.timezone,
  }).format(now);

  // Fase 1: dados de exemplo. A fase 3 troca por contribution_days/commits reais.
  const commits = sampleContributions(today);
  const habits = sampleHabitRatios(today);
  const maxCommits = Math.max(...commits.values());

  const commitGrid = buildGrid(today, (day) => {
    const n = commits.get(day) ?? 0;
    return { level: levelFromCount(n, maxCommits), label: `${n} commit${n === 1 ? "" : "s"} em ${fmt(day)}` };
  });
  const habitGrid = buildGrid(today, (day) => {
    const r = habits.get(day) ?? 0;
    return { level: levelFromRatio(r), label: `${Math.round(r * 100)}% dos hábitos em ${fmt(day)}` };
  });

  const totalCommits = sum(commits, yearStart, today);
  const commitStreak = computeStreaks((d) => (commits.get(d) ?? 0) > 0, { start: yearStart, today });
  const habitAvg = average(habits, yearStart, today);
  const perfectStreak = computeStreaks((d) => (habits.get(d) ?? 0) >= 1, { start: yearStart, today });

  return (
    <div className="space-y-14">
      <div>
        <PageHeader path="hoje" />
        <p className="mt-3 text-[15px] text-dust first-letter:uppercase">{dateLabel}</p>
      </div>

      <section aria-label="Atividade no último ano">
        <HeatSwitch
          views={[
            {
              key: "code",
              label: "código",
              content: (
                <ActivityBlock
                  value={totalCommits.toLocaleString("pt-BR")}
                  caption="commits no último ano"
                  facts={[
                    ["sequência atual", days(commitStreak.current)],
                    ["recorde", days(commitStreak.best)],
                  ]}
                  heatmap={
                    <Heatmap grid={commitGrid} label="Commits por dia no último ano" highlight={today} sweep />
                  }
                  note="Exemplo. Seus commits aparecem aqui quando o GitHub for conectado."
                />
              ),
            },
            {
              key: "habits",
              label: "hábitos",
              content: (
                <ActivityBlock
                  value={`${Math.round(habitAvg * 100)}%`}
                  caption="dos hábitos cumpridos no último ano"
                  facts={[
                    ["dias perfeitos seguidos", String(perfectStreak.current)],
                    ["recorde", String(perfectStreak.best)],
                  ]}
                  heatmap={
                    <Heatmap grid={habitGrid} label="Hábitos cumpridos por dia no último ano" highlight={today} />
                  }
                  note="Exemplo. Seus hábitos aparecem aqui quando você criar o primeiro."
                  legend={<HeatLegend less="0%" more="100%" />}
                />
              ),
            },
          ]}
        />
      </section>

      <div className="grid gap-12 md:grid-cols-2">
        <Quiet title="para marcar hoje">
          Quando você criar hábitos, os de hoje ficam aqui para marcar com um toque.{" "}
          <InlineLink href="/habitos">Hábitos</InlineLink>
        </Quiet>
        <Quiet title="próximos passos">
          Cada projeto ativo mostra aqui a próxima tarefa do plano.{" "}
          <InlineLink href="/projetos">Projetos</InlineLink>
        </Quiet>
      </div>
    </div>
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

function Quiet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[13px] text-faint">{title}</h2>
      <p className="mt-2 max-w-[42ch] text-[15px] leading-relaxed text-dust">{children}</p>
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

const days = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

function sum(map: Map<Day, number>, from: Day, to: Day) {
  let total = 0;
  for (const [day, n] of map) if (day >= from && day <= to) total += n;
  return total;
}

function average(map: Map<Day, number>, from: Day, to: Day) {
  let total = 0;
  let count = 0;
  for (const [day, n] of map) {
    if (day < from || day > to) continue;
    total += n;
    count++;
  }
  return count ? total / count : 0;
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
