import { describe, expect, it } from "vitest";
import { ALL_DAYS, ratioLookup, WEEKDAYS, type Habit, type HabitLog } from "./habits";
import { buildMonthReport, compareMonths, delta, isMonth, monthRange, shiftMonth } from "./report";

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id,
  name: id,
  kind: "boolean",
  target: null,
  unit: null,
  scheduleDays: ALL_DAYS,
  startDate: "2026-01-01",
  archivedAt: null,
  categoryId: null,
  position: 0,
  ...over,
});
const log = (habitId: string, date: string, value = 1): HabitLog => ({ habitId, date, value, targetSnapshot: null });

describe("meses", () => {
  it("monthRange", () => {
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("shiftMonth atravessa anos", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-11", -13)).toBe("2025-10");
  });

  it("isMonth", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("26-11")).toBe(false);
  });
});

describe("buildMonthReport", () => {
  // Fevereiro de 2026: 28 dias, começa num domingo. 20 dias úteis.
  const a = habit("a"); // todos os dias
  const b = habit("b", { scheduleDays: WEEKDAYS }); // seg–sex
  const logs: HabitLog[] = [];
  for (let d = 1; d <= 28; d++) {
    const day = `2026-02-${String(d).padStart(2, "0")}`;
    if (d <= 10) logs.push(log("a", day)); // a: 10 primeiros dias
    logs.push(log("b", day)); // b: todo dia (fins de semana não contam)
  }
  const base = {
    month: "2026-02",
    today: "2026-11-12",
    habits: [a, b],
    ratio: ratioLookup(logs),
    commitsByDay: new Map([
      ["2026-02-03", 4],
      ["2026-02-04", 1],
      ["2026-01-31", 9], // fora do mês
    ]),
    repos: [
      { fullName: "me/api", commits: 1 },
      { fullName: "me/pipo", commits: 4 },
    ],
    tasksDone: [
      { project: "pipo", day: "2026-02-10" },
      { project: "pipo", day: "2026-02-11" },
      { project: "api", day: "2026-02-20" },
      { project: "api", day: "2026-03-01" },
    ],
    studyDays: ["2026-02-02", "2026-02-04", "2026-03-02"],
  };

  const r = buildMonthReport(base);

  it("% e melhor sequência por hábito", () => {
    const byId = Object.fromEntries(r.habits.map((h) => [h.habit.id, h]));
    expect(byId.b.completion).toBe(1);
    expect(byId.b.scheduledDays).toBe(20);
    expect(byId.b.bestStreak).toBe(20);
    expect(byId.a.completion).toBeCloseTo(10 / 28);
    expect(byId.a.bestStreak).toBe(10);
    expect(r.habits[0].habit.id).toBe("b"); // ordenado por %
  });

  it("dias perfeitos consideram só os hábitos agendados no dia", () => {
    // dias 1..10: a feito; b feito ou fora da agenda → perfeitos
    expect(r.perfectDays).toBe(10);
  });

  it("commits, repositório mais ativo, tarefas e estudo", () => {
    expect(r.commits).toBe(5);
    expect(r.commitDays).toBe(2);
    expect(r.bestCommitDay).toEqual({ day: "2026-02-03", commits: 4 });
    expect(r.topRepo).toEqual({ fullName: "me/pipo", commits: 4 });
    expect(r.tasksDone).toBe(3);
    expect(r.tasksByProject).toEqual([
      { project: "pipo", done: 2 },
      { project: "api", done: 1 },
    ]);
    expect(r.studySessions).toBe(2);
    expect(r.partial).toBe(false);
  });

  it("mês em andamento para em hoje", () => {
    const current = buildMonthReport({ ...base, month: "2026-11", today: "2026-11-12" });
    expect(current.end).toBe("2026-11-12");
    expect(current.partial).toBe(true);
  });

  it("hábito criado depois do mês fica de fora", () => {
    const later = habit("c", { startDate: "2026-05-01" });
    const rep = buildMonthReport({ ...base, habits: [a, b, later] });
    expect(rep.habits.map((h) => h.habit.id)).not.toContain("c");
  });

  it("compara com o mês anterior", () => {
    const prev = buildMonthReport({ ...base, month: "2026-01" });
    const cmp = compareMonths(r, prev);
    expect(cmp.commits).toEqual({ value: 5, previous: 9, diff: -4, direction: "down" });
    expect(cmp.tasksDone.direction).toBe("up");
    expect(delta(3, 3).direction).toBe("same");
  });
});
