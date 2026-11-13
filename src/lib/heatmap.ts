import { addDays, diffDays, monthOf, weekday, MONTHS_PT, type Day } from "./dates";

/** 0 = vazio … 4 = cheio, como no gráfico do GitHub. */
export type Level = 0 | 1 | 2 | 3 | 4;

/**
 * Nível a partir de quanto da meta foi cumprido (docs/SPEC.md §4.2):
 * 0% → 0 · 1–33% → 1 · 34–66% → 2 · 67–99% → 3 · ≥100% → 4.
 */
export function levelFromRatio(ratio: number | null | undefined): Level {
  if (ratio == null || !Number.isFinite(ratio) || ratio <= 0) return 0;
  if (ratio >= 1) return 4;
  if (ratio >= 0.67) return 3;
  if (ratio >= 0.34) return 2;
  return 1;
}

/**
 * Nível relativo ao maior valor do período (para contagens, ex.: commits por dia).
 * Qualquer valor positivo vale pelo menos 1.
 */
export function levelFromCount(count: number, max: number): Level {
  if (!(count > 0)) return 0;
  if (!(max > 0) || count >= max) return 4;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as Level;
}

export type HeatCell = {
  day: Day;
  level: Level;
  /** Dia fora da agenda (ex.: fim de semana num hábito seg–sex). */
  off?: boolean;
  /** Texto do tooltip / leitor de tela. */
  label?: string;
};

export type HeatGrid = {
  /** Colunas = semanas (domingo→sábado). `null` = antes do início ou depois de `end`. */
  weeks: (HeatCell | null)[][];
  months: { column: number; label: string }[];
  start: Day;
  end: Day;
};

/**
 * Monta a grade do heatmap terminando na semana de `end`.
 * A primeira coluna começa no domingo de (`weeks` − 1) semanas antes.
 */
export function buildGrid(
  end: Day,
  cellFor: (day: Day) => Omit<HeatCell, "day"> | undefined,
  weeks = 53,
): HeatGrid {
  const lastSunday = addDays(end, -weekday(end));
  const start = addDays(lastSunday, -(weeks - 1) * 7);

  const columns: (HeatCell | null)[][] = [];
  const months: HeatGrid["months"] = [];
  let lastMonth = -1;

  for (let w = 0; w < weeks; w++) {
    const column: (HeatCell | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      if (diffDays(day, end) < 0) {
        column.push(null);
        continue;
      }
      const cell = cellFor(day);
      column.push({ day, level: 0, ...cell });
    }
    columns.push(column);

    // Rótulo do mês na primeira semana que contém o dia 1..7 de um mês novo.
    const firstDay = addDays(start, w * 7);
    const month = monthOf(firstDay);
    if (month !== lastMonth) {
      // Evita rótulo espremido na primeira coluna se o mês já começou há dias.
      if (w > 0 || Number(firstDay.slice(8, 10)) <= 7) {
        months.push({ column: w, label: MONTHS_PT[month] });
      }
      lastMonth = month;
    }
  }

  return { weeks: columns, months, start, end };
}
