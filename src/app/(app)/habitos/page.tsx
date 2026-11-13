import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { loadHabitBoard } from "@/lib/data/board";
import { getHabits } from "@/lib/data/habits";
import { buildGrid, levelFromRatio } from "@/lib/heatmap";
import { formatAmount, isActiveOn, scheduleLabel, summarize, type Habit } from "@/lib/habits";
import { Heatmap } from "@/components/heatmap";
import { PageHeader } from "@/components/page-header";
import { moveHabit, restoreHabit } from "./actions";

export const metadata: Metadata = { title: "hábitos" };

export default function HabitsPage() {
  return (
    <div className="space-y-10">
      <PageHeader path="hábitos">
        <Link
          href="/habitos/novo"
          className="rounded-[3px] border border-seam px-3 py-1.5 text-[14px] text-chalk hover:border-dust"
        >
          Novo hábito
        </Link>
      </PageHeader>
      <Suspense fallback={<div className="h-40" aria-busy />}>
        <HabitList />
      </Suspense>
    </div>
  );
}

async function HabitList() {
  const viewer = await getViewer();
  const [board, archived] = await Promise.all([loadHabitBoard(viewer.timezone, 120), getHabits({ archived: true })]);
  const colorOf = new Map(board.categories.map((c) => [c.id, c.color]));

  if (board.habits.length === 0) {
    return (
      <div className="max-w-prose space-y-4">
        <p className="text-[15px] leading-relaxed text-dust">
          Nenhum hábito ainda. Comece com um só, algo pequeno que você queira fazer todo dia ou de segunda a
          sexta.
        </p>
        <Link href="/habitos/novo" className="inline-block text-[15px] text-chalk underline decoration-heat-3 underline-offset-4">
          Criar o primeiro hábito
        </Link>
        <ArchivedList habits={archived} />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <ul className="space-y-9">
        {board.habits.map((habit, i) => {
          const summary = summarize(habit, board.ratio, board.today);
          const grid = buildGrid(
            board.today,
            (day) =>
              isActiveOn(habit, day)
                ? { level: levelFromRatio(board.ratio(habit, day)) }
                : { level: 0, off: true },
            17,
          );
          return (
            <li key={habit.id} className="group">
              <div className="flex items-start justify-between gap-4">
                <Link href={`/habitos/${habit.id}`} className="min-w-0">
                  <span className="flex items-center gap-2">
                    {habit.categoryId ? (
                      <span
                        aria-hidden
                        className="block size-1.5 rounded-full"
                        style={{ background: colorOf.get(habit.categoryId) }}
                      />
                    ) : null}
                    <span className="truncate text-[16px] text-chalk group-hover:underline group-hover:decoration-seam group-hover:underline-offset-4">
                      {habit.name}
                    </span>
                  </span>
                  <span className="mt-1 block text-[13px] text-faint">{describe(habit)}</span>
                </Link>
                <Reorder id={habit.id} first={i === 0} last={i === board.habits.length - 1} />
              </div>
              <Link href={`/habitos/${habit.id}`} className="mt-3 block w-fit" tabIndex={-1} aria-hidden>
                <Heatmap grid={grid} label="" cell={9} gap={3} fluid={false} labels={false} />
              </Link>
              <p className="mt-2.5 flex gap-5 text-[13px]">
                <span>
                  <span className="text-faint">sequência </span>
                  <span className="num text-chalk">{summary.streak.current}</span>
                </span>
                <span>
                  <span className="text-faint">30 dias </span>
                  <span className="num text-chalk">{Math.round(summary.completion * 100)}%</span>
                </span>
              </p>
            </li>
          );
        })}
      </ul>
      <ArchivedList habits={archived} />
    </div>
  );
}

function describe(habit: Habit) {
  const parts = [scheduleLabel(habit.scheduleDays)];
  if (habit.kind === "quantity" && habit.target) {
    parts.unshift(`${formatAmount(habit.target)}${habit.unit ? ` ${habit.unit}` : ""} por dia`);
  }
  if (habit.kind === "github") parts.unshift("automático pelos commits");
  return parts.join(", ");
}

function Reorder({ id, first, last }: { id: string; first: boolean; last: boolean }) {
  const btn =
    "grid size-8 place-items-center rounded-[3px] font-mono text-[13px] text-faint hover:bg-heat-0 hover:text-chalk disabled:invisible";
  return (
    <div className="flex shrink-0 gap-1">
      <form action={moveHabit.bind(null, id, -1)}>
        <button type="submit" disabled={first} className={btn} aria-label="Mover para cima">
          ↑
        </button>
      </form>
      <form action={moveHabit.bind(null, id, 1)}>
        <button type="submit" disabled={last} className={btn} aria-label="Mover para baixo">
          ↓
        </button>
      </form>
    </div>
  );
}

function ArchivedList({ habits }: { habits: Habit[] }) {
  if (habits.length === 0) return null;
  return (
    <details className="text-[14px]">
      <summary className="cursor-pointer text-faint hover:text-dust">
        {habits.length} arquivado{habits.length === 1 ? "" : "s"}
      </summary>
      <ul className="mt-3 space-y-2">
        {habits.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-4">
            <Link href={`/habitos/${h.id}`} className="text-dust hover:text-chalk">
              {h.name}
            </Link>
            <form action={restoreHabit.bind(null, h.id)}>
              <button type="submit" className="text-[13px] text-chalk underline decoration-seam underline-offset-4">
                Reativar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </details>
  );
}
