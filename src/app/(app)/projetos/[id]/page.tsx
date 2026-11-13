import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { addDays, today as todayIn, type Day } from "@/lib/dates";
import { getRepos } from "@/lib/data/github";
import { getCategories, type Category } from "@/lib/data/habits";
import { getProject, getProjectCommitCounts, getTaskCommits, type LinkedCommit } from "@/lib/data/projects";
import { fmtShortDay, plural } from "@/lib/format";
import { commitTitle } from "@/lib/github/transform";
import { buildGrid, levelFromCount } from "@/lib/heatmap";
import { dueLabel, groupByMilestone, progress, PROJECT_STATUS_LABEL, type Milestone, type Task } from "@/lib/projects";
import { Heatmap, HeatLegend } from "@/components/heatmap";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";
import { TaskStatusButton } from "@/components/task-status-button";
import {
  createMilestone,
  createTask,
  deleteMilestone,
  deleteProject,
  deleteTask,
  moveTask,
  renameMilestone,
  updateTask,
} from "../actions";

export const metadata: Metadata = { title: "projeto" };

export default function ProjectPage({ params }: PageProps<"/projetos/[id]">) {
  return (
    <div className="space-y-10">
      <Link href="/projetos" className="text-[13px] text-faint hover:text-dust">
        ← projetos
      </Link>
      <Suspense fallback={<div className="h-96" aria-busy />}>
        <ProjectDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ProjectDetail({ params }: { params: PageProps<"/projetos/[id]">["params"] }) {
  const [{ id }, viewer] = await Promise.all([params, getViewer()]);
  const project = /^[0-9a-f-]{36}$/i.test(id) ? await getProject(id) : null;
  if (!project) notFound();

  const today = todayIn(viewer.timezone);
  const [counts, links, categories, repos] = await Promise.all([
    getProjectCommitCounts(project.id, addDays(today, -370), today),
    getTaskCommits(project.tasks.map((t) => t.id)),
    getCategories(),
    getRepos(),
  ]);
  const prog = progress(project.tasks);
  const max = Math.max(1, ...counts.values());
  const grid = buildGrid(today, (day) => {
    const n = counts.get(day) ?? 0;
    return { level: levelFromCount(n, max), label: `${plural(n, "commit")} em ${fmtShortDay(day)}` };
  });
  const total30 = sumSince(counts, addDays(today, -29));
  const repoNames = repos.filter((r) => project.repoIds.includes(r.id)).map((r) => r.fullName);
  const groups = groupByMilestone(project.milestones, project.tasks);

  return (
    <>
      <div>
        <PageHeader path={project.name.toLocaleLowerCase("pt-BR")} />
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-dust">
          <span aria-hidden className="block size-2.5 rounded-[2px]" style={{ background: project.color }} />
          <span>{PROJECT_STATUS_LABEL[project.status]}</span>
          {repoNames.map((r) => (
            <span key={r} className="text-faint">
              {r}
            </span>
          ))}
        </p>
        {project.description ? <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-dust">{project.description}</p> : null}
      </div>

      <dl className="grid grid-cols-3 gap-6 sm:max-w-md">
        <Stat label="tarefas feitas" value={`${prog.done}/${prog.total}`} />
        <Stat label="commits em 30 dias" value={total30} />
        <Stat label="progresso" value={`${Math.round(prog.ratio * 100)}%`} />
      </dl>

      {project.repoIds.length ? (
        <section aria-label="Commits do projeto">
          <Heatmap grid={grid} label={`Commits de ${project.name} no último ano`} highlight={today} />
          <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-faint">
            <span>Commits nos repositórios do projeto.</span>
            <HeatLegend />
          </div>
        </section>
      ) : (
        <p className="text-[14px] text-faint">Vincule repositórios (em editar projeto) para ver a frequência de commits.</p>
      )}

      <section aria-label="Plano de execução" className="space-y-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[13px] text-faint">plano</h2>
          <p className="text-[12px] text-faint">
            Escreva <code className="text-dust">#T12</code> no commit para vincular à tarefa 12.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-[14px] text-dust">Comece criando um marco (uma etapa do projeto) ou uma tarefa solta.</p>
        ) : null}

        {groups.map((g) => (
          <MilestoneBlock
            key={g.milestone?.id ?? "loose"}
            projectId={project.id}
            milestone={g.milestone}
            tasks={g.tasks}
            milestones={project.milestones}
            categories={categories}
            links={links}
            today={today}
          />
        ))}

        {!groups.some((g) => g.milestone === null) ? (
          <AddTask projectId={project.id} milestoneId={null} label="Tarefa sem marco" />
        ) : null}

        <form action={createMilestone.bind(null, project.id)} className="flex max-w-md gap-2">
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Novo marco, ex.: MVP"
            aria-label="Nome do novo marco"
            className="h-9 flex-1 rounded-[3px] border border-seam bg-transparent px-3 text-[14px] text-chalk placeholder:text-faint"
          />
          <button type="submit" className="h-9 rounded-[3px] bg-heat-0 px-3 text-[14px] text-chalk hover:bg-seam">
            Criar marco
          </button>
        </form>
      </section>

      <details className="max-w-lg">
        <summary className="cursor-pointer text-[14px] text-dust hover:text-chalk">Editar projeto</summary>
        <div className="mt-6 space-y-10">
          <ProjectForm categories={categories} repos={repos} project={project} />
          <form action={deleteProject.bind(null, project.id)}>
            <button type="submit" className="text-[13px] text-alert/80 underline decoration-seam underline-offset-4 hover:text-alert">
              Apagar projeto e tarefas
            </button>
            <p className="mt-1 text-[12px] text-faint">Os commits continuam; só o projeto e o plano somem.</p>
          </form>
        </div>
      </details>
    </>
  );
}

function MilestoneBlock({
  projectId,
  milestone,
  tasks,
  milestones,
  categories,
  links,
  today,
}: {
  projectId: string;
  milestone: Milestone | null;
  tasks: Task[];
  milestones: Milestone[];
  categories: Category[];
  links: Map<string, LinkedCommit[]>;
  today: Day;
}) {
  const prog = progress(tasks);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-seam/60 pb-2">
        {milestone ? (
          <details className="group min-w-0">
            <summary className="cursor-pointer list-none text-[15px] text-chalk [&::-webkit-details-marker]:hidden">
              {milestone.title}
            </summary>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <form action={renameMilestone.bind(null, milestone.id)} className="flex gap-2">
                <input
                  name="title"
                  defaultValue={milestone.title}
                  maxLength={120}
                  aria-label="Nome do marco"
                  className="h-8 rounded-[3px] border border-seam bg-transparent px-2 text-[13px] text-chalk"
                />
                <button type="submit" className="text-[13px] text-dust hover:text-chalk">
                  Renomear
                </button>
              </form>
              <form action={deleteMilestone.bind(null, milestone.id)}>
                <button type="submit" className="text-[13px] text-faint hover:text-alert">
                  Apagar marco
                </button>
              </form>
            </div>
          </details>
        ) : (
          <span className="text-[15px] text-dust">sem marco</span>
        )}
        <span className="num shrink-0 text-[12px] text-faint">
          {prog.done}/{prog.total}
        </span>
      </div>

      <ul>
        {tasks.map((t, i) => (
          <TaskRow
            key={t.id}
            task={t}
            first={i === 0}
            last={i === tasks.length - 1}
            milestones={milestones}
            categories={categories}
            commits={links.get(t.id) ?? []}
            today={today}
          />
        ))}
      </ul>
      <AddTask projectId={projectId} milestoneId={milestone?.id ?? null} />
    </div>
  );
}

