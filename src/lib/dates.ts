import { format } from "date-fns";
import { tz } from "@date-fns/tz";

/**
 * O "dia" no pipo é sempre uma data de calendário local no fuso do usuário,
 * representada como string ISO `YYYY-MM-DD` (ver docs/SPEC.md §3).
 *
 * Aritmética de dias é feita sobre a data de calendário (em UTC puro), nunca
 * sobre instantes, para não sofrer com horário de verão.
 */
export type Day = string;

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function isDay(value: string): value is Day {
  if (!DAY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Data local (no fuso informado) de um instante. */
export function localDate(instant: Date | string | number, timeZone: string): Day {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Instante inválido: ${String(instant)}`);
  }
  return format(date, "yyyy-MM-dd", { in: tz(timeZone) });
}

/** "Hoje" no fuso do usuário. */
export function today(timeZone: string, now: Date = new Date()): Day {
  return localDate(now, timeZone);
}

function toUtcMs(day: Day): number {
  if (!isDay(day)) throw new RangeError(`Dia inválido: ${day}`);
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): Day {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: Day, amount: number): Day {
  return fromUtcMs(toUtcMs(day) + amount * MS_PER_DAY);
}

/** Quantos dias de `a` até `b` (positivo se `b` vem depois). */
export function diffDays(a: Day, b: Day): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / MS_PER_DAY);
}

/** 0 = domingo … 6 = sábado. */
export function weekday(day: Day): number {
  return new Date(toUtcMs(day)).getUTCDay();
}

/** Todos os dias de `start` até `end`, inclusive. */
export function daysBetween(start: Day, end: Day): Day[] {
  const total = diffDays(start, end);
  if (total < 0) return [];
  return Array.from({ length: total + 1 }, (_, i) => addDays(start, i));
}

export function monthOf(day: Day): number {
  return Number(day.slice(5, 7)) - 1;
}

export const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
] as const;

export const WEEKDAYS_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
