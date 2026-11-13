import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { addDays, today as todayIn } from "@/lib/dates";
import { getProjectActivity, getProjects, type Project } from "@/lib/data/projects";
import { plural, relativeTime } from "@/lib/format";
import { dueLabel, nextTask, progress, PROJECT_STATUS_LABEL } from "@/lib/projects";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "projetos" };

export default function ProjectsPage() {
  return (
    <div className="space-y-10">
      <PageHeader path="projetos">
        <Link href="/projetos/novo" className="rounded-[3px] border border-seam px-3 py-1.5 text-[14px] text-chalk hover:border-dust">
          Novo projeto
        </Link>
      </PageHeader>
      <Suspense fallback={<div className="h-40" aria-busy />}>
        <ProjectList />
      </Suspense>
    </div>
  );
}

async function ProjectList() {
  const viewer = await getViewer();
  const today = todayIn(viewer.timezone);
  const [projects, activity] = await Promise.all([getProjects(), getProjectActivity(addDays(today, -29), today)]);

  if (projects.length === 0) {
    return (
      <div className="max-w-prose space-y-4 text-[15px] leading-relaxed text-dust">
        <p>
          Um projeto junta repositórios do GitHub e um plano de execução com marcos e tarefas. Cada tarefa ganha um
          número (T1, T2…): escreva <code className="text-chalk">#T1</code> na mensagem do commit e ele aparece dentro
          da tarefa.
        </p>
        <Link href="/projetos/novo" className="inline-block text-chalk underline decoration-heat-3 underline-offset-4">
          Criar o primeiro projeto
        </Link>
      </div>
    );
  }

  const groups: [string, Project[]][] = (["active", "paused", "done"] as const)
    .map((s) => [s, projects.filter((p) => p.status === s)] as [string, Project[]])
    .filter(([, list]) => list.length);

  return (
    <div className="space-y-12">
      {groups.map(([status, list]) => (
        <section key={status}>
          {status !== "active" ? (
            <h2 className="mb-4 text-[13px] text-faint">{PROJECT_STATUS_LABEL[status as Project["status"]]}s</h2>
          ) : null}
          <ul className="space-y-9">
            {list.map((p) => {
              const prog = progress(p.tasks);
              const next = nextTask(p.milestones, p.tasks);
              const act = activity.get(p.id);
              const due = next ? dueLabel(next.dueDate, today, next.status) : null;
              return (
                <li key={p.id}>
                  <Link href={`/projetos/${p.id}`} className="group block">
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden className="block size-2.5 rounded-[2px]" style={{ background: p.color }} />
                      <span className="text-[17px] text-chalk group-hover:underline group-hover:decoration-seam group-hover:underline-offset-4">
                        {p.name}
                      </span>
                    </span>
                    {p.description ? <span className="mt-1 block max-w-prose text-[14px] text-dust">{p.description}</span> : null}
                  </Link>

                  {prog.total ? <Squares done={prog.done} total={prog.total} /> : null}

                  <div className="mt-3 space-y-1 text-[13px]">
                    {next ? (
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-faint">próxima</span>
                        <span className="num text-faint">T{next.number}</span>
                        <span className="text-chalk">{next.title}</span>
                        {due ? <span className={due.late ? "text-alert" : "text-faint"}>{due.text}</span> : null}
                      </p>
                    ) : prog.total ? (
                      <p className="text-faint">Todas as tarefas feitas.</p>
                    ) : null}
                    <p className="text-faint">
                      {plural(prog.done, "tarefa feita", "tarefas feitas")} de {prog.total}
                      {act ? `, ${plural(act.commits, "commit")} em 30 dias` : ""}
                      {act?.lastCommitAt ? `, último ${relativeTime(act.lastCommitAt)}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Progresso como uma fileira de quadradinhos (até 30; acima disso, barra). */
function Squares({ done, total }: { done: number; total: number }) {
  if (total > 30) {
    return (
      <span aria-label={`${done} de ${total} tarefas`} className="mt-3 block h-1.5 max-w-sm overflow-hidden rounded-full bg-heat-0">
        <span className="block h-full bg-heat-3" style={{ width: `${(done / total) * 100}%` }} />
      </span>
    );
  }
  return (
    <span aria-label={`${done} de ${total} tarefas`} className="mt-3 flex flex-wrap gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`block size-2.5 rounded-[2px] ${i < done ? "bg-heat-3" : "bg-heat-0"}`} />
      ))}
    </span>
  );
}
