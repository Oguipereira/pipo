-- pipo · fase 1 · fundação
-- Perfis, categorias e allowlist de acesso por GitHub ID.
-- Todo dado de domínio é por usuário (user_id + RLS), pronto para SaaS.

-- ---------------------------------------------------------------------------
-- Esquema privado (não exposto pela Data API)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Quem pode criar conta. Abrir para SaaS = remover o trigger enforce_allowlist.
create table private.allowed_github_ids (
  github_id bigint primary key,
  note text,
  created_at timestamptz not null default now()
);

insert into private.allowed_github_ids (github_id, note)
values (251160849, 'Oguipereira (dono)');

-- updated_at automático
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  github_id bigint unique,
  github_login text,
  display_name text,
  avatar_url text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Um por usuário do Auth. Criado pelo trigger handle_new_user.';
comment on column public.profiles.timezone is 'IANA. Define o "dia" de hábitos, commits e relatórios.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: ler o próprio"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles: atualizar o próprio"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Só campos editáveis pelo usuário; github_id/login vêm do provider.
grant update (display_name, timezone) on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#39d353' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_code boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

comment on column public.categories.is_code is
  'Liga a categoria ao GitHub: hábito automático e fechamento de tarefa por commit.';

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

alter table public.categories enable row level security;

create policy "categories: ler as próprias"
on public.categories for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "categories: criar as próprias"
on public.categories for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "categories: atualizar as próprias"
on public.categories for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "categories: apagar as próprias"
on public.categories for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.categories from anon, authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;

-- ---------------------------------------------------------------------------
-- Novos usuários
-- ---------------------------------------------------------------------------

-- Recusa a criação de qualquer usuário fora da allowlist.
-- O provider vem de raw_app_meta_data (não editável pelo usuário), o que impede
-- burlar a regra com um cadastro por e-mail forjando user_metadata.
create function private.enforce_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text := new.raw_app_meta_data ->> 'provider';
  v_github_id bigint;
begin
  if v_provider is distinct from 'github' then
    raise exception 'pipo: apenas login com GitHub é permitido'
      using errcode = '42501';
  end if;

  begin
    v_github_id := coalesce(
      new.raw_user_meta_data ->> 'provider_id',
      new.raw_user_meta_data ->> 'sub'
    )::bigint;
  exception when others then
    v_github_id := null;
  end;

  if v_github_id is null
     or not exists (
       select 1 from private.allowed_github_ids a where a.github_id = v_github_id
     ) then
    raise exception 'pipo: esta conta do GitHub não tem acesso'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger enforce_allowlist
before insert on auth.users
for each row execute function private.enforce_allowlist();

-- Cria o perfil e as categorias padrão.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, github_id, github_login, display_name, avatar_url)
  values (
    new.id,
    nullif(coalesce(v_meta ->> 'provider_id', v_meta ->> 'sub'), '')::bigint,
    coalesce(v_meta ->> 'user_name', v_meta ->> 'preferred_username'),
    coalesce(v_meta ->> 'full_name', v_meta ->> 'name', v_meta ->> 'user_name'),
    v_meta ->> 'avatar_url'
  );

  insert into public.categories (user_id, name, color, is_code, position)
  values
    (new.id, 'Programação', '#39d353', true,  0),
    (new.id, 'Estudos',     '#58a6ff', false, 1),
    (new.id, 'Saúde',       '#f778ba', false, 2),
    (new.id, 'Pessoal',     '#d29922', false, 3);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

revoke execute on all functions in schema private from public, anon, authenticated;
