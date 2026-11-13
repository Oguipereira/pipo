import { describe, expect, it } from "vitest";
import { countdown, occurrences, occursOn, timeLabel, upcomingDeadlines, weekStart, type AgendaEvent } from "./agenda";

const ev = (over: Partial<AgendaEvent> = {}): AgendaEvent => ({
  id: "e",
  title: "Evento",
  type: "aula",
  date: "2026-11-02", // segunda
  startTime: "19:00:00",
  endTime: "21:00:00",
  recurrenceDays: null,
  recurrenceUntil: null,
  location: null,
  notes: null,
  categoryId: null,
  projectId: null,
  taskId: null,
  exceptions: [],
  ...over,
});

// seg e qua = bits 1 e 3
const SEG_QUA = (1 << 1) | (1 << 3);

describe("occursOn", () => {
  it("evento único", () => {
    expect(occursOn(ev(), "2026-11-02")).toBe(true);
    expect(occursOn(ev(), "2026-11-09")).toBe(false);
  });

  it("semanal seg/qua, a partir da data e até o fim", () => {
    const aula = ev({ recurrenceDays: SEG_QUA, recurrenceUntil: "2026-11-30" });
    expect(occursOn(aula, "2026-10-28")).toBe(false); // quarta antes do início
    expect(occursOn(aula, "2026-11-04")).toBe(true); // quarta
    expect(occursOn(aula, "2026-11-05")).toBe(false); // quinta
    expect(occursOn(aula, "2026-11-30")).toBe(true); // segunda, último dia
    expect(occursOn(aula, "2026-12-02")).toBe(false); // depois do fim
  });

  it("dia cancelado", () => {
    const aula = ev({ recurrenceDays: SEG_QUA, exceptions: ["2026-11-04"] });
    expect(occursOn(aula, "2026-11-04")).toBe(false);
    expect(occursOn(aula, "2026-11-09")).toBe(true);
  });
});

describe("occurrences", () => {
  it("ordena por dia e horário, dia inteiro primeiro", () => {
    const list = occurrences(
      [
        ev({ id: "a", title: "Aula", recurrenceDays: SEG_QUA }),
        ev({ id: "b", title: "Prova", type: "prova", date: "2026-11-04", startTime: null, endTime: null }),
        ev({ id: "c", title: "Estudo", type: "estudo", date: "2026-11-04", startTime: "08:00", endTime: null }),
      ],
      "2026-11-02",
      "2026-11-04",
    );
    expect(list.map((o) => `${o.day} ${o.event.id}`)).toEqual(["2026-11-02 a", "2026-11-04 b", "2026-11-04 c", "2026-11-04 a"]);
  });
});

describe("utilitários", () => {
  it("weekStart é segunda", () => {
    expect(weekStart("2026-11-12")).toBe("2026-11-09"); // quinta → segunda
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // domingo → segunda anterior
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
  });

  it("timeLabel", () => {
    expect(timeLabel({ startTime: "19:00:00", endTime: "21:30:00" })).toBe("19:00–21:30");
    expect(timeLabel({ startTime: "08:00", endTime: null })).toBe("08:00");
    expect(timeLabel({ startTime: null, endTime: null })).toBe("dia inteiro");
  });

  it("countdown", () => {
    expect(countdown("2026-11-12", "2026-11-12")).toBe("hoje");
    expect(countdown("2026-11-13", "2026-11-12")).toBe("amanhã");
    expect(countdown("2026-11-20", "2026-11-12")).toBe("em 8 dias");
  });

  it("upcomingDeadlines só provas e entregas", () => {
    const list = upcomingDeadlines(
      [ev({ type: "aula", date: "2026-11-13" }), ev({ id: "p", type: "prova", date: "2026-11-20" })],
      "2026-11-12",
    );
    expect(list.map((o) => o.event.id)).toEqual(["p"]);
  });
});
