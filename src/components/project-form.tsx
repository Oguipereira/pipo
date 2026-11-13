"use client";

import { useActionState, useState } from "react";
import { saveProject, type ProjectFormState } from "@/app/(app)/projetos/actions";
import type { Category } from "@/lib/data/habits";
import type { RepoSummary } from "@/lib/data/github";
import type { Project } from "@/lib/data/projects";

const COLORS = ["#39d353", "#58a6ff", "#d29922", "#f778ba", "#a371f7", "#f0883e", "#7f8894"];

type Props = { categories: Category[]; repos: RepoSummary[]; project?: Project };

export function ProjectForm({ categories, repos, project }: Props) {
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(saveProject, undefined);
  const [color, setColor] = useState(project?.color ?? COLORS[0]);
  const [categoryId, setCategoryId] = useState(project?.categoryId ?? categories.find((c) => c.isCode)?.id ?? "");
  const err = state?.fieldErrors ?? {};
  const selectedRepos = new Set(project?.repoIds ?? []);
  const visibleRepos = repos.filter((r) => !r.ignored || selectedRepos.has(r.id));

  return (
    <form action={action} className="max-w-lg space-y-8">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <input type="hidden" name="color" value={color} />

      <Field label="Nome" error={err.name}>
        <input name="name" defaultValue={project?.name} required maxLength={80} className={inputClass} autoComplete="off" />
      </Field>

      <Field label="Descrição" error={err.description}>
        <textarea
          name="description"
          defaultValue={project?.description ?? ""}
          maxLength={500}
          rows={3}
          placeholder="Opcional"
          className={`${inputClass} h-auto py-2.5`}
        />
      </Field>

      <Field label="Cor">
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Cor ${c}`}
              aria-pressed={color === c}
              className={`size-8 rounded-[4px] ${color === c ? "ring-2 ring-chalk ring-offset-2 ring-offset-ink" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>

      <Field label="Categoria" hint="Em Programação, um commit com #T12 conclui a tarefa 12.">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.id} className={chipClass(categoryId === c.id)}>
              <input
                type="radio"
                name="categoryId"
                value={c.id}
                checked={categoryId === c.id}
                onChange={() => setCategoryId(c.id)}
                className="sr-only"
              />
              <span aria-hidden className="block size-1.5 rounded-full" style={{ background: c.color }} />
              {c.name}
            </label>
          ))}
        </div>
      </Field>

      {project ? (
        <Field label="Status">
          <select name="status" defaultValue={project.status} className={`${inputClass} w-auto`}>
            <option value="active">ativo</option>
            <option value="paused">pausado</option>
            <option value="done">concluído</option>
          </select>
        </Field>
      ) : null}

      <Field label="Repositórios" error={err.repoIds} hint={visibleRepos.length ? undefined : "Sincronize o GitHub para escolher repositórios."}>
        {visibleRepos.length ? (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-[3px] border border-seam p-2">
            {visibleRepos.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-3 rounded-[3px] px-2 py-1.5 hover:bg-slab">
                <input type="checkbox" name="repo" value={r.id} defaultChecked={selectedRepos.has(r.id)} className="accent-heat-3" />
                <span className="truncate text-[14px] text-chalk">{r.fullName}</span>
              </label>
            ))}
          </div>
        ) : null}
      </Field>

      {state?.error ? (
        <p role="alert" className="text-[14px] text-alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[3px] bg-chalk px-5 font-medium text-ink hover:bg-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : project ? "Salvar alterações" : "Criar projeto"}
      </button>
    </form>
  );
}

const inputClass =
  "block h-11 w-full rounded-[3px] border border-seam bg-transparent px-3 text-[15px] text-chalk placeholder:text-faint focus:border-dust focus:outline-none";

function chipClass(selected: boolean) {
  return `inline-flex cursor-pointer items-center gap-2 rounded-[3px] border px-3 py-1.5 text-[14px] ${
    selected ? "border-heat-3 text-chalk" : "border-seam text-dust hover:border-dust"
  }`;
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-dust">{label}</p>
      {children}
      {hint && !error ? <p className="mt-2 text-[12px] text-faint">{hint}</p> : null}
      {error ? <p className="mt-2 text-[13px] text-alert">{error}</p> : null}
    </div>
  );
}
