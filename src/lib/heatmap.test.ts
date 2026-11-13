import { describe, expect, it } from "vitest";
import { buildGrid, levelFromCount, levelFromRatio } from "./heatmap";

describe("levelFromRatio", () => {
  it.each([
    [null, 0],
    [0, 0],
    [-1, 0],
    [Number.NaN, 0],
    [0.01, 1],
    [0.33, 1],
    [0.34, 2],
    [0.66, 2],
    [0.67, 3],
    [0.99, 3],
    [1, 4],
    [1.5, 4],
  ] as const)("%s → %s", (ratio, level) => {
    expect(levelFromRatio(ratio)).toBe(level);
  });

  it("água 5 de 8 copos (62,5%) é nível 2; 6 de 8 (75%) é nível 3", () => {
    expect(levelFromRatio(5 / 8)).toBe(2);
    expect(levelFromRatio(6 / 8)).toBe(3);
  });
});

describe("levelFromCount", () => {
  it("é relativo ao máximo do período", () => {
    expect(levelFromCount(0, 10)).toBe(0);
    expect(levelFromCount(1, 10)).toBe(1);
    expect(levelFromCount(3, 10)).toBe(2);
    expect(levelFromCount(6, 10)).toBe(3);
    expect(levelFromCount(10, 10)).toBe(4);
  });

  it("qualquer atividade com máximo zero/indefinido vira cheio", () => {
    expect(levelFromCount(2, 0)).toBe(4);
  });
});

describe("buildGrid", () => {
  // 2026-11-12 é quinta-feira
  const grid = buildGrid("2026-11-12", () => ({ level: 1 }), 53);

  it("tem 53 semanas de domingo a sábado", () => {
    expect(grid.weeks).toHaveLength(53);
    grid.weeks.forEach((w) => expect(w).toHaveLength(7));
  });

  it("começa num domingo e termina na semana do dia final", () => {
    // 52 semanas antes do domingo 2026-11-08
    expect(grid.start).toBe("2025-11-09");
    const last = grid.weeks.at(-1)!;
    expect(last[0]?.day).toBe("2026-11-08");
    expect(last[4]?.day).toBe("2026-11-12");
  });

  it("dias futuros ficam vazios (null)", () => {
    const last = grid.weeks.at(-1)!;
    expect(last[5]).toBeNull();
    expect(last[6]).toBeNull();
  });

  it("rotula os meses em português", () => {
    const labels = grid.months.map((m) => m.label);
    expect(labels).toContain("dez");
    expect(labels).toContain("nov");
    expect(labels.at(-1)).toBe("nov");
  });

  it("repassa células fora da agenda", () => {
    const g = buildGrid("2026-11-12", (day) => ({ level: 0, off: day === "2026-11-08" }), 1);
    expect(g.weeks[0][0]?.off).toBe(true);
    expect(g.weeks[0][1]?.off).toBe(false);
  });
});
