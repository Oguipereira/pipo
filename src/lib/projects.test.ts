import { describe, expect, it } from "vitest";
import { dueLabel, groupByMilestone, nextStatus, nextTask, orderTasks, progress, type Milestone, type Task } from "./projects";

const ms: Milestone[] = [
  { id: "m2", title: "Lançamento", position: 1, dueDate: null },
  { id: "m1", title: "MVP", position: 0, dueDate: null },
];

const task = (number: number, over: Partial<Task> = {}): Task => ({
  id: `t${number}`,
  number,
  title: `Tarefa ${number}`,
  notes: null,
  status: "todo",
  dueDate: null,
  milestoneId: null,
  categoryId: null,
  position: 0,
  doneAt: null,
  doneVia: null,
  ...over,
});

describe("ordem e próxima tarefa", () => {
  const tasks = [
    task(1, { milestoneId: "m2", position: 0 }),
    task(2, { milestoneId: "m1", position: 1 }),
    task(3, { milestoneId: "m1", position: 0, status: "done" }),
    task(4, { milestoneId: null, position: 0 }),
  ];

  it("ordena por marco e posição, sem marco por último", () => {
    expect(orderTasks(ms, tasks).map((t) => t.number)).toEqual([3, 2, 1, 4]);
  });

  it("próxima é a primeira a fazer na ordem do plano", () => {
    expect(nextTask(ms, tasks)?.number).toBe(2);
  });

  it("'fazendo' tem prioridade", () => {
    const withDoing = [...tasks, task(5, { milestoneId: "m2", position: 3, status: "doing" })];
    expect(nextTask(ms, withDoing)?.number).toBe(5);
  });

  it("tudo feito → null", () => {
    expect(nextTask(ms, [task(1, { status: "done" })])).toBeNull();
  });
});

describe("progress e grupos", () => {
  it("progress", () => {
    expect(progress([{ status: "done" }, { status: "todo" }, { status: "doing" }, { status: "done" }])).toEqual({
      done: 2,
      total: 4,
      ratio: 0.5,
    });
    expect(progress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it("groupByMilestone mantém marcos vazios e põe 'sem marco' no fim", () => {
    const groups = groupByMilestone(ms, [task(1, { milestoneId: "m2" }), task(2)]);
    expect(groups.map((g) => [g.milestone?.title ?? null, g.tasks.map((t) => t.number)])).toEqual([
      ["MVP", []],
      ["Lançamento", [1]],
      [null, [2]],
    ]);
  });
});

describe("status e prazos", () => {
  it("ciclo de status", () => {
    expect(nextStatus("todo")).toBe("doing");
    expect(nextStatus("doing")).toBe("done");
    expect(nextStatus("done")).toBe("todo");
  });

  it("dueLabel", () => {
    const today = "2026-11-12";
    expect(dueLabel(null, today)).toBeNull();
    expect(dueLabel("2026-11-12", today)).toEqual({ text: "vence hoje", late: false });
    expect(dueLabel("2026-11-13", today)).toEqual({ text: "vence amanhã", late: false });
    expect(dueLabel("2026-11-17", today)).toEqual({ text: "em 5 dias", late: false });
    expect(dueLabel("2026-11-11", today)).toEqual({ text: "atrasada há 1 dia", late: true });
    expect(dueLabel("2026-11-01", today, "done")).toBeNull();
  });
});
