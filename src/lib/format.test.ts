import { describe, expect, it } from "vitest";
import { compact, fmtDay, fmtShortDay, fmtTime, plural, relativeTime } from "./format";

describe("format", () => {
  it("datas", () => {
    expect(fmtDay("2026-11-12")).toBe("12/11/2026");
    expect(fmtShortDay("2026-11-12")).toBe("qui, 12 de nov");
  });

  it("hora no fuso do usuário", () => {
    expect(fmtTime("2026-03-11T02:30:00Z", "America/Sao_Paulo")).toBe("23:30");
  });

  it("tempo relativo", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    expect(relativeTime("2026-11-12T11:59:30Z", now)).toBe("agora");
    expect(relativeTime("2026-11-12T11:55:00Z", now)).toBe("há 5 min");
    expect(relativeTime("2026-11-12T09:00:00Z", now)).toBe("há 3 h");
    expect(relativeTime("2026-11-11T09:00:00Z", now)).toBe("há 1 dia");
    expect(relativeTime("2026-07-01T09:00:00Z", now)).toBe("há 4 meses");
  });

  it("plural e compacto", () => {
    expect(plural(1, "commit")).toBe("1 commit");
    expect(plural(1200, "commit")).toBe("1.200 commits");
    expect(compact(48210).replace(/\s/g, " ")).toBe("48,2 mil");
    expect(compact(950)).toBe("950");
  });
});
