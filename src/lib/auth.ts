import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { DEFAULT_TIMEZONE } from "./dates";
import { connection } from "next/server";
import { DEMO } from "./demo";
import { createClient } from "./supabase/server";

export type Viewer = {
  id: string;
  login: string | null;
  name: string | null;
  avatarUrl: string | null;
  timezone: string;
};

/**
 * Usuário atual, validado no servidor (getClaims verifica a assinatura do JWT).
 * Redireciona para /login se não houver sessão. Lê cookies: use dentro de <Suspense>.
 */
export const getViewer = cache(async function getViewer(): Promise<Viewer> {
  if (DEMO) {
    await connection();
    return { id: "demo", login: "demo", name: "Demo", avatarUrl: null, timezone: DEFAULT_TIMEZONE };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("github_login, display_name, avatar_url, timezone")
    .eq("id", userId)
    .single();

  return {
    id: userId,
    login: profile?.github_login ?? null,
    name: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    timezone: profile?.timezone ?? DEFAULT_TIMEZONE,
  };
});
