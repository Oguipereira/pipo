import { parseTaskRefs } from "./task-refs";

export type LinkCommit = { id: string; message: string; committedAt: string };
export type LinkTask = { id: string; number: number; status: string; isCode: boolean };
export type PlannedLink = { taskId: string; commitId: string; closes: boolean; closedAt: string | null };

/**
 * Decide os vínculos commit ↔ tarefa (docs/SPEC.md §4.5).
 *
 * Todo commit com `#T<n>` é vinculado à tarefa n. Se a tarefa for de uma
 * categoria de programação e ainda não estiver feita, o commit mais antigo que
 * a cita a conclui. Commits já vinculados antes não entram aqui (o banco ignora
 * duplicados), então reabrir uma tarefa à mão não faz o mesmo commit fechá-la de novo.
 */
export function planTaskLinks(commits: LinkCommit[], tasks: LinkTask[]): PlannedLink[] {
  const byNumber = new Map(tasks.map((t) => [t.number, t]));
  const links: PlannedLink[] = [];
  const closing = new Map<string, PlannedLink>();

  const ordered = [...commits].sort((a, b) => a.committedAt.localeCompare(b.committedAt));
  for (const commit of ordered) {
    for (const n of parseTaskRefs(commit.message)) {
      const task = byNumber.get(n);
      if (!task) continue;
      const link: PlannedLink = { taskId: task.id, commitId: commit.id, closes: false, closedAt: null };
      if (task.isCode && task.status !== "done" && !closing.has(task.id)) {
        link.closes = true;
        link.closedAt = commit.committedAt;
        closing.set(task.id, link);
      }
      links.push(link);
    }
  }
  return links;
}

/** Números de tarefa citados num conjunto de commits. */
export function referencedNumbers(commits: { message: string }[]): number[] {
  return [...new Set(commits.flatMap((c) => parseTaskRefs(c.message)))];
}
