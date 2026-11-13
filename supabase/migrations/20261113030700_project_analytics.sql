-- pipo · fase 5 · commits por projeto (via repositórios vinculados).

create function public.project_commit_counts(p_project uuid, p_from date, p_to date)
returns table (day date, commits integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.local_date, count(*)::integer
  from public.project_repos pr
  join public.commits c on c.repo_id = pr.repo_id and c.user_id = pr.user_id
  where pr.project_id = p_project
    and pr.user_id = (select auth.uid())
    and c.local_date between p_from and p_to
  group by c.local_date
  order by c.local_date;
$$;

create function public.project_activity(p_from date, p_to date)
returns table (project_id uuid, commits integer, last_commit_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select pr.project_id, count(c.id)::integer, max(c.committed_at)
  from public.project_repos pr
  left join public.commits c
    on c.repo_id = pr.repo_id and c.user_id = pr.user_id and c.local_date between p_from and p_to
  where pr.user_id = (select auth.uid())
  group by pr.project_id;
$$;

revoke execute on function public.project_commit_counts(uuid, date, date) from public, anon;
revoke execute on function public.project_activity(date, date) from public, anon;
grant execute on function public.project_commit_counts(uuid, date, date) to authenticated;
grant execute on function public.project_activity(date, date) to authenticated;
