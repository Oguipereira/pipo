-- pipo · fase 5 · projetos, marcos, tarefas e vínculo commit ↔ tarefa.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (char_length(description) <= 500),
  status text not null default 'active' check (status in ('active', 'paused', 'done')),
  color text not null default '#39d353' check (color ~ '^#[0-9a-fA-F]{6}$'),
  category_id uuid,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id)
);
create index projects_user_idx on public.projects (user_id, status, position);
create index projects_category_idx on public.projects (category_id, user_id);
create trigger projects_set_updated_at before update on public.projects
  for each row execute function private.set_updated_at();
select private.own_table('public.projects');

create table public.project_repos (
  project_id uuid not null,
  repo_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (project_id, repo_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  foreign key (repo_id, user_id) references public.repos (id, user_id) on delete cascade
);
create index project_repos_repo_idx on public.project_repos (repo_id, user_id);
create index project_repos_project_user_idx on public.project_repos (project_id, user_id);
select private.own_table('public.project_repos');

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  position integer not null default 0,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);
create index milestones_project_idx on public.milestones (project_id, user_id, position);
create trigger milestones_set_updated_at before update on public.milestones
  for each row execute function private.set_updated_at();
select private.own_table('public.milestones');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  milestone_id uuid,
  -- Número por usuário: T1, T2… É o que vai na mensagem do commit (#T12).
  -- Atribuído pelo trigger assign_task_number (0 = "atribua o próximo").
  number integer not null default 0,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_date date,
  position integer not null default 0,
  category_id uuid,
  done_at timestamptz,
  done_via text check (done_via in ('manual', 'commit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  foreign key (milestone_id, user_id)
    references public.milestones (id, user_id) on delete set null (milestone_id),
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id)
);
create index tasks_project_idx on public.tasks (project_id, user_id, position);
create index tasks_milestone_idx on public.tasks (milestone_id, user_id);
create index tasks_category_idx on public.tasks (category_id, user_id);
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function private.set_updated_at();

-- Atribui o próximo número da tarefa por usuário, sem corrida entre inserts.
create function private.assign_task_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.number is null or new.number = 0 then
    perform pg_advisory_xact_lock(hashtextextended('pipo.tasks:' || new.user_id::text, 0));
    select coalesce(max(t.number), 0) + 1 into new.number
    from public.tasks t where t.user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke execute on function private.assign_task_number() from public, anon, authenticated;

create trigger tasks_assign_number before insert on public.tasks
  for each row execute function private.assign_task_number();

select private.own_table('public.tasks');

create table public.task_commits (
  task_id uuid not null,
  commit_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- O commit concluiu a tarefa ao ser vinculado (só em categoria de programação).
  closed_task boolean not null default false,
  linked_at timestamptz not null default now(),
  primary key (task_id, commit_id),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  foreign key (commit_id, user_id) references public.commits (id, user_id) on delete cascade
);
create index task_commits_commit_idx on public.task_commits (commit_id, user_id);
create index task_commits_task_user_idx on public.task_commits (task_id, user_id);
select private.own_table('public.task_commits', false);
