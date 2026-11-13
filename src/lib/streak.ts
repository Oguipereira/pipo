import { addDays, diffDays, type Day } from "./dates";

export type StreakResult = {
  current: number;
  best: number;
  /** Dias agendados com atividade no período. */
  activeDays: number;
  /** Dias agendados no período (até `today`). */
  scheduledDays: number;
};

export type StreakOptions = {
  /** Primeiro dia considerado (ex.: criação do hábito). */
  start: Day;
  /** Hoje, no fuso do usuário. */
  today: Day;
  /** O dia conta? Dias fora da agenda não somam nem quebram a sequência. */
  isScheduled?: (day: Day) => boolean;
};

/**
 * Sequência atual e melhor sequência (docs/SPEC.md §4.2).
 *
 * - Só dias agendados contam; os demais são ignorados (nem somam, nem quebram).
 * - Hoje, se ainda não cumprido, não quebra a sequência atual: o dia ainda não acabou.
 */
export function computeStreaks(
  isDone: (day: Day) => boolean,
  { start, today, isScheduled = () => true }: StreakOptions,
): StreakResult {
  const total = diffDays(start, today);
  if (total < 0) return { current: 0, best: 0, activeDays: 0, scheduledDays: 0 };

  let best = 0;
  let run = 0;
  let activeDays = 0;
  let scheduledDays = 0;

  for (let i = 0; i <= total; i++) {
    const day = addDays(start, i);
    if (!isScheduled(day)) continue;
    scheduledDays++;
    if (isDone(day)) {
      activeDays++;
      run++;
      if (run > best) best = run;
    } else if (day !== today) {
      run = 0;
    }
  }

  // Sequência atual: anda para trás a partir de hoje.
  let current = 0;
  for (let i = total; i >= 0; i--) {
    const day = addDays(start, i);
    if (!isScheduled(day)) continue;
    if (isDone(day)) {
      current++;
    } else if (day === today) {
      continue; // hoje pendente
    } else {
      break;
    }
  }

  return { current, best, activeDays, scheduledDays };
}
