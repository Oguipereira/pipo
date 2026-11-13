import { addDays, diffDays, type Day } from "./dates";
import { completionRate, dayCompletion, isActiveOn, isPerfectDay, type Habit, type RatioLookup } from "./habits";
import { computeStreaks } from "./streak";

/** "2026-11" → primeiro e último dia do mês. */
export function monthRange(month: string): { start: Day; end: Day } {
  const [y, m] = month.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { start, end: addDays(next, -1) };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export const isMonth = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export type ReportInput = {
  month: string;
  today: Day;
  habits: Habit[];
  ratio: RatioLookup;
  commitsByDay: Map<Day, number>;
  /** Commits por repositório no mês. */
  repos: { fullName: string; commits: number }[];
  /** Tarefas concluídas: projeto + dia local da conclusão. */
  tasksDone: { project: string; day: Day }[];
  /** Ocorrências de estudo/aula na agenda (dias). */
  studyDays: Day[];
};

export type HabitMonth = {
  habit: Habit;
  completion: number;
  bestStreak: number;
  doneDays: number;
  scheduledDays: number;
};

export type MonthReport = {
  month: string;
  start: Day;
  /** Último dia considerado: fim do mês ou hoje, o que vier antes. */
  end: Day;
  partial: boolean;
  habits: HabitMonth[];
  habitCompletion: number | null;
  perfectDays: number;
  daysWithHabits: number;
  commits: number;
  commitDays: number;
  bestCommitDay: { day: Day; commits: number } | null;
  topRepo: { fullName: string; commits: number } | null;
  tasksByProject: { project: string; done: number }[];
  tasksDone: number;
  studySessions: number;
};

/** Agrega um mês (docs/SPEC.md §4.7). Mês futuro devolve tudo zerado. */
export function buildMonthReport(input: ReportInput): MonthReport {
  const { start, end: monthEnd } = monthRange(input.month);
  const end = diffDays(input.today, monthEnd) > 0 ? input.today : monthEnd;
  const partial = end !== monthEnd;
  const days = diffDays(start, end) >= 0 ? Array.from({ length: diffDays(start, end) + 1 }, (_, i) => addDays(start, i)) : [];
  const inMonth = (d: Day) => d >= start && d <= end;

  const habits: HabitMonth[] = input.habits
    .filter((h) => days.some((d) => isActiveOn(h, d)))
    .map((habit) => {
      const scheduled = days.filter((d) => isActiveOn(habit, d));
      // Dias antes do início do hábito já ficam fora via isActiveOn.
      const streak = computeStreaks((d) => input.ratio(habit, d) >= 1, {
        start,
        today: end,
        isScheduled: (d) => isActiveOn(habit, d),
      });
      return {
        habit,
        completion: completionRate(habit, input.ratio, start, end, input.today),
        bestStreak: streak.best,
        doneDays: scheduled.filter((d) => input.ratio(habit, d) >= 1).length,
        scheduledDays: scheduled.length,
      };
    })
    .sort((a, b) => b.completion - a.completion);

  let completionSum = 0;
  let completionCount = 0;
  let perfectDays = 0;
  for (const d of days) {
    const c = dayCompletion(input.habits, input.ratio, d);
    if (c === null || (d === input.today && c === 0)) continue;
    completionSum += c;
    completionCount++;
    if (isPerfectDay(input.habits, input.ratio, d)) perfectDays++;
  }

  let commits = 0;
  let commitDays = 0;
  let bestCommitDay: MonthReport["bestCommitDay"] = null;
  for (const d of days) {
    const n = input.commitsByDay.get(d) ?? 0;
    commits += n;
    if (n > 0) commitDays++;
    if (n > 0 && (!bestCommitDay || n > bestCommitDay.commits)) bestCommitDay = { day: d, commits: n };
  }

  const tasks = input.tasksDone.filter((t) => inMonth(t.day));
  const byProject = new Map<string, number>();
  for (const t of tasks) byProject.set(t.project, (byProject.get(t.project) ?? 0) + 1);
  const topRepo = [...input.repos].sort((a, b) => b.commits - a.commits)[0];

  return {
    month: input.month,
    start,
    end,
    partial,
    habits,
    habitCompletion: completionCount ? completionSum / completionCount : null,
    perfectDays,
    daysWithHabits: completionCount,
    commits,
    commitDays,
    bestCommitDay,
    topRepo: topRepo && topRepo.commits > 0 ? topRepo : null,
    tasksByProject: [...byProject].map(([project, done]) => ({ project, done })).sort((a, b) => b.done - a.done),
    tasksDone: tasks.length,
    studySessions: input.studyDays.filter(inMonth).length,
  };
}

export type Delta = { value: number; previous: number; diff: number; direction: "up" | "down" | "same" };

export function delta(value: number, previous: number): Delta {
  const diff = value - previous;
  return { value, previous, diff, direction: Math.abs(diff) < 1e-9 ? "same" : diff > 0 ? "up" : "down" };
}

/** Indicadores principais comparados com o mês anterior. */
export function compareMonths(current: MonthReport, previous: MonthReport) {
  return {
    habitCompletion: delta(current.habitCompletion ?? 0, previous.habitCompletion ?? 0),
    perfectDays: delta(current.perfectDays, previous.perfectDays),
    commits: delta(current.commits, previous.commits),
    commitDays: delta(current.commitDays, previous.commitDays),
    tasksDone: delta(current.tasksDone, previous.tasksDone),
    studySessions: delta(current.studySessions, previous.studySessions),
  };
}
