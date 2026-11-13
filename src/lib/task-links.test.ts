import { describe, expect, it } from "vitest";
import { planTaskLinks, referencedNumbers } from "./task-links";

const tasks = [
  { id: "t12", number: 12, status: "todo", isCode: true },
  { id: "t13", number: 13, status: "doing", isCode: false },
  { id: "t14", number: 14, status: "done", isCode: true },
];

describe("planTaskLinks", () => {
  it("vincula e conclui só tarefas de programação ainda abertas", () => {
    const links = planTaskLinks(
      [
        { id: "c2", message: "feat: tela #T12 e #T13", committedAt: "2026-11-12T10:00:00Z" },
        { id: "c1", message: "wip #T12", committedAt: "2026-11-11T10:00:00Z" },
        { id: "c3", message: "fix #T14 #T99", committedAt: "2026-11-12T11:00:00Z" },
      ],
      tasks,
    );
    expect(links).toEqual([
      { taskId: "t12", commitId: "c1", closes: true, closedAt: "2026-11-11T10:00:00Z" },
      { taskId: "t12", commitId: "c2", closes: false, closedAt: null },
      { taskId: "t13", commitId: "c2", closes: false, closedAt: null },
      { taskId: "t14", commitId: "c3", closes: false, closedAt: null },
    ]);
  });

  it("sem referências, nada a fazer", () => {
    expect(planTaskLinks([{ id: "c", message: "chore", committedAt: "x" }], tasks)).toEqual([]);
  });

  it("referencedNumbers", () => {
    expect(referencedNumbers([{ message: "#T1 #T2" }, { message: "#T2" }]).sort()).toEqual([1, 2]);
  });
});
