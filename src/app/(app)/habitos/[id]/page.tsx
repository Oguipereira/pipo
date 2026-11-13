import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { addDays, diffDays, isDay, today as todayIn, type Day } from "@/lib/dates";
import { checkInItems } from "@/lib/data/board";
import { getCategories, getCommitCounts, getHabit, getLogs } from "@/lib/data/habits";
import { buildGrid, levelFromRatio } from "@/lib/heatmap";
import { formatAmount, isActiveOn, ratioLookup, scheduleLabel, summarize } from "@/lib/habits";
import { CheckIn } from "@/components/check-in";
import { DayPicker } from "@/components/day-picker";
import { HabitForm } from "@/components/habit-form";
import { Heatmap, HeatLegend } from "@/components/heatmap";
import { PageHeader } from "@/components/page-header";
import { archiveHabit, restoreHabit } from "../actions";

export const metadata: Metadata = { title: "hábito" };

export default function HabitPage({ params, searchParams }: PageProps<"/habitos/[id]">) {
  return (
    <div className="space-y-10">
      <Link href="/habitos" className="text-[13px] text-faint hover:text-dust">
        ← hábitos
      </Link>
      <Suspense fallback={<div className="h-96" aria-busy />}>
        <HabitDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HabitDetail({ params, searchParams }: PageProps<"/habitos/[id]">) {
  const [{ id }, query, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const habit = /^[0-9a-f-]{36}$/i.test(id) ? await getHabit(id) : null;
  if (!habit) notFound();

  const today = todayIn(viewer.timezone);
  const from = addDays(today, -370);
  const [logs, commits, categories] = await Promise.all([
    getLogs(from, today, [habit.id]),
    habit.kind === "github" ? getCommitCounts(from, today) : Promise.resolve(new Map<Day, number>()),
    getCategories(),
  ]);
  const ratio = ratioLookup(logs, commits);
  const summary = summarize(habit, ratio, today);
  const category = categories.find((c) => c.id === habit.categoryId);

  const requested = typeof query.dia === "string" && isDay(query.dia) ? query.dia : today;
  const selected = diffDays(requested, today) < 0 ? today : requested;
  const editable = diffDays(habit.startDate, selected) >= 0;
  const scheduled = isActiveOn(habit, selected);
  const board = { today, from, habits: [habit], categories, logs, commits, ratio };

  const grid = buildGrid(today, (day) =>
    isActiveOn(habit, day)
      ? { level: levelFromRatio(ratio(habit, day)), label: dayLabel(habit.kind, ratio(habit, day), day) }
      : { level: 0, off: true, label: `${fmt(day)}: fora da agenda` },
  );

  return (
    <>
      <div>
        <PageHeader path={habit.name.toLocaleLowerCase("pt-BR")} />
        <p className="mt-3 flex items-center gap-2 text-[14px] text-dust">
          {category ? <span aria-hidden className="block size-1.5 rounded-full" style={{ background: category.color }} /> : null}
          {[
            category?.name,
            habit.kind === "quantity" && habit.target
              ? `${formatAmount(habit.target)}${habit.unit ? ` ${habit.unit}` : ""} por dia`
              : habit.kind === "github"
                ? "automático pelos commits"
                : null,
            scheduleLabel(habit.scheduleDays),
          ]
            .filter(Boolean)
            .join(", ")}
          {habit.archivedAt ? <span className="text-alert">arquivado</span> : null}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Stat label="sequência atual" value={summary.streak.current} />
        <Stat label="recorde" value={summary.streak.best} />
        <Stat label="últimos 30 dias" value={`${Math.round(summary.completion * 100)}%`} />
        <Stat label="dias cumpridos" value={summary.streak.activeDays} />
      </dl>

      <section aria-label="Histórico do ano">
        <DayPicker>
          <Heatmap grid={grid} label={`Histórico de ${habit.name}`} highlight={selected} interactive />
        </DayPicker>
        <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-faint">
          <span>Toque num dia para editar.</span>
          <HeatLegend less="0%" more="100%" />
        </div>
      </section>

      <section aria-label="Editar o dia" className="max-w-lg">
        <h2 className="text-[13px] text-faint">
          {selected === today ? "hoje" : selected === addDays(today, -1) ? "ontem" : fmtLong(selected)}
        </h2>
        <div className="mt-1">
          {!editable ? (
            <p className="py-3 text-[14px] text-dust">Esse dia é anterior ao início do hábito.</p>
          ) : !scheduled ? (
            <p className="py-3 text-[14px] text-dust">
              {habit.archivedAt ? "O hábito estava arquivado nesse dia." : "Fora da agenda deste hábito."}
            </p>
          ) : (
            <CheckIn day={selected} items={checkInItems(board, selected)} />
          )}
        </div>
      </section>

      <details className="max-w-lg">
        <summary className="cursor-pointer text-[14px] text-dust hover:text-chalk">Editar hábito</summary>
        <div className="mt-6">
          <HabitForm categories={categories} habit={habit} today={today} />
        </div>
      </details>

      <form action={(habit.archivedAt ? restoreHabit : archiveHabit).bind(null, habit.id)}>
        <button type="submit" className="text-[13px] text-faint underline decoration-seam underline-offset-4 hover:text-dust">
          {habit.archivedAt ? "Reativar hábito" : "Arquivar hábito"}
        </button>
        {!habit.archivedAt ? (
          <p className="mt-1 text-[12px] text-faint">Sai do check-in, mas o histórico continua nos relatórios.</p>
        ) : null}
      </form>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dd className="num text-[28px] leading-none text-chalk">{value}</dd>
      <dt className="mt-1.5 text-[12px] text-faint">{label}</dt>
    </div>
  );
}

function dayLabel(kind: string, r: number, day: Day) {
  if (kind === "quantity") return `${fmt(day)}: ${Math.round(r * 100)}% da meta`;
  return `${fmt(day)}: ${r >= 1 ? "feito" : "não feito"}`;
}

function fmt(day: Day) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/** "quarta-feira, 11 de novembro" a partir de um dia (sem depender de fuso). */
function fmtLong(day: Day) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}
