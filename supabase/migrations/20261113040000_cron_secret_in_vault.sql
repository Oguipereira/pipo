-- O segredo do agendador fica só no Vault: a rota /api/sync confere por esta
-- função (apenas service_role), então não é preciso copiá-lo para a Vercel.
-- Gerado dentro do banco; ninguém precisa ver o valor.

create function public.verify_cron_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'pipo_cron_secret' and decrypted_secret = p_secret
  );
$$;

revoke execute on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pipo_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'pipo_cron_secret');
  end if;
end $$;
