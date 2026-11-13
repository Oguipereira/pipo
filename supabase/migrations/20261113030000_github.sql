-- pipo · fases 3 e 4 · cache do GitHub (contribuições, repositórios, commits,
-- linguagens e dependências) e histórico de sincronizações.

-- Helper: RLS + policies de dono + grants padrão para uma tabela com user_id.
create function private.own_table(t regclass, writable boolean default true)
returns void
language plpgsql
set search_path = ''
as $$
declare
  name text := t::text;
begin
  execute format('alter table %s enable row level security', name);
  execute format(
    'create policy "dono: ler" on %s for select to authenticated using ((select auth.uid()) = user_id)', name);
  if writable then
    execute format(
      'create policy "dono: criar" on %s for insert to authenticated with check ((select auth.uid()) = user_id)', name);
    execute format(
      'create policy "dono: atualizar" on %s for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', name);
    execute format(
      'create policy "dono: apagar" on %s for delete to authenticated using ((select auth.uid()) = user_id)', name);
  end if;
  execute format('revoke all on %s from anon, authenticated', name);
  if writable then
    execute format('grant select, insert, update, delete on %s to authenticated', name);
  else
    execute format('grant select on %s to authenticated', name);
  end if;
  execute format('grant all on %s to service_role', name);
end;
$$;
revoke execute on function private.own_table(regclass, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- repos
-- ---------------------------------------------------------------------------
create table public.repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  github_id bigint not null,
  full_name text not null,
  name text not null,
  owner text not null,
  url text not null,
  description text,
  default_branch text,
  is_private boolean not null default false,
  is_fork boolean not null default false,
  is_archived boolean not null default false,
  -- Some de todas as estatísticas (forks, dotfiles…). Único campo editável pelo usuário.
  ignored boolean not null default false,
  primary_language text,
  pushed_at timestamptz,
  commits_synced_at timestamptz,
  deps_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, github_id),
  unique (id, user_id)
);
create trigger repos_set_updated_at before update on public.repos
  for each row execute function private.set_updated_at();
select private.own_table('public.repos', false);
grant update (ignored) on public.repos to authenticated;
create policy "dono: atualizar" on public.repos for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.repo_languages (
  repo_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  language text not null,
  color text,
  bytes bigint not null check (bytes >= 0),
  primary key (repo_id, language),
  foreign key (repo_id, user_id) references public.repos (id, user_id) on delete cascade
);
create index repo_languages_user_idx on public.repo_languages (user_id);
create index repo_languages_repo_user_idx on public.repo_languages (repo_id, user_id);
select private.own_table('public.repo_languages', false);

-- ---------------------------------------------------------------------------
-- commits
-- ---------------------------------------------------------------------------
create table public.commits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  repo_id uuid not null,
  sha text not null check (sha ~ '^[0-9a-f]{40}$'),
  message text not null,
  committed_at timestamptz not null,
  -- Dia local do usuário (docs/SPEC.md §3), calculado na sincronização.
  local_date date not null,
  url text not null,
  additions integer not null default 0,
  deletions integer not null default 0,
  -- Quando os arquivos alterados foram detalhados (linguagens). null = na fila.
  files_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (repo_id, sha),
  unique (id, user_id),
  foreign key (repo_id, user_id) references public.repos (id, user_id) on delete cascade
);
create index commits_user_date_idx on public.commits (user_id, local_date desc);
create index commits_repo_user_idx on public.commits (repo_id, user_id);
create index commits_files_queue_idx on public.commits (user_id, committed_at desc)
  where files_fetched_at is null;
select private.own_table('public.commits', false);

-- Linhas alteradas por linguagem em cada commit (agregado dos arquivos).
create table public.commit_languages (
  commit_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  language text not null,
  files integer not null default 0,
  additions integer not null default 0,
  deletions integer not null default 0,
  primary key (commit_id, language),
  foreign key (commit_id, user_id) references public.commits (id, user_id) on delete cascade
);
create index commit_languages_user_idx on public.commit_languages (user_id);
create index commit_languages_commit_user_idx on public.commit_languages (commit_id, user_id);
select private.own_table('public.commit_languages', false);

-- ---------------------------------------------------------------------------
-- contribuições (gráfico do GitHub, como o GitHub calcula)
-- ---------------------------------------------------------------------------
create table public.contribution_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  count integer not null check (count >= 0),
  level smallint not null check (level between 0 and 4),
  primary key (user_id, date)
);
select private.own_table('public.contribution_days', false);

-- ---------------------------------------------------------------------------
-- dependências e categorias de bibliotecas
-- ---------------------------------------------------------------------------
create table public.dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  repo_id uuid not null,
  ecosystem text not null check (ecosystem in ('npm', 'pypi')),
  name text not null,
  version text,
  is_dev boolean not null default false,
  manifest_path text not null,
  unique (repo_id, ecosystem, name, manifest_path),
  foreign key (repo_id, user_id) references public.repos (id, user_id) on delete cascade
);
create index dependencies_user_idx on public.dependencies (user_id, ecosystem, name);
create index dependencies_repo_user_idx on public.dependencies (repo_id, user_id);
select private.own_table('public.dependencies', false);

-- Override do usuário para a categoria de uma biblioteca (o padrão vem do código).
create table public.library_categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ecosystem text not null,
  name text not null,
  category text not null check (char_length(category) between 1 and 30),
  primary key (user_id, ecosystem, name)
);
select private.own_table('public.library_categories');

-- ---------------------------------------------------------------------------
-- sincronizações
-- ---------------------------------------------------------------------------
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trigger text not null check (trigger in ('manual', 'cron')),
  status text not null default 'running' check (status in ('running', 'ok', 'partial', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  rate_limit_remaining integer,
  error text
);
create index sync_runs_user_started_idx on public.sync_runs (user_id, started_at desc);
select private.own_table('public.sync_runs', false);
