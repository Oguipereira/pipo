import { addDays, diffDays, weekday, type Day } from "./dates";

/**
 * Dados de exemplo determinísticos para ver as telas antes de existir dado real.
 * Mesma semente = mesmo resultado (útil para prints do README e testes visuais).
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Commits por dia num ano: mais ativo em dias úteis, com uma "pausa de férias". */
export function sampleContributions(end: Day, days = 371, seed = 7): Map<Day, number> {
  const rand = mulberry32(seed);
  const out = new Map<Day, number>();
  const start = addDays(end, -(days - 1));
  const vacationStart = addDays(start, Math.floor(days * 0.42));

  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const wd = weekday(day);
    const onVacation = diffDays(vacationStart, day) >= 0 && diffDays(vacationStart, day) < 12;
    const base = wd === 0 || wd === 6 ? 0.35 : 0.78;
    const r = rand();
    if (onVacation || r > base) {
      out.set(day, 0);
      continue;
    }
    const intensity = rand();
    out.set(day, Math.max(1, Math.round(intensity ** 2 * 14)));
  }
  return out;
}

/** % médio de hábitos cumpridos por dia (0–1). */
export function sampleHabitRatios(end: Day, days = 371, seed = 21): Map<Day, number> {
  const rand = mulberry32(seed);
  const out = new Map<Day, number>();
  const start = addDays(end, -(days - 1));
  // O hábito "pega" com o tempo: a chance de cumprir sobe ao longo do ano.
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const progress = i / days;
    const chance = 0.35 + progress * 0.5;
    const r = rand();
    if (r > chance + 0.15) out.set(day, 0);
    else out.set(day, Math.min(1, rand() * 0.6 + progress * 0.6));
  }
  return out;
}
