-- pipo · fase 6 · agenda de estudos.
-- Datas e horários são de parede, no fuso do usuário: "seg/qua 19h" continua
-- 19h mesmo com mudança de horário de verão.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  type text not null default 'estudo'
    check (type in ('aula', 'estudo', 'prova', 'entrega', 'reuniao', 'outro')),
  -- Primeira ocorrência (ou única, sem recorrência).
  date date not null,
  start_time time,
  end_time time,
  -- Bitmask dom→sáb como em habits.schedule_days. null = não se repete.
  recurrence_days smallint check (recurrence_days between 1 and 127),
  recurrence_until date,
  location text check (char_length(location) <= 200),
  notes text check (char_length(notes) <= 2000),
  category_id uuid,
  project_id uuid,
  task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint events_times_valid check (
    (start_time is null and end_time is null)
    or (start_time is not null and (end_time is null or end_time > start_time))
  ),
  constraint events_until_after_start check (recurrence_until is null or recurrence_until >= date),
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  foreign key (project_id, user_id)
    references public.projects (id, user_id) on delete set null (project_id),
  foreign key (task_id, user_id)
    references public.tasks (id, user_id) on delete set null (task_id)
);
create index events_user_date_idx on public.events (user_id, date);
create index events_category_idx on public.events (category_id, user_id);
create index events_project_idx on public.events (project_id, user_id);
create index events_task_idx on public.events (task_id, user_id);
create trigger events_set_updated_at before update on public.events
  for each row execute function private.set_updated_at();
select private.own_table('public.events');

-- Ocorrência cancelada de um evento recorrente.
create table public.event_exceptions (
  event_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  primary key (event_id, date),
  foreign key (event_id, user_id) references public.events (id, user_id) on delete cascade
);
create index event_exceptions_event_user_idx on public.event_exceptions (event_id, user_id);
select private.own_table('public.event_exceptions');
