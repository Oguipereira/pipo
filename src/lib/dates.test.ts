import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  diffDays,
  isDay,
  isValidTimeZone,
  localDate,
  today,
  weekday,
} from "./dates";

const SP = "America/Sao_Paulo";

describe("localDate", () => {
  it("commit às 23h no Brasil fica no mesmo dia, mesmo já sendo o dia seguinte em UTC", () => {
    // 2026-03-10 23:30 em São Paulo = 2026-03-11 02:30 UTC
    expect(localDate("2026-03-11T02:30:00Z", SP)).toBe("2026-03-10");
  });

  it("aceita instantes com offset explícito", () => {
    expect(localDate("2026-03-10T23:59:59-03:00", SP)).toBe("2026-03-10");
    expect(localDate("2026-03-11T00:00:00-03:00", SP)).toBe("2026-03-11");
  });

  it("a virada do dia é meia-noite local, não UTC", () => {
    expect(localDate("2026-03-11T02:59:59Z", SP)).toBe("2026-03-10");
    expect(localDate("2026-03-11T03:00:00Z", SP)).toBe("2026-03-11");
  });

  it("respeita o fuso de cada usuário (SaaS)", () => {
    const instant = "2026-03-11T02:30:00Z";
    expect(localDate(instant, "UTC")).toBe("2026-03-11");
    expect(localDate(instant, "Asia/Tokyo")).toBe("2026-03-11");
    expect(localDate(instant, "America/Los_Angeles")).toBe("2026-03-10");
  });

  it("lida com horário de verão (Nova York, março)", () => {
    // 2026-03-08 é o dia da mudança nos EUA
    expect(localDate("2026-03-08T04:30:00Z", "America/New_York")).toBe("2026-03-07");
    expect(localDate("2026-03-08T05:30:00Z", "America/New_York")).toBe("2026-03-08");
  });

  it("rejeita instantes inválidos", () => {
    expect(() => localDate("não é data", SP)).toThrow(RangeError);
  });
});

describe("today", () => {
  it("usa o fuso do usuário", () => {
    const now = new Date("2026-11-13T01:00:00Z"); // 22h do dia 12 em SP
    expect(today(SP, now)).toBe("2026-11-12");
    expect(today("UTC", now)).toBe("2026-11-13");
  });
});

describe("aritmética de dias", () => {
  it("addDays atravessa meses e anos", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("não é afetada por horário de verão", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });

  it("diffDays e daysBetween", () => {
    expect(diffDays("2026-01-01", "2026-12-31")).toBe(364);
    expect(diffDays("2026-01-02", "2026-01-01")).toBe(-1);
    expect(daysBetween("2026-02-27", "2026-03-02")).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
    expect(daysBetween("2026-03-02", "2026-03-01")).toEqual([]);
  });

  it("weekday: 0 = domingo", () => {
    expect(weekday("2026-11-15")).toBe(0);
    expect(weekday("2026-11-12")).toBe(4);
  });
});

describe("validação", () => {
  it("isDay", () => {
    expect(isDay("2026-02-28")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("2026-2-3")).toBe(false);
  });

  it("isValidTimeZone", () => {
    expect(isValidTimeZone(SP)).toBe(true);
    expect(isValidTimeZone("Marte/Olympus")).toBe(false);
  });

  it("addDays rejeita dia inválido", () => {
    expect(() => addDays("2026-13-01", 1)).toThrow(RangeError);
  });
});
