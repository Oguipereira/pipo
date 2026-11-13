-- Índices para as FKs de user_id que ainda não tinham cobertura (advisor 0001).
create index event_exceptions_user_idx on public.event_exceptions (user_id);
create index milestones_user_idx on public.milestones (user_id);
create index project_repos_user_idx on public.project_repos (user_id);
create index task_commits_user_idx on public.task_commits (user_id);
