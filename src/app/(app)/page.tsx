import { Suspense } from "react";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { addDays, today as todayIn, type Day } from "@/lib/dates";
import { buildGrid, levelFromCount, levelFromRatio } from "@/lib/heatmap";
import { sampleContributions, sampleHabitRatios } from "@/lib/sample";
import { computeStreaks } from "@/lib/streak";
import { Heatmap, HeatLegend } from "@/components/heatmap";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Stat } from "@/components/stat";

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <PageHeader path="hoje" />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const viewer = await getViewer();
  const today = todayIn(viewer.timezone);
  const yearStart = addDays(today, -364);

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

  const total = sum(commits, yearStart, today);
  const streak = computeStreaks((d) => (commits.get(d) ?? 0) > 0, { start: yearStart, today });

  return (
    <>
      <section aria-labelledby="contrib">
        <SectionTitle aside={<HeatLegend />}>
          <span id="contrib">contribuições</span>
        </SectionTitle>
        <div className="-mx-5 bg-slab px-5 py-4 md:mx-0 md:px-5">
          <Heatmap grid={commitGrid} label="Contribuições no GitHub no último ano" highlight={today} sweep />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          <Stat value={total.toLocaleString("pt-BR")} label="commits no ano" />
          <Stat value={streak.activeDays} label="dias com commit" />
          <Stat value={streak.current} unit={days(streak.current)} label="sequência atual" />
          <Stat value={streak.best} unit={days(streak.best)} label="maior sequência" />
        </div>
        <SampleNote>Dados de exemplo até o GitHub ser conectado.</SampleNote>
      </section>

      <section aria-labelledby="habits">
        <SectionTitle aside={<HeatLegend less="0%" more="100%" />}>
          <span id="habits">hábitos</span>
        </SectionTitle>
        <div className="-mx-5 bg-slab px-5 py-4 md:mx-0 md:px-5">
          <Heatmap grid={habitGrid} label="Média de hábitos cumpridos por dia no último ano" highlight={today} />
        </div>
        <SampleNote>Dados de exemplo até você criar seus hábitos.</SampleNote>
      </section>

      <div className="grid gap-10 md:grid-cols-2">
        <section aria-labelledby="checkin">
          <SectionTitle>
            <span id="checkin">check-in de hoje</span>
          </SectionTitle>
          <Empty>
            Seus hábitos de hoje aparecem aqui, prontos para marcar com um toque.{" "}
            <Link href="/habitos" className="text-chalk underline decoration-seam underline-offset-4 hover:decoration-heat-4">
              Ver hábitos
            </Link>
          </Empty>
        </section>

        <section aria-labelledby="projects">
          <SectionTitle>
            <span id="projects">projetos ativos</span>
          </SectionTitle>
          <Empty>
            Cada projeto ativo mostra aqui a próxima tarefa do plano.{" "}
            <Link href="/projetos" className="text-chalk underline decoration-seam underline-offset-4 hover:decoration-heat-4">
              Ver projetos
            </Link>
          </Empty>
        </section>
      </div>
    </>
  );
}

const days = (n: number) => (n === 1 ? "dia" : "dias");

function sum(map: Map<Day, number>, from: Day, to: Day) {
  let total = 0;
  for (const [day, n] of map) if (day >= from && day <= to) total += n;
  return total;
}

function fmt(day: Day) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

function SampleNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[12px] text-faint">{children}</p>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border-l-2 border-seam pl-4 text-[14px] leading-relaxed text-dust">{children}</p>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10" aria-busy>
      <div className="-mx-5 h-[132px] bg-slab md:mx-0" />
      <div className="-mx-5 h-[132px] bg-slab md:mx-0" />
    </div>
  );
}
