import "server-only";
import { addDays, today, weekday, DEFAULT_TIMEZONE, type Day } from "./dates";
import type { Habit, HabitLog } from "./habits";
import type { Category } from "./data/habits";
import { sampleContributions } from "./sample";

/**
 * Modo demonstração (só desenvolvimento): `PIPO_DEMO=1 npm run dev`.
 * As funções de dados devolvem um conjunto fictício e determinístico, sem banco
 * nem login. Usado para prints do README e revisão visual. Nunca liga em produção.
 */
export const DEMO =
  process.env.PIPO_DEMO === "1" && process.env.NODE_ENV !== "production" && !process.env.VERCEL;

export const demoToday = (): Day => today(DEFAULT_TIMEZONE);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const demoCategories: Category[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Programação", color: "#39d353", isCode: true },
  { id: "00000000-0000-4000-8000-000000000002", name: "Estudos", color: "#58a6ff", isCode: false },
  { id: "00000000-0000-4000-8000-000000000003", name: "Saúde", color: "#f778ba", isCode: false },
  { id: "00000000-0000-4000-8000-000000000004", name: "Pessoal", color: "#d29922", isCode: false },
];

const [PROG, EST, SAUDE, PESSOAL] = demoCategories.map((c) => c.id);

const habit = (n: number, h: Omit<Habit, "id" | "archivedAt" | "position">): Habit => ({
  id: `00000000-0000-4000-9000-00000000000${n}`,
  archivedAt: null,
  position: n,
  ...h,
});

export const demoHabits: Habit[] = [
  habit(1, { name: "Água", kind: "quantity", target: 8, unit: "copos", scheduleDays: 127, startDate: "2026-05-01", categoryId: SAUDE }),
  habit(2, { name: "Academia", kind: "boolean", target: null, unit: null, scheduleDays: 62, startDate: "2026-06-01", categoryId: SAUDE }),
  habit(3, { name: "Estudar programação", kind: "github", target: null, unit: null, scheduleDays: 62, startDate: "2026-04-01", categoryId: PROG }),
  habit(4, { name: "Leitura", kind: "quantity", target: 20, unit: "páginas", scheduleDays: 127, startDate: "2026-07-15", categoryId: PESSOAL }),
  habit(5, { name: "Inglês", kind: "quantity", target: 30, unit: "min", scheduleDays: 0b0101010, startDate: "2026-08-01", categoryId: EST }),
];

export function demoCommitCounts(): Map<Day, number> {
  return sampleContributions(demoToday(), 371, 7);
}

export function demoLogs(): HabitLog[] {
  const rand = rng(42);
  const end = demoToday();
  const logs: HabitLog[] = [];
  for (const h of demoHabits) {
    for (let d = h.startDate; d <= end; d = addDays(d, 1)) {
      if (h.kind === "github") continue;
      const wd = weekday(d);
      if (!(h.scheduleDays & (1 << wd))) continue;
      // Hoje: só alguns já marcados, para o check-in parecer um dia real.
      if (d === end && h.position > 2) continue;
      const r = rand();
      if (r < 0.2) continue;
      const target = h.target ?? 1;
      const value = h.kind === "boolean" ? 1 : r > 0.55 ? target : Math.max(1, Math.round(target * r));
      logs.push({ habitId: h.id, date: d, value, targetSnapshot: h.target });
    }
  }
  return logs;
}
