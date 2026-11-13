import { describe, expect, it } from "vitest";
import { formatTaskRef, parseTaskRefs } from "./task-refs";

describe("parseTaskRefs", () => {
  it.each([
    ["feat: login com GitHub #T12", [12]],
    ["#T1 primeira tarefa", [1]],
    ["fix #t7 (minúsculo)", [7]],
    ["refactor (#T3), docs #T4.", [3, 4]],
    ["closes #T5, #T5 e #T2", [2, 5]],
    ["linha 1\n\ncorpo com #T9", [9]],
    ["#T007 com zeros", [7]],
  ])("%j → %j", (msg, expected) => {
    expect(parseTaskRefs(msg)).toEqual(expected);
  });

  it.each([
    "sem referência",
    "issue do GitHub #12",
    "abc#T12 colado numa palavra",
    "#T12a sufixo",
    "#T0 não existe",
    "#T sem número",
    "T12 sem cerquilha",
    "_#T12 com underscore",
  ])("ignora %j", (msg) => {
    expect(parseTaskRefs(msg)).toEqual([]);
  });

  it("formatTaskRef", () => {
    expect(formatTaskRef(12)).toBe("#T12");
  });
});
