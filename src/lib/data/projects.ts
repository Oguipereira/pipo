import "server-only";
import type { Day } from "../dates";
import { DEMO, demoProjectActivity, demoProjectCommitCounts, demoProjects } from "../demo";
import type { Milestone, ProjectStatus, Task, TaskStatus } from "../projects";
import { createClient } from "../supabase/server";
import type { Tables } from "../supabase/database.types";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  categoryId: string | null;
  position: number;
  repoIds: string[];
  milestones: Milestone[];
  tasks: Task[];
};

export type LinkedCommit = { id: string; sha: string; message: string; url: string; committedAt: string; closedTask: boolean };

function toTask(t: Tables<"tasks">): Task {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    notes: t.notes,
    status: t.status as TaskStatus,
    dueDate: t.due_date,
    milestoneId: t.milestone_id,
    categoryId: t.category_id,
    position: t.position,
    doneAt: t.done_at,
    doneVia: t.done_via as Task["doneVia"],
  };
}

const PROJECT_SELECT =
  "*, project_repos!project_repos_project_id_user_id_fkey(repo_id), milestones!milestones_project_id_user_id_fkey(id, title, position, due_date), tasks!tasks_project_id_user_id_fkey(*)";

type ProjectRow = Tables<"projects"> & {
  project_repos: { repo_id: string }[];
  milestones: { id: string; title: string; position: number; due_date: string | null }[];
  tasks: Tables<"tasks">[];
};

function toProject(p: ProjectRow): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status as ProjectStatus,
    color: p.color,
    categoryId: p.category_id,
    position: p.position,
    repoIds: p.project_repos.map((r) => r.repo_id),
    milestones: p.milestones.map((m) => ({ id: m.id, title: m.title, position: m.position, dueDate: m.due_date })),
    tasks: p.tasks.map(toTask),
  };
}

export async function getProjects(): Promise<Project[]> {
  if (DEMO) return demoProjects();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .order("position")
    .order("created_at");
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ProjectRow[]).map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  if (DEMO) return demoProjects().find((p) => p.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProject(data as unknown as ProjectRow) : null;
}

/** Commits vinculados às tarefas de um projeto, por tarefa. */
export async function getTaskCommits(taskIds: string[]): Promise<Map<string, LinkedCommit[]>> {
  const map = new Map<string, LinkedCommit[]>();
  if (DEMO || taskIds.length === 0) return map;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_commits")
    .select("task_id, closed_task, commits!task_commits_commit_id_user_id_fkey(id, sha, message, url, committed_at)")
    .in("task_id", taskIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const c = row.commits;
    const list = map.get(row.task_id) ?? [];
    list.push({ id: c.id, sha: c.sha, message: c.message, url: c.url, committedAt: c.committed_at, closedTask: row.closed_task });
    map.set(row.task_id, list.sort((a, b) => b.committedAt.localeCompare(a.committedAt)));
  }
  return map;
}

export async function getProjectCommitCounts(projectId: string, from: Day, to: Day): Promise<Map<Day, number>> {
  if (DEMO) return demoProjectCommitCounts(projectId, from, to);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("project_commit_counts", { p_project: projectId, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r) => [r.day, r.commits]));
}

export async function getProjectActivity(from: Day, to: Day): Promise<Map<string, { commits: number; lastCommitAt: string | null }>> {
  if (DEMO) return demoProjectActivity(from, to);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("project_activity", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r) => [r.project_id, { commits: r.commits, lastCommitAt: r.last_commit_at }]));
}
