import { describe, expect, it } from "vitest";
import { weekday, type Day } from "./dates";
import { computeStreaks } from "./streak";

const done = (days: Day[]) => {
  const set = new Set(days);
  return (day: Day) => set.has(day);
};

const weekdaysOnly = (day: Day) => {
  const wd = weekday(day);
  return wd >= 1 && wd <= 5;
};

describe("computeStreaks (todos os dias)", () => {
  it("sequência simples até hoje", () => {
    const r = computeStreaks(done(["2026-11-10", "2026-11-11", "2026-11-12"]), {
      start: "2026-11-01",
      today: "2026-11-12",
    });
    expect(r.current).toBe(3);
    expect(r.best).toBe(3);
  });

  it("hoje ainda não cumprido não quebra a sequência", () => {
    const r = computeStreaks(done(["2026-11-10", "2026-11-11"]), {
      start: "2026-11-01",
      today: "2026-11-12",
    });
    expect(r.current).toBe(2);
  });

  it("ontem vazio quebra a sequência", () => {
    const r = computeStreaks(done(["2026-11-09", "2026-11-10"]), {
      start: "2026-11-01",
      today: "2026-11-12",
    });
    expect(r.current).toBe(0);
    expect(r.best).toBe(2);
  });

  it("guarda a melhor sequência do passado", () => {
    const r = computeStreaks(
      done(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-11", "2026-11-12"]),
      { start: "2026-11-01", today: "2026-11-12" },
    );
    expect(r.best).toBe(4);
    expect(r.current).toBe(2);
    expect(r.activeDays).toBe(6);
    expect(r.scheduledDays).toBe(12);
  });

  it("período vazio ou invertido", () => {
    expect(computeStreaks(done([]), { start: "2026-11-12", today: "2026-11-01" })).toEqual({
      current: 0,
      best: 0,
      activeDays: 0,
      scheduledDays: 0,
    });
  });
});

describe("computeStreaks (agenda seg–sex)", () => {
  // 2026-11-06 sex · 07 sáb · 08 dom · 09 seg · 12 qui
  it("fim de semana não quebra a sequência", () => {
    const r = computeStreaks(
      done(["2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]),
      { start: "2026-11-02", today: "2026-11-12", isScheduled: weekdaysOnly },
    );
    expect(r.current).toBe(6);
    expect(r.best).toBe(6);
  });

  it("fim de semana não soma, mesmo se marcado", () => {
    const r = computeStreaks(done(["2026-11-07", "2026-11-08"]), {
      start: "2026-11-02",
      today: "2026-11-12",
      isScheduled: weekdaysOnly,
    });
    expect(r.best).toBe(0);
    expect(r.activeDays).toBe(0);
    expect(r.scheduledDays).toBe(9);
  });

  it("hoje sendo sábado: a sequência de sexta continua valendo", () => {
    const r = computeStreaks(done(["2026-11-12", "2026-11-13"]), {
      start: "2026-11-09",
      today: "2026-11-14",
      isScheduled: weekdaysOnly,
    });
    expect(r.current).toBe(2);
  });
});
