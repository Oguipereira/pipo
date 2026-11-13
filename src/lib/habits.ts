import { addDays, diffDays, weekday, WEEKDAYS_PT, type Day } from "./dates";
import { computeStreaks, type StreakResult } from "./streak";

export type HabitKind = "boolean" | "quantity" | "github";

export type Habit = {
  id: string;
  name: string;
  kind: HabitKind;
  target: number | null;
  unit: string | null;
  /** Bitmask dom→sáb (bit 0 = domingo). */
  scheduleDays: number;
  startDate: Day;
  archivedAt: string | null;
  categoryId: string | null;
  position: number;
};

export type HabitLog = {
  habitId: string;
  date: Day;
  value: number;
  /** Meta no dia do registro; null para hábitos sem meta. */
  targetSnapshot: number | null;
};

// ---------------------------------------------------------------------------
// Agenda semanal
// ---------------------------------------------------------------------------

export const ALL_DAYS = 0b1111111; // 127
export const WEEKDAYS = 0b0111110; // 62  seg–sex
export const WEEKEND = 0b1000001; // 65  sáb + dom

export const SCHEDULE_PRESETS = [
  { mask: ALL_DAYS, label: "todos os dias" },
  { mask: WEEKDAYS, label: "seg a sex" },
  { mask: WEEKEND, label: "fim de semana" },
] as const;

export function isScheduled(mask: number, day: Day): boolean {
  return (mask & (1 << weekday(day))) !== 0;
}

export function toggleWeekday(mask: number, wd: number): number {
  return mask ^ (1 << wd);
}

/** "todos os dias", "seg a sex", "fim de semana" ou a lista: "seg, qua, sex". */
export function scheduleLabel(mask: number): string {
  const preset = SCHEDULE_PRESETS.find((p) => p.mask === mask);
  if (preset) return preset.label;
  // Lista começando na segunda, que é como se lê uma semana no Brasil.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.filter((d) => mask & (1 << d)).map((d) => WEEKDAYS_PT[d]).join(", ");
}

// ---------------------------------------------------------------------------
// Cumprimento
// ---------------------------------------------------------------------------

/**
 * Quanto da meta foi cumprido num dia, de 0 a 1 (docs/SPEC.md §4.2).
 *
 * - boolean: 0 ou 1.
 * - quantity: valor / meta do dia (limitado a 1); usa a meta atual se o registro não tiver snapshot.
 * - github: 1 se houve commit no dia. Um registro manual tem prioridade (corrige erros da sincronização).
 */
export function dayRatio(habit: Habit, log: HabitLog | undefined, commitsOnDay = 0): number {
  switch (habit.kind) {
    case "boolean":
      return log && log.value > 0 ? 1 : 0;
    case "quantity": {
      if (!log || log.value <= 0) return 0;
      const target = log.targetSnapshot ?? habit.target;
      if (!target || target <= 0) return 1;
      return Math.min(log.value / target, 1);
    }
    case "github":
      if (log) return log.value > 0 ? 1 : 0;
      return commitsOnDay > 0 ? 1 : 0;
  }
}

/** O hábito vale neste dia? (dentro da agenda, depois do início, antes de arquivar) */
export function isActiveOn(habit: Habit, day: Day): boolean {
  if (diffDays(habit.startDate, day) < 0) return false;
  if (habit.archivedAt && day > habit.archivedAt.slice(0, 10)) return false;
  return isScheduled(habit.scheduleDays, day);
}

export type RatioLookup = (habit: Habit, day: Day) => number;

/** Monta a função de consulta a partir dos registros e dos commits por dia. */
export function ratioLookup(logs: HabitLog[], commitsByDay: Map<Day, number> = new Map()): RatioLookup {
  const byKey = new Map<string, HabitLog>();
  for (const log of logs) byKey.set(`${log.habitId}|${log.date}`, log);
  return (habit, day) => dayRatio(habit, byKey.get(`${habit.id}|${day}`), commitsByDay.get(day) ?? 0);
}

export type HabitSummary = {
  streak: StreakResult;
  /** Média do cumprimento nos dias agendados do período (0–1). */
  completion: number;
};

/**
 * Sequências e % de cumprimento de um hábito até `today`.
 * O período do % é `[from, today]` (padrão: últimos 30 dias); hoje só entra
 * na conta se já tiver algum progresso, para não penalizar o dia em andamento.
 */
export function summarize(
  habit: Habit,
  ratio: RatioLookup,
  today: Day,
  from: Day = addDays(today, -29),
): HabitSummary {
  const scheduled = (day: Day) => isActiveOn(habit, day);
  const streak = computeStreaks((day) => ratio(habit, day) >= 1, {
    start: habit.startDate,
    today,
    isScheduled: scheduled,
  });
  return { streak, completion: completionRate(habit, ratio, from, today, today) };
}

export function completionRate(habit: Habit, ratio: RatioLookup, from: Day, to: Day, today: Day): number {
  const start = diffDays(habit.startDate, from) < 0 ? habit.startDate : from;
  const end = diffDays(today, to) > 0 ? today : to;
  let total = 0;
  let count = 0;
  for (let i = 0, n = diffDays(start, end); i <= n; i++) {
    const day = addDays(start, i);
    if (!isActiveOn(habit, day)) continue;
    const r = ratio(habit, day);
    if (day === today && r === 0) continue;
    total += r;
    count++;
  }
  return count ? total / count : 0;
}

/**
 * Cumprimento combinado de um dia: média dos hábitos ativos naquele dia.
 * `null` quando nenhum hábito valia no dia (quadradinho neutro).
 */
export function dayCompletion(habits: Habit[], ratio: RatioLookup, day: Day): number | null {
  let total = 0;
  let count = 0;
  for (const habit of habits) {
    if (!isActiveOn(habit, day)) continue;
    total += ratio(habit, day);
    count++;
  }
  return count ? total / count : null;
}

/** Todos os hábitos ativos no dia foram cumpridos (e havia pelo menos um). */
export function isPerfectDay(habits: Habit[], ratio: RatioLookup, day: Day): boolean {
  const c = dayCompletion(habits, ratio, day);
  return c !== null && c >= 1;
}

export function formatAmount(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
