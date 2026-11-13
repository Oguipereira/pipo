import { addDays, diffDays, weekday, type Day } from "./dates";

export type EventType = "aula" | "estudo" | "prova" | "entrega" | "reuniao" | "outro";

export const EVENT_TYPES: { type: EventType; label: string; color: string }[] = [
  { type: "aula", label: "Aula", color: "#58a6ff" },
  { type: "estudo", label: "Estudo", color: "#39d353" },
  { type: "prova", label: "Prova", color: "#f0883e" },
  { type: "entrega", label: "Entrega", color: "#f778ba" },
  { type: "reuniao", label: "Reunião", color: "#a371f7" },
  { type: "outro", label: "Outro", color: "#7f8894" },
];

export const typeInfo = (type: string) => EVENT_TYPES.find((t) => t.type === type) ?? EVENT_TYPES[5];

export type AgendaEvent = {
  id: string;
  title: string;
  type: EventType;
  /** Primeira ocorrência (ou única). */
  date: Day;
  /** "HH:MM" ou "HH:MM:SS" (horário de parede); null = dia inteiro. */
  startTime: string | null;
  endTime: string | null;
  /** Bitmask dom→sáb; null = não se repete. */
  recurrenceDays: number | null;
  recurrenceUntil: Day | null;
  location: string | null;
  notes: string | null;
  categoryId: string | null;
  projectId: string | null;
  taskId: string | null;
  /** Ocorrências canceladas. */
  exceptions: Day[];
};

export type Occurrence = { event: AgendaEvent; day: Day };

export function occursOn(event: AgendaEvent, day: Day): boolean {
  if (event.exceptions.includes(day)) return false;
  if (event.recurrenceDays == null) return day === event.date;
  if (diffDays(event.date, day) < 0) return false;
  if (event.recurrenceUntil && diffDays(day, event.recurrenceUntil) < 0) return false;
  return (event.recurrenceDays & (1 << weekday(day))) !== 0;
}

/** Ocorrências no intervalo, por dia e horário (dia inteiro primeiro). */
export function occurrences(events: AgendaEvent[], from: Day, to: Day): Occurrence[] {
  const out: Occurrence[] = [];
  for (let i = 0, n = diffDays(from, to); i <= n; i++) {
    const day = addDays(from, i);
    for (const event of events) if (occursOn(event, day)) out.push({ event, day });
  }
  return out.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (a.event.startTime ?? "").localeCompare(b.event.startTime ?? "") ||
      a.event.title.localeCompare(b.event.title),
  );
}

/** Segunda-feira da semana de `day`. */
export function weekStart(day: Day): Day {
  return addDays(day, -((weekday(day) + 6) % 7));
}

/** "19:00–21:00", "19:00" ou "dia inteiro". */
export function timeLabel(event: Pick<AgendaEvent, "startTime" | "endTime">): string {
  const hm = (t: string) => t.slice(0, 5);
  if (!event.startTime) return "dia inteiro";
  return event.endTime ? `${hm(event.startTime)}–${hm(event.endTime)}` : hm(event.startTime);
}

/** "hoje", "amanhã", "em 3 dias" até a ocorrência. */
export function countdown(day: Day, today: Day): string {
  const d = diffDays(today, day);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `em ${d} dias`;
}

/** Próximas provas e entregas a partir de hoje (até `days` dias). */
export function upcomingDeadlines(events: AgendaEvent[], today: Day, days = 60): Occurrence[] {
  return occurrences(
    events.filter((e) => e.type === "prova" || e.type === "entrega"),
    today,
    addDays(today, days),
  );
}
