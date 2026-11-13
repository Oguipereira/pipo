-- pipo · dados de exemplo para desenvolvimento local (`npx supabase db reset`).
-- Cria um usuário fictício com hábitos, registros, repositório, commits, projeto e agenda,
-- para ver as telas funcionando antes de conectar o GitHub.
--
-- Para entrar como esse usuário no ambiente local, use o login com GitHub de
-- desenvolvimento (OAuth App local) com a conta da allowlist, ou rode o app em
-- modo demonstração (PIPO_DEMO=1 npm run dev), que não precisa de banco.

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000aa';
  v_prog uuid;
  v_saude uuid;
  v_pessoal uuid;
  v_agua uuid;
  v_academia uuid;
  v_leitura uuid;
  v_estudo uuid;
  v_repo uuid;
  v_project uuid;
  v_m1 uuid;
  v_m2 uuid;
  v_day date;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_n int;
  i int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (
    v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo@pipo.local',
    '{"provider":"github","providers":["github"]}',
    '{"provider_id":"251160849","user_name":"demo","full_name":"Demo"}',
    now(), now()
  );

  select id into v_prog from public.categories where user_id = v_user and is_code;
  select id into v_saude from public.categories where user_id = v_user and name = 'Saúde';
  select id into v_pessoal from public.categories where user_id = v_user and name = 'Pessoal';

  insert into public.habits (user_id, category_id, name, kind, target, unit, schedule_days, start_date, position)
  values (v_user, v_saude, 'Água', 'quantity', 8, 'copos', 127, v_today - 120, 0)
  returning id into v_agua;
  insert into public.habits (user_id, category_id, name, kind, schedule_days, start_date, position)
  values (v_user, v_saude, 'Academia', 'boolean', 62, v_today - 120, 1)
  returning id into v_academia;
  insert into public.habits (user_id, category_id, name, kind, target, unit, schedule_days, start_date, position)
  values (v_user, v_pessoal, 'Leitura', 'quantity', 20, 'páginas', 127, v_today - 90, 2)
  returning id into v_leitura;
  insert into public.habits (user_id, category_id, name, kind, schedule_days, start_date, position)
  values (v_user, v_prog, 'Estudar programação', 'github', 62, v_today - 120, 3)
  returning id into v_estudo;

  -- Registros determinísticos (hash do dia) para os últimos 120 dias.
  for i in 0..120 loop
    v_day := v_today - i;
    v_n := abs(hashtext(v_day::text)) % 100;
    if v_n > 25 then
      insert into public.habit_logs (user_id, habit_id, date, value, target_snapshot)
      values (v_user, v_agua, v_day, least(8, 3 + v_n % 7), 8);
    end if;
    if extract(isodow from v_day) <= 5 and v_n > 20 then
      insert into public.habit_logs (user_id, habit_id, date, value) values (v_user, v_academia, v_day, 1);
    end if;
    if i <= 90 and v_n > 40 then
      insert into public.habit_logs (user_id, habit_id, date, value, target_snapshot)
      values (v_user, v_leitura, v_day, 10 + v_n % 15, 20);
    end if;
  end loop;

  insert into public.repos (user_id, github_id, full_name, name, owner, url, default_branch, primary_language, pushed_at)
  values (v_user, 1, 'demo/pipo', 'pipo', 'demo', 'https://github.com/demo/pipo', 'main', 'TypeScript', now())
  returning id into v_repo;
  insert into public.repo_languages (user_id, repo_id, language, color, bytes)
  values (v_user, v_repo, 'TypeScript', '#3178c6', 90000), (v_user, v_repo, 'CSS', '#663399', 8000), (v_user, v_repo, 'SQL', '#e38c00', 12000);

  for i in 0..364 loop
    v_day := v_today - i;
    v_n := case when extract(isodow from v_day) >= 6 then abs(hashtext('w' || v_day)) % 3 else abs(hashtext('c' || v_day)) % 7 end;
    insert into public.contribution_days (user_id, date, count, level)
    values (v_user, v_day, v_n, case when v_n = 0 then 0 when v_n < 2 then 1 when v_n < 4 then 2 when v_n < 6 then 3 else 4 end);
    for j in 1..v_n loop
      insert into public.commits (user_id, repo_id, sha, message, committed_at, local_date, url, additions, deletions, files_fetched_at)
      values (
        v_user, v_repo, md5(v_day::text || j) || substr(md5(j::text), 1, 8),
        (array['feat: check-in #T3', 'fix: fuso horário', 'refactor: streaks', 'docs: README', 'test: agenda'])[1 + (j + i) % 5],
        (v_day + time '20:00' + make_interval(mins => j * 7)) at time zone 'America/Sao_Paulo',
        v_day, 'https://github.com/demo/pipo', 10 * j, 2 * j, now()
      );
    end loop;
  end loop;
  insert into public.commit_languages (user_id, commit_id, language, files, additions, deletions)
  select v_user, c.id, 'TypeScript', 2, c.additions, c.deletions from public.commits c where c.user_id = v_user;

  insert into public.projects (user_id, name, description, color, category_id)
  values (v_user, 'pipo', 'Hábitos, código e projetos num quadradinho por dia.', '#39d353', v_prog)
  returning id into v_project;
  insert into public.project_repos (user_id, project_id, repo_id) values (v_user, v_project, v_repo);
  insert into public.milestones (user_id, project_id, title, position) values (v_user, v_project, 'Fundação', 0) returning id into v_m1;
  insert into public.milestones (user_id, project_id, title, position) values (v_user, v_project, 'Lançamento', 1) returning id into v_m2;
  insert into public.tasks (user_id, project_id, milestone_id, title, status, position, done_at, done_via) values
    (v_user, v_project, v_m1, 'Login com GitHub', 'done', 0, now() - interval '20 days', 'manual'),
    (v_user, v_project, v_m1, 'Heatmap', 'done', 1, now() - interval '10 days', 'manual'),
    (v_user, v_project, v_m1, 'Check-in com um toque', 'doing', 2, null, null),
    (v_user, v_project, v_m2, 'Relatório mensal', 'todo', 0, null, null),
    (v_user, v_project, v_m2, 'README com prints', 'todo', 1, null, null);

  insert into public.events (user_id, title, type, date, start_time, end_time, recurrence_days, location) values
    (v_user, 'Cálculo II', 'aula', v_today - 30, '19:00', '20:40', 10, 'Sala 204'),
    (v_user, 'LeetCode', 'estudo', v_today - 30, '07:00', '08:00', 62, null),
    (v_user, 'Prova de Cálculo II', 'prova', v_today + 6, '19:00', '21:00', null, 'Sala 204');
end $$;
