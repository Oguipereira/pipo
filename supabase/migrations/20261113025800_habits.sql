-- pipo · fase 2 · hábitos
-- Padrão de multi-tenancy: tabelas-pai expõem unique (id, user_id) e as filhas
-- referenciam (parent_id, user_id). Assim o próprio banco impede que um registro
-- aponte para dados de outro usuário, sem subconsultas nas policies.

alter table public.categories add constraint categories_id_user_key unique (id, user_id);

create type public.habit_kind as enum ('boolean', 'quantity', 'github');

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  kind public.habit_kind not null default 'boolean',
  target numeric(10, 2) check (target > 0),
  unit text check (char_length(unit) <= 20),
  -- bitmask dom→sáb: bit 0 = domingo … bit 6 = sábado. 127 = todos, 62 = seg–sex.
  schedule_days smallint not null default 127 check (schedule_days between 1 and 127),
  position integer not null default 0,
  -- Primeiro dia que conta para %, streak e heatmap (data local do usuário).
  start_date date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  constraint habits_target_matches_kind check ((kind = 'quantity') = (target is not null))
);

comment on column public.habits.schedule_days is 'Bitmask de dias da semana (bit 0 = domingo).';
comment on column public.habits.kind is
  'boolean: sim/não · quantity: meta + unidade · github: cumprido com ≥ 1 commit no dia.';

create index habits_user_active_idx on public.habits (user_id, position) where archived_at is null;
create index habits_category_idx on public.habits (category_id, user_id);

create trigger habits_set_updated_at
before update on public.habits
for each row execute function private.set_updated_at();

alter table public.habits enable row level security;

create policy "habits: ler os próprios" on public.habits for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "habits: criar os próprios" on public.habits for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "habits: atualizar os próprios" on public.habits for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habits: apagar os próprios" on public.habits for delete
  to authenticated using ((select auth.uid()) = user_id);

revoke all on public.habits from anon, authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant all on public.habits to service_role;

-- ---------------------------------------------------------------------------
-- habit_logs: um registro por hábito por dia
-- ---------------------------------------------------------------------------
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null,
  date date not null,
  value numeric(10, 2) not null check (value >= 0),
  -- Meta vigente no dia: mudar a meta depois não reescreve o passado.
  target_snapshot numeric(10, 2) check (target_snapshot > 0),
  source text not null default 'manual' check (source in ('manual', 'github')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create index habit_logs_user_date_idx on public.habit_logs (user_id, date);
create index habit_logs_habit_user_idx on public.habit_logs (habit_id, user_id);

create trigger habit_logs_set_updated_at
before update on public.habit_logs
for each row execute function private.set_updated_at();

alter table public.habit_logs enable row level security;

create policy "habit_logs: ler os próprios" on public.habit_logs for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "habit_logs: criar os próprios" on public.habit_logs for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "habit_logs: atualizar os próprios" on public.habit_logs for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habit_logs: apagar os próprios" on public.habit_logs for delete
  to authenticated using ((select auth.uid()) = user_id);

revoke all on public.habit_logs from anon, authenticated;
grant select, insert, update, delete on public.habit_logs to authenticated;
grant all on public.habit_logs to service_role;
