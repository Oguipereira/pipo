import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { syncUser, type SyncTrigger } from "@/lib/github/sync";
import { envTokenProvider } from "@/lib/github/token";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// A sincronização inicial (1 ano de histórico) pode levar alguns minutos.
export const maxDuration = 300;

const LOCK_MINUTES = 10;

/**
 * POST /api/sync
 * - Com o segredo do agendador (pg_cron, a cada 4h, lido do Vault): sincroniza todos os usuários.
 * - Com a sessão do usuário (botão "sincronizar agora"): sincroniza só ele.
 */
export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] ?? null;
  const cron = bearer !== null && (await isCronSecret(bearer));

  // Autentica antes de qualquer outra resposta.
  let userId: string | undefined;
  let timezone = DEFAULT_TIMEZONE;
  if (!cron) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Faça login." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).single();
    timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: "SUPABASE_SECRET_KEY não configurada no servidor." }, { status: 503 });
  }
  const admin = createAdminClient();

  if (cron) {
    const { data: profiles, error } = await admin.from("profiles").select("id, timezone");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const results = [];
    const perUser = Math.max(30_000, Math.floor(250_000 / Math.max(1, profiles.length)));
    for (const p of profiles) {
      results.push({ user: p.id, ...(await runFor(admin, p.id, p.timezone, "cron", perUser)) });
    }
    return NextResponse.json({ results });
  }

  const result = await runFor(admin, userId!, timezone, "manual", 55_000);
  const status = result.status === "running" ? 409 : result.status === "error" ? 502 : 200;
  return NextResponse.json(result, { status });
}

async function runFor(admin: AdminClient, userId: string, timezone: string, trigger: SyncTrigger, budgetMs: number) {
  const token = await envTokenProvider.getTokenFor(userId);
  if (!token) return { status: "error", error: "GITHUB_TOKEN não configurado no servidor." };

  // Trava: uma sincronização por vez. Execuções presas há mais de 10 min viram erro.
  const lockSince = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
  await admin
    .from("sync_runs")
    .update({ status: "error", error: "Interrompida (tempo esgotado).", finished_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "running")
    .lt("started_at", lockSince);
  const { data: running } = await admin
    .from("sync_runs")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "running")
    .limit(1);
  if (running?.length) return { status: "running" };

  return syncUser({ db: admin, userId, timezone, token, trigger, budgetMs });
}

/**
 * O segredo do pg_cron fica no Vault do Supabase (conferido pela função
 * verify_cron_secret, só para service_role). CRON_SECRET na env é opcional.
 */
async function isCronSecret(given: string): Promise<boolean> {
  const env = process.env.CRON_SECRET;
  if (env) {
    const a = Buffer.from(given);
    const b = Buffer.from(env);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  if (!process.env.SUPABASE_SECRET_KEY || given.length > 200) return false;
  const { data } = await createAdminClient().rpc("verify_cron_secret", { p_secret: given });
  return data === true;
}
