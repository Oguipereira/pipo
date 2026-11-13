-- O próprio usuário vincula commits antigos ao criar uma tarefa (#T12 já citado).
-- As FKs compostas garantem que tarefa e commit são do mesmo usuário.
create policy "dono: criar" on public.task_commits for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "dono: apagar" on public.task_commits for delete to authenticated
  using ((select auth.uid()) = user_id);
grant insert, delete on public.task_commits to authenticated;
