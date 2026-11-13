import { diffDays, type Day } from "./dates";

export type TaskStatus = "todo" | "doing" | "done";
export type ProjectStatus = "active" | "paused" | "done";

export type Task = {
  id: string;
  number: number;
  title: string;
  notes: string | null;
  status: TaskStatus;
  dueDate: Day | null;
  milestoneId: string | null;
  categoryId: string | null;
  position: number;
  doneAt: string | null;
  doneVia: "manual" | "commit" | null;
};

export type Milestone = { id: string; title: string; position: number; dueDate: Day | null };

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { todo: "a fazer", doing: "fazendo", done: "feito" };
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = { active: "ativo", paused: "pausado", done: "concluído" };

/** Ciclo do status com um toque: a fazer → fazendo → feito → a fazer. */
export function nextStatus(status: TaskStatus): TaskStatus {
  return status === "todo" ? "doing" : status === "doing" ? "done" : "todo";
}

/** Tarefas na ordem do plano: marcos em ordem (sem marco por último), depois a posição. */
export function orderTasks(milestones: Milestone[], tasks: Task[]): Task[] {
  const rank = new Map(milestones.map((m) => [m.id, m.position]));
  const milestoneRank = (t: Task) => (t.milestoneId != null && rank.has(t.milestoneId) ? rank.get(t.milestoneId)! : Infinity);
  return [...tasks].sort(
    (a, b) => milestoneRank(a) - milestoneRank(b) || a.position - b.position || a.number - b.number,
  );
}

/**
 * Próxima tarefa do projeto: a primeira "fazendo" na ordem do plano;
 * se não houver, a primeira "a fazer". null quando tudo está feito.
 */
export function nextTask(milestones: Milestone[], tasks: Task[]): Task | null {
  const ordered = orderTasks(milestones, tasks);
  return ordered.find((t) => t.status === "doing") ?? ordered.find((t) => t.status === "todo") ?? null;
}

export function progress(tasks: Pick<Task, "status">[]) {
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total: tasks.length, ratio: tasks.length ? done / tasks.length : 0 };
}

export type TaskGroup = { milestone: Milestone | null; tasks: Task[] };

/** Agrupa por marco (na ordem) e deixa "sem marco" no fim, só se tiver tarefas. */
export function groupByMilestone(milestones: Milestone[], tasks: Task[]): TaskGroup[] {
  const ordered = orderTasks(milestones, tasks);
  const groups: TaskGroup[] = [...milestones]
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ milestone: m, tasks: ordered.filter((t) => t.milestoneId === m.id) }));
  const known = new Set(milestones.map((m) => m.id));
  const loose = ordered.filter((t) => t.milestoneId == null || !known.has(t.milestoneId));
  if (loose.length) groups.push({ milestone: null, tasks: loose });
  return groups;
}

/** "vence hoje", "vence amanhã", "em 5 dias", "atrasada há 2 dias". null para tarefas feitas. */
export function dueLabel(due: Day | null, today: Day, status: TaskStatus = "todo"): { text: string; late: boolean } | null {
  if (!due || status === "done") return null;
  const d = diffDays(today, due);
  if (d < 0) return { text: `atrasada há ${-d} ${d === -1 ? "dia" : "dias"}`, late: true };
  if (d === 0) return { text: "vence hoje", late: false };
  if (d === 1) return { text: "vence amanhã", late: false };
  return { text: `em ${d} dias`, late: false };
}
