-- pipo · fase 3 · sincronização automática a cada 4h.
-- O pg_cron chama POST {app_url}/api/sync com o segredo do cron.
-- URL e segredo ficam no Supabase Vault; sem eles o job não faz nada.
--
-- Para ativar (uma vez, no SQL Editor):
--   select vault.create_secret('https://SEU-APP.vercel.app', 'pipo_app_url');
--   select vault.create_secret('MESMO-VALOR-DO-CRON_SECRET', 'pipo_cron_secret');

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create function private.trigger_github_sync()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'pipo_app_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'pipo_cron_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;

  return net.http_post(
    url := rtrim(v_url, '/') || '/api/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;
revoke execute on function private.trigger_github_sync() from public, anon, authenticated;

-- 7 minutos depois de 0h, 4h, 8h, 12h, 16h e 20h (UTC).
select cron.schedule('pipo-github-sync', '7 */4 * * *', 'select private.trigger_github_sync()');