function TaskRow({
  task,
  first,
  last,
  milestones,
  categories,
  commits,
  today,
}: {
  task: Task;
  first: boolean;
  last: boolean;
  milestones: Milestone[];
  categories: Category[];
  commits: LinkedCommit[];
  today: Day;
}) {
  const due = dueLabel(task.dueDate, today, task.status);
  const arrow = "grid size-7 place-items-center rounded-[3px] font-mono text-[12px] text-faint hover:bg-heat-0 hover:text-chalk disabled:invisible";
  return (
    <li className="flex items-start gap-3 py-2">
      <div className="pt-0.5">
        <TaskStatusButton id={task.id} status={task.status} />
      </div>
      <details className="group min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none items-baseline gap-2 [&::-webkit-details-marker]:hidden">
          <span className="num shrink-0 text-[12px] text-faint">T{task.number}</span>
          <span className={`min-w-0 flex-1 text-[14px] ${task.status === "done" ? "text-faint line-through decoration-seam" : "text-chalk"}`}>
            {task.title}
          </span>
          {commits.length ? <span className="num shrink-0 text-[12px] text-heat-3">{commits.length}c</span> : null}
          {due ? <span className={`shrink-0 text-[12px] ${due.late ? "text-alert" : "text-faint"}`}>{due.text}</span> : null}
        </summary>

        <div className="mt-3 space-y-4 pb-2">
          {task.doneVia === "commit" ? <p className="text-[12px] text-heat-3">Concluída por commit.</p> : null}
          {commits.length ? (
            <ul className="space-y-1">
              {commits.map((c) => (
                <li key={c.id} className="text-[13px]">
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-dust hover:text-chalk">
                    <span className="num text-faint">{c.sha.slice(0, 7)}</span> {commitTitle(c.message)}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <form action={updateTask.bind(null, task.id)} className="grid gap-3 sm:grid-cols-2">
            <input name="title" defaultValue={task.title} required maxLength={200} aria-label="Título" className={`${input} sm:col-span-2`} />
            <textarea name="notes" defaultValue={task.notes ?? ""} rows={2} maxLength={2000} placeholder="Notas" aria-label="Notas" className={`${input} h-auto py-2 sm:col-span-2`} />
            <label className="text-[12px] text-faint">
              prazo
              <input type="date" name="dueDate" defaultValue={task.dueDate ?? ""} className={`${input} num mt-1 [color-scheme:dark]`} />
            </label>
            <label className="text-[12px] text-faint">
              marco
              <select name="milestoneId" defaultValue={task.milestoneId ?? ""} className={`${input} mt-1`}>
                <option value="">sem marco</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] text-faint sm:col-span-2">
              categoria (vazio = a do projeto)
              <select name="categoryId" defaultValue={task.categoryId ?? ""} className={`${input} mt-1`}>
                <option value="">a do projeto</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between sm:col-span-2">
              <button type="submit" className="h-8 rounded-[3px] bg-heat-0 px-3 text-[13px] text-chalk hover:bg-seam">
                Salvar
              </button>
            </div>
          </form>
          <form action={deleteTask.bind(null, task.id)}>
            <button type="submit" className="text-[12px] text-faint hover:text-alert">
              Apagar tarefa
            </button>
          </form>
        </div>
      </details>
      <div className="flex shrink-0">
        <form action={moveTask.bind(null, task.id, -1)}>
          <button type="submit" disabled={first} className={arrow} aria-label="Subir">
            ↑
          </button>
        </form>
        <form action={moveTask.bind(null, task.id, 1)}>
          <button type="submit" disabled={last} className={arrow} aria-label="Descer">
            ↓
          </button>
        </form>
      </div>
    </li>
  );
}

function AddTask({ projectId, milestoneId, label }: { projectId: string; milestoneId: string | null; label?: string }) {
  return (
    <form action={createTask.bind(null, projectId, milestoneId)} className="mt-2 flex gap-2 pl-9">
      <input
        name="title"
        required
        maxLength={200}
        placeholder={label ?? "Nova tarefa"}
        aria-label={label ?? "Nova tarefa"}
        className="h-8 flex-1 rounded-[3px] border border-transparent bg-transparent px-2 text-[14px] text-chalk placeholder:text-faint hover:border-seam focus:border-seam"
      />
      <button type="submit" className="h-8 px-2 text-[13px] text-faint hover:text-chalk">
        Adicionar
      </button>
    </form>
  );
}

const input =
  "block h-9 w-full rounded-[3px] border border-seam bg-transparent px-2.5 text-[14px] text-chalk placeholder:text-faint focus:border-dust focus:outline-none";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dd className="num text-[26px] leading-none text-chalk">{value}</dd>
      <dt className="mt-1.5 text-[12px] text-faint">{label}</dt>
    </div>
  );
}

function sumSince(map: Map<Day, number>, from: Day) {
  let total = 0;
  for (const [day, n] of map) if (day >= from) total += n;
  return total;
}
