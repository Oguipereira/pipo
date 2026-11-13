"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isDay } from "@/lib/dates";
import { DEMO } from "@/lib/demo";
import { applyTaskLinks } from "@/lib/github/apply-links";
import { createClient } from "@/lib/supabase/server";

export type ProjectFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const uuid = z.string().uuid();
const optionalDay = z
  .string()
  .nullable()
  .refine((v) => v === null || isDay(v), "Data inválida.");

const projectSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Dê um nome ao projeto.").max(80, "Até 80 caracteres."),
  description: z.string().trim().max(500, "Até 500 caracteres.").nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  categoryId: uuid.nullable(),
  status: z.enum(["active", "paused", "done"]),
  repoIds: z.array(uuid).max(20),
});

const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

export async function saveProject(_prev: ProjectFormState, fd: FormData): Promise<ProjectFormState> {
  await getViewer();
  if (DEMO) return { error: "Modo demonstração: nada é salvo." };
  const parsed = projectSchema.safeParse({
    id: text(fd, "id") ?? undefined,
    name: text(fd, "name") ?? "",
    description: text(fd, "description"),
    color: text(fd, "color") ?? "#39d353",
    categoryId: text(fd, "categoryId"),
    status: text(fd, "status") ?? "active",
    repoIds: fd.getAll("repo").filter((v): v is string => typeof v === "string"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const row = { name: v.name, description: v.description, color: v.color, category_id: v.categoryId, status: v.status };

  let id = v.id;
  if (id) {
    const { error } = await supabase.from("projects").update(row).eq("id", id);
    if (error) return { error: "Não foi possível salvar o projeto." };
  } else {
    const { count } = await supabase.from("projects").select("id", { count: "exact", head: true });
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...row, position: count ?? 0 })
      .select("id")
      .single();
    if (error || !data) return { error: "Não foi possível criar o projeto." };
    id = data.id;
  }

  // Repositórios vinculados: substitui o conjunto.
  await supabase.from("project_repos").delete().eq("project_id", id);
  if (v.repoIds.length) {
    const { error } = await supabase.from("project_repos").insert(v.repoIds.map((repo_id) => ({ project_id: id!, repo_id })));
    if (error) return { error: "Projeto salvo, mas não foi possível vincular os repositórios." };
  }
  redirect(`/projetos/${id}`);
}

export async function setProjectStatus(id: string, status: "active" | "paused" | "done") {
  await getViewer();
  if (DEMO || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("projects").update({ status }).eq("id", id);
  refresh();
}

export async function deleteProject(id: string) {
  await getViewer();
  if (DEMO || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
  redirect("/projetos");
}

// ---------------------------------------------------------------------------
// Marcos
// ---------------------------------------------------------------------------

export async function createMilestone(projectId: string, fd: FormData) {
  await getViewer();
  const title = text(fd, "title");
  if (DEMO || !title || title.length > 120 || !uuid.safeParse(projectId).success) return;
  const supabase = await createClient();
  const { count } = await supabase
    .from("milestones")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  await supabase.from("milestones").insert({ project_id: projectId, title, position: count ?? 0 });
  refresh();
}

export async function renameMilestone(id: string, fd: FormData) {
  await getViewer();
  const title = text(fd, "title");
  if (DEMO || !title || title.length > 120 || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("milestones").update({ title }).eq("id", id);
  refresh();
}

/** Apaga o marco; as tarefas dele ficam "sem marco" (FK com on delete set null). */
export async function deleteMilestone(id: string) {
  await getViewer();
  if (DEMO || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("milestones").delete().eq("id", id);
  refresh();
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------

export async function createTask(projectId: string, milestoneId: string | null, fd: FormData) {
  const viewer = await getViewer();
  const title = text(fd, "title");
  if (DEMO || !title || title.length > 200 || !uuid.safeParse(projectId).success) return;
  if (milestoneId && !uuid.safeParse(milestoneId).success) return;
  const supabase = await createClient();

  let q = supabase.from("tasks").select("position").eq("project_id", projectId);
  q = milestoneId ? q.eq("milestone_id", milestoneId) : q.is("milestone_id", null);
  const { data: last } = await q.order("position", { ascending: false }).limit(1).maybeSingle();

  const { data: task } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, milestone_id: milestoneId, title, position: (last?.position ?? -1) + 1 })
    .select("id, number")
    .single();

  // Commits antigos que já citavam #T<n> passam a aparecer na tarefa.
  if (task) {
    const { data: commits } = await supabase
      .from("commits")
      .select("id, message, committed_at")
      .ilike("message", `%#T${task.number}%`)
      .limit(200);
    if (commits?.length) {
      await applyTaskLinks(
        supabase,
        viewer.id,
        commits.map((c) => ({ id: c.id, message: c.message, committedAt: c.committed_at })),
      );
    }
  }
  refresh();
}

export async function setTaskStatus(id: string, status: "todo" | "doing" | "done") {
  await getViewer();
  if (DEMO || !uuid.safeParse(id).success || !["todo", "doing", "done"].includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update(
      status === "done"
        ? { status, done_at: new Date().toISOString(), done_via: "manual" }
        : { status, done_at: null, done_via: null },
    )
    .eq("id", id);
  refresh();
}

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).nullable(),
  dueDate: optionalDay,
  milestoneId: uuid.nullable(),
  categoryId: uuid.nullable(),
});

export async function updateTask(id: string, fd: FormData) {
  await getViewer();
  if (DEMO || !uuid.safeParse(id).success) return;
  const parsed = taskSchema.safeParse({
    title: text(fd, "title") ?? "",
    notes: text(fd, "notes"),
    dueDate: text(fd, "dueDate"),
    milestoneId: text(fd, "milestoneId"),
    categoryId: text(fd, "categoryId"),
  });
  if (!parsed.success) return;
  const v = parsed.data;
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ title: v.title, notes: v.notes, due_date: v.dueDate, milestone_id: v.milestoneId, category_id: v.categoryId })
    .eq("id", id);
  refresh();
}

export async function deleteTask(id: string) {
  await getViewer();
  if (DEMO || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  refresh();
}

/** Troca a tarefa de posição com a vizinha dentro do mesmo marco. */
export async function moveTask(id: string, direction: -1 | 1) {
  await getViewer();
  if (DEMO || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("project_id, milestone_id").eq("id", id).single();
  if (!task) return;
  let q = supabase.from("tasks").select("id, position, number").eq("project_id", task.project_id);
  q = task.milestone_id ? q.eq("milestone_id", task.milestone_id) : q.is("milestone_id", null);
  const { data: siblings } = await q.order("position").order("number");
  if (!siblings) return;
  const order = siblings.map((s) => s.id);
  const i = order.indexOf(id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((taskId, position) => supabase.from("tasks").update({ position }).eq("id", taskId)));
  refresh();
}
