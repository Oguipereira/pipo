-- pipo · agregados para dashboard, código e relatório.
-- security invoker: rodam com as permissões (e o RLS) de quem chama.
-- Repositórios marcados como ignorados ficam de fora de tudo.

create function public.commit_counts(p_from date, p_to date)
returns table (day date, commits integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.local_date, count(*)::integer
  from public.commits c
  join public.repos r on r.id = c.repo_id and r.user_id = c.user_id
  where c.user_id = (select auth.uid())
    and not r.ignored
    and c.local_date between p_from and p_to
  group by c.local_date
  order by c.local_date;
$$;

create function public.repo_commit_counts(p_from date, p_to date)
returns table (repo_id uuid, full_name text, commits integer, last_commit_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id, r.full_name, count(*)::integer, max(c.committed_at)
  from public.commits c
  join public.repos r on r.id = c.repo_id and r.user_id = c.user_id
  where c.user_id = (select auth.uid())
    and not r.ignored
    and c.local_date between p_from and p_to
  group by r.id, r.full_name
  order by count(*) desc, r.full_name;
$$;

-- Linhas alteradas por linguagem (dos commits já detalhados).
create function public.language_stats(p_from date, p_to date)
returns table (language text, lines bigint, commits integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select cl.language,
         sum(cl.additions + cl.deletions)::bigint,
         count(distinct cl.commit_id)::integer
  from public.commit_languages cl
  join public.commits c on c.id = cl.commit_id and c.user_id = cl.user_id
  join public.repos r on r.id = c.repo_id and r.user_id = c.user_id
  where cl.user_id = (select auth.uid())
    and not r.ignored
    and c.local_date between p_from and p_to
  group by cl.language
  order by 2 desc;
$$;

create function public.language_monthly(p_from date, p_to date)
returns table (month date, language text, lines bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select date_trunc('month', c.local_date)::date,
         cl.language,
         sum(cl.additions + cl.deletions)::bigint
  from public.commit_languages cl
  join public.commits c on c.id = cl.commit_id and c.user_id = cl.user_id
  join public.repos r on r.id = c.repo_id and r.user_id = c.user_id
  where cl.user_id = (select auth.uid())
    and not r.ignored
    and c.local_date between p_from and p_to
  group by 1, 2
  order by 1, 3 desc;
$$;

-- Bibliotecas: em quantos repositórios aparecem e o peso pela atividade no período.
create function public.library_usage(p_from date, p_to date)
returns table (ecosystem text, name text, repos integer, active_repos integer, weight bigint, dev_only boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  with activity as (
    select c.repo_id, count(*)::bigint as commits
    from public.commits c
    where c.user_id = (select auth.uid())
      and c.local_date between p_from and p_to
    group by c.repo_id
  ),
  per_repo as (
    select d.ecosystem, d.name, d.repo_id, bool_and(d.is_dev) as dev_only
    from public.dependencies d
    join public.repos r on r.id = d.repo_id and r.user_id = d.user_id
    where d.user_id = (select auth.uid()) and not r.ignored
    group by d.ecosystem, d.name, d.repo_id
  )
  select p.ecosystem,
         p.name,
         count(*)::integer,
         count(a.repo_id)::integer,
         coalesce(sum(a.commits), 0)::bigint,
         bool_and(p.dev_only)
  from per_repo p
  left join activity a on a.repo_id = p.repo_id
  group by p.ecosystem, p.name
  order by 5 desc, 3 desc, 2;
$$;

revoke execute on function public.commit_counts(date, date) from public, anon;
revoke execute on function public.repo_commit_counts(date, date) from public, anon;
revoke execute on function public.language_stats(date, date) from public, anon;
revoke execute on function public.language_monthly(date, date) from public, anon;
revoke execute on function public.library_usage(date, date) from public, anon;
grant execute on function public.commit_counts(date, date) to authenticated;
grant execute on function public.repo_commit_counts(date, date) to authenticated;
grant execute on function public.language_stats(date, date) to authenticated;
grant execute on function public.language_monthly(date, date) to authenticated;
grant execute on function public.library_usage(date, date) to authenticated;
