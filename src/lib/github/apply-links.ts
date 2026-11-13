import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { planTaskLinks, referencedNumbers, type LinkCommit } from "../task-links";

type Db = SupabaseClient<Database>;

/**
 * Grava os vínculos #T12 de um conjunto de commits e conclui as tarefas de
 * programação. Funciona com o cliente da sessão (RLS) ou com o admin (sync).
 */
export async function applyTaskLinks(db: Db, userId: string, commits: LinkCommit[]) {
  const numbers = referencedNumbers(commits);
  if (numbers.length === 0) return { linked: 0, closed: 0 };

  const [{ data: tasks }, { data: categories }] = await Promise.all([
    db
      .from("tasks")
      .select("id, number, status, category_id, projects!tasks_project_id_user_id_fkey(category_id)")
      .eq("user_id", userId)
      .in("number", numbers),
    db.from("categories").select("id, is_code").eq("user_id", userId),
  ]);
  if (!tasks?.length) return { linked: 0, closed: 0 };

  const codeCategories = new Set((categories ?? []).filter((c) => c.is_code).map((c) => c.id));
  const plan = planTaskLinks(
    commits,
    tasks.map((t) => {
      // Sem categoria na tarefa, vale a categoria do projeto.
      const categoryId = t.category_id ?? t.projects?.category_id ?? null;
      return { id: t.id, number: t.number, status: t.status, isCode: categoryId != null && codeCategories.has(categoryId) };
    }),
  );
  if (plan.length === 0) return { linked: 0, closed: 0 };

  const { data: inserted, error } = await db
    .from("task_commits")
    .upsert(
      plan.map((l) => ({ task_id: l.taskId, commit_id: l.commitId, user_id: userId, closed_task: l.closes })),
      { onConflict: "task_id,commit_id", ignoreDuplicates: true },
    )
    .select("task_id, commit_id, closed_task");
  if (error) throw new Error(`Vínculo de tarefas: ${error.message}`);

  // Só fecha tarefas cujo vínculo é novo (reabrir à mão continua valendo).
  const closing = (inserted ?? []).filter((r) => r.closed_task);
  for (const row of closing) {
    const link = plan.find((l) => l.taskId === row.task_id && l.commitId === row.commit_id);
    await db
      .from("tasks")
      .update({ status: "done", done_at: link?.closedAt ?? new Date().toISOString(), done_via: "commit" })
      .eq("id", row.task_id)
      .eq("user_id", userId)
      .neq("status", "done");
  }
  return { linked: inserted?.length ?? 0, closed: closing.length };
}
