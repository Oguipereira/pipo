import { describe, expect, it } from "vitest";
import {
  ALL_DAYS,
  completionRate,
  dayCompletion,
  dayRatio,
  isActiveOn,
  isPerfectDay,
  isScheduled,
  ratioLookup,
  scheduleLabel,
  summarize,
  toggleWeekday,
  WEEKDAYS,
  WEEKEND,
  type Habit,
  type HabitLog,
} from "./habits";

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Hábito",
  kind: "boolean",
  target: null,
  unit: null,
  scheduleDays: ALL_DAYS,
  startDate: "2026-11-01",
  archivedAt: null,
  categoryId: null,
  position: 0,
  ...over,
});

const log = (date: string, value: number, over: Partial<HabitLog> = {}): HabitLog => ({
  habitId: "h1",
  date,
  value,
  targetSnapshot: null,
  ...over,
});

describe("agenda semanal", () => {
  // 2026-11-09 seg · 14 sáb · 15 dom
  it("seg–sex", () => {
    expect(isScheduled(WEEKDAYS, "2026-11-09")).toBe(true);
    expect(isScheduled(WEEKDAYS, "2026-11-14")).toBe(false);
    expect(isScheduled(WEEKDAYS, "2026-11-15")).toBe(false);
  });

  it("fim de semana", () => {
    expect(isScheduled(WEEKEND, "2026-11-14")).toBe(true);
    expect(isScheduled(WEEKEND, "2026-11-09")).toBe(false);
  });

  it("rótulos", () => {
    expect(scheduleLabel(ALL_DAYS)).toBe("todos os dias");
    expect(scheduleLabel(WEEKDAYS)).toBe("seg a sex");
    expect(scheduleLabel(WEEKEND)).toBe("fim de semana");
    // seg, qua, sex = bits 1, 3, 5
    expect(scheduleLabel(0b0101010)).toBe("seg, qua, sex");
    expect(scheduleLabel(0b0000001)).toBe("dom");
  });

  it("toggleWeekday liga e desliga", () => {
    expect(toggleWeekday(WEEKDAYS, 6)).toBe(0b1111110);
    expect(toggleWeekday(0b1111110, 6)).toBe(WEEKDAYS);
  });
});

describe("dayRatio", () => {
  it("sim/não", () => {
    expect(dayRatio(habit(), undefined)).toBe(0);
    expect(dayRatio(habit(), log("2026-11-02", 1))).toBe(1);
    expect(dayRatio(habit(), log("2026-11-02", 0))).toBe(0);
  });

  it("quantidade usa a meta do dia, não a atual", () => {
    const agua = habit({ kind: "quantity", target: 10, unit: "copos" });
    expect(dayRatio(agua, log("2026-11-02", 4, { targetSnapshot: 8 }))).toBe(0.5);
    expect(dayRatio(agua, log("2026-11-02", 4))).toBe(0.4); // sem snapshot: meta atual
    expect(dayRatio(agua, log("2026-11-02", 12, { targetSnapshot: 8 }))).toBe(1);
  });

  it("automático pelo GitHub: ≥ 1 commit no dia", () => {
    const estudo = habit({ kind: "github" });
    expect(dayRatio(estudo, undefined, 0)).toBe(0);
    expect(dayRatio(estudo, undefined, 1)).toBe(1);
    expect(dayRatio(estudo, undefined, 7)).toBe(1);
  });

  it("automático: registro manual corrige a sincronização", () => {
    const estudo = habit({ kind: "github" });
    expect(dayRatio(estudo, log("2026-11-02", 1), 0)).toBe(1);
    expect(dayRatio(estudo, log("2026-11-02", 0), 3)).toBe(0);
  });
});

describe("isActiveOn", () => {
  it("respeita início, arquivamento e agenda", () => {
    const h = habit({ startDate: "2026-11-05", scheduleDays: WEEKDAYS, archivedAt: "2026-11-20T10:00:00Z" });
    expect(isActiveOn(h, "2026-11-04")).toBe(false); // antes do início
    expect(isActiveOn(h, "2026-11-06")).toBe(true); // sexta
    expect(isActiveOn(h, "2026-11-07")).toBe(false); // sábado
    expect(isActiveOn(h, "2026-11-20")).toBe(true); // dia do arquivamento ainda conta
    expect(isActiveOn(h, "2026-11-23")).toBe(false); // depois
  });
});

describe("summarize e completionRate", () => {
  const today = "2026-11-12"; // quinta

  it("streak com agenda seg–sex ignora o fim de semana", () => {
    const h = habit({ scheduleDays: WEEKDAYS, startDate: "2026-11-02" });
    const logs = ["2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10", "2026-11-11"].map((d) => log(d, 1));
    const s = summarize(h, ratioLookup(logs), today);
    expect(s.streak.current).toBe(5); // hoje pendente não quebra
    expect(s.streak.best).toBe(5);
  });

  it("% ignora hoje enquanto não houver progresso", () => {
    const h = habit({ startDate: "2026-11-10" });
    const r = ratioLookup([log("2026-11-10", 1), log("2026-11-11", 0)]);
    // 10 = 1, 11 = 0, 12 (hoje, vazio) fora → 50%
    expect(completionRate(h, r, "2026-11-01", today, today)).toBe(0.5);
    // hoje feito entra: (1 + 0 + 1) / 3
    const r2 = ratioLookup([log("2026-11-10", 1), log("2026-11-11", 0), log(today, 1)]);
    expect(completionRate(h, r2, "2026-11-01", today, today)).toBeCloseTo(2 / 3);
  });

  it("% de quantidade é a média parcial da meta", () => {
    const h = habit({ kind: "quantity", target: 8, startDate: "2026-11-10" });
    const r = ratioLookup([
      log("2026-11-10", 8, { targetSnapshot: 8 }),
      log("2026-11-11", 4, { targetSnapshot: 8 }),
    ]);
    expect(completionRate(h, r, "2026-11-10", "2026-11-11", today)).toBe(0.75);
  });

  it("período sem dias agendados dá 0", () => {
    const h = habit({ scheduleDays: WEEKEND, startDate: "2026-11-09" });
    expect(completionRate(h, ratioLookup([]), "2026-11-09", "2026-11-12", today)).toBe(0);
  });
});

describe("dia combinado", () => {
  const a = habit({ id: "a" });
  const b = habit({ id: "b", kind: "quantity", target: 4 });
  const c = habit({ id: "c", scheduleDays: WEEKEND });
  const logs: HabitLog[] = [
    { habitId: "a", date: "2026-11-12", value: 1, targetSnapshot: null },
    { habitId: "b", date: "2026-11-12", value: 2, targetSnapshot: 4 },
  ];
  const r = ratioLookup(logs);

  it("média só dos hábitos que valem no dia", () => {
    // quinta: c (fim de semana) não conta → (1 + 0.5) / 2
    expect(dayCompletion([a, b, c], r, "2026-11-12")).toBe(0.75);
  });

  it("null quando nenhum hábito vale", () => {
    expect(dayCompletion([c], r, "2026-11-12")).toBeNull();
    expect(dayCompletion([], r, "2026-11-12")).toBeNull();
  });

  it("dia perfeito", () => {
    expect(isPerfectDay([a, b], r, "2026-11-12")).toBe(false);
    expect(isPerfectDay([a], r, "2026-11-12")).toBe(true);
    expect(isPerfectDay([c], r, "2026-11-12")).toBe(false);
  });
});
