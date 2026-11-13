import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { addDays, diffDays, today as todayIn, weekday, type Day } from "@/lib/dates";
import { loadMonthReport } from "@/lib/data/report";
import { fmtMonth, fmtShortDay, plural } from "@/lib/format";
import { levelFromRatio } from "@/lib/heatmap";
import { isCodeLanguage, LANGUAGE_COLORS } from "@/lib/languages";
import { isMonth, shiftMonth, type Delta } from "@/lib/report";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "relatório" };

const HEAT_BG = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];

export default function ReportPage({ params }: PageProps<"/relatorio/[mes]">) {
  return (
    <div className="space-y-12">
      <PageHeader path="relatório" />
      <Suspense fallback={<div className="h-96" aria-busy />}>
        <Report params={params} />
      </Suspense>
    </div>
  );
}

async function Report({ params }: { params: PageProps<"/relatorio/[mes]">["params"] }) {
  const [{ mes }, viewer] = await Promise.all([params, getViewer()]);
  if (!isMonth(mes)) notFound();
  const today = todayIn(viewer.timezone);
  const currentMonth = today.slice(0, 7);
  if (mes > currentMonth) notFound();

  const { current: r, comparison: cmp, languages, dayCompletion } = await loadMonthReport(mes, today, viewer.timezone);
  const code = languages.filter((l) => isCodeLanguage(l.language));
  const codeTotal = code.reduce((s, l) => s + l.lines, 0);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] leading-tight text-chalk first-letter:uppercase md:text-[34px]">{fmtMonth(mes)}</h2>
          <p className="mt-1 text-[13px] text-faint">
            {r.partial ? `Até hoje, ${fmtShortDay(today)}. ` : ""}Comparado com {fmtMonth(shiftMonth(mes, -1))}.
          </p>
        </div>
        <nav aria-label="Outros meses" className="flex gap-3 text-[14px]">
          <Link href={`/relatorio/${shiftMonth(mes, -1)}`} className="text-faint hover:text-chalk" aria-label="Mês anterior">
            ←
          </Link>
          {mes < currentMonth ? (
            <Link href={`/relatorio/${shiftMonth(mes, 1)}`} className="text-faint hover:text-chalk" aria-label="Próximo mês">
              →
            </Link>
          ) : null}
        </nav>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        <Kpi label="dos hábitos cumpridos" value={r.habitCompletion == null ? "—" : `${Math.round(r.habitCompletion * 100)}%`} delta={cmp.habitCompletion} percent />
        <Kpi label="dias com tudo cumprido" value={String(r.perfectDays)} delta={cmp.perfectDays} />
        <Kpi label="commits" value={r.commits.toLocaleString("pt-BR")} delta={cmp.commits} />
        <Kpi label="tarefas concluídas" value={String(r.tasksDone)} delta={cmp.tasksDone} />
      </dl>

      <section aria-labelledby="hab" className="grid gap-10 md:grid-cols-[auto_1fr]">
        <div>
          <h3 id="hab" className="mb-3 text-[13px] text-faint">hábitos, dia a dia</h3>
          <MonthCalendar start={r.start} lastDay={r.end} month={mes} dayCompletion={dayCompletion} />
        </div>
        <div>
          <h3 className="mb-3 text-[13px] text-faint">por hábito</h3>
          {r.habits.length === 0 ? (
            <p className="text-[14px] text-dust">Nenhum hábito valia neste mês.</p>
          ) : (
            <ul className="space-y-3.5">
              {r.habits.map((h) => (
                <li key={h.habit.id}>
                  <div className="flex items-baseline justify-between gap-3 text-[14px]">
                    <span className="truncate text-chalk">{h.habit.name}</span>
                    <span className="num shrink-0 text-dust">{Math.round(h.completion * 100)}%</span>
                  </div>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-heat-0">
                    <span className="block h-full bg-heat-3" style={{ width: `${h.completion * 100}%` }} />
                  </span>
                  <p className="mt-1 text-[12px] text-faint">
                    {h.doneDays} de {h.scheduledDays} dias, melhor sequência {plural(h.bestStreak, "dia")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="code" className="grid gap-10 md:grid-cols-2">
        <div>
          <h3 id="code" className="mb-3 text-[13px] text-faint">código</h3>
          <ul className="space-y-2 text-[14px]">
            <Line k="dias com commit" v={`${r.commitDays}`} d={cmp.commitDays} />
            <Line k="dia mais ativo" v={r.bestCommitDay ? `${fmtShortDay(r.bestCommitDay.day)}, ${plural(r.bestCommitDay.commits, "commit")}` : "—"} />
            <Line k="repositório mais ativo" v={r.topRepo ? `${r.topRepo.fullName.split("/").pop()}, ${plural(r.topRepo.commits, "commit")}` : "—"} />
          </ul>
          {code.length ? (
            <div className="mt-5">
              <div className="flex h-2 overflow-hidden rounded-full bg-heat-0">
                {code.slice(0, 6).map((l) => (
                  <span key={l.language} className="block h-full" style={{ width: `${(l.lines / codeTotal) * 100}%`, background: LANGUAGE_COLORS[l.language] ?? "#7f8894" }} />
                ))}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                {code.slice(0, 4).map((l) => (
                  <li key={l.language}>
                    <span className="text-dust">{l.language}</span>{" "}
                    <span className="num text-chalk">{Math.round((l.lines / codeTotal) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="mb-3 text-[13px] text-faint">projetos e estudo</h3>
          {r.tasksByProject.length ? (
            <ul className="space-y-2 text-[14px]">
              {r.tasksByProject.map((p) => (
                <li key={p.project} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-chalk">{p.project}</span>
                  <span className="num text-dust">{plural(p.done, "tarefa")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-dust">Nenhuma tarefa concluída no mês.</p>
          )}
          <ul className="mt-4 space-y-2 text-[14px]">
            <Line k="aulas e estudos na agenda" v={String(r.studySessions)} d={cmp.studySessions} />
          </ul>
        </div>
      </section>
    </>
  );
}

/** Calendário do mês (semana começando na segunda), cor = % dos hábitos do dia. */
function MonthCalendar({
  start,
  month,
  lastDay,
  dayCompletion,
}: {
  start: Day;
  lastDay: Day;
  month: string;
  dayCompletion: (d: Day) => number | null;
}) {
  const lead = (weekday(start) + 6) % 7;
  const cells: (Day | null)[] = Array.from({ length: lead }, () => null);
  for (let d = start; d.startsWith(month); d = addDays(d, 1)) cells.push(d);
  return (
    <div>
      <div className="grid w-fit grid-cols-7 gap-1.5">
        {["s", "t", "q", "q", "s", "s", "d"].map((l, i) => (
          <span key={i} className="text-center font-mono text-[10px] text-faint">
            {l}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const future = diffDays(lastDay, d) > 0;
          const c = future ? null : dayCompletion(d);
          return (
            <span
              key={d}
              title={c == null ? d : `${d}: ${Math.round(c * 100)}%`}
              className={`grid size-8 place-items-center rounded-[3px] font-mono text-[10px] ${
                future ? "bg-transparent text-faint/50 ring-1 ring-inset ring-seam/50" : c == null ? "bg-[repeating-linear-gradient(45deg,var(--color-heat-0)_0_2px,transparent_2px_5px)] text-faint" : `${HEAT_BG[levelFromRatio(c)]} ${c >= 0.67 ? "text-ink" : "text-dust"}`
              }`}
            >
              {Number(d.slice(8))}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, percent = false }: { label: string; value: string; delta: Delta; percent?: boolean }) {
  return (
    <div>
      <dd className="num text-[34px] leading-none text-chalk md:text-[40px]">{value}</dd>
      <dt className="mt-2 text-[13px] text-dust">{label}</dt>
      <DeltaText delta={delta} percent={percent} />
    </div>
  );
}

function DeltaText({ delta, percent = false }: { delta: Delta; percent?: boolean }) {
  if (delta.direction === "same") return <p className="mt-1 text-[12px] text-faint">igual ao mês anterior</p>;
  const amount = percent ? `${Math.abs(Math.round(delta.diff * 100))} p.p.` : Math.abs(delta.diff).toLocaleString("pt-BR");
  return (
    <p className="mt-1 text-[12px] text-faint">
      <span className={`num ${delta.direction === "up" ? "text-heat-3" : "text-alert/90"}`}>
        {delta.direction === "up" ? "+" : "−"}
        {amount}
      </span>{" "}
      vs. mês anterior
    </p>
  );
}

function Line({ k, v, d }: { k: string; v: string; d?: Delta }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-dust">{k}</span>
      <span className="num text-right text-chalk">
        {v}
        {d && d.direction !== "same" ? (
          <span className={`ml-2 text-[12px] ${d.direction === "up" ? "text-heat-3" : "text-alert/90"}`}>
            {d.direction === "up" ? "+" : "−"}
            {Math.abs(d.diff)}
          </span>
        ) : null}
      </span>
    </li>
  );
}
