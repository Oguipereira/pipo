import type { Day } from "./dates";

/** 12/11/2026 */
export function fmtDay(day: Day): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/** "qui, 12 nov" */
export function fmtShortDay(day: Day): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${day}T12:00:00Z`))
    .replace(/\./g, "");
}

/** "quinta-feira, 12 de novembro" */
export function fmtLongDay(day: Day): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

/** "novembro de 2026" */
export function fmtMonth(month: string): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month.slice(0, 7)}-15T12:00:00Z`),
  );
}

/** Hora local "23:30" de um instante. */
export function fmtTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(instant));
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias", "há 4 meses" */
export function relativeTime(instant: string, now: Date = new Date()): string {
  const s = Math.max(0, (now.getTime() - new Date(instant).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `há ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86_400);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

export function compact(n: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}
