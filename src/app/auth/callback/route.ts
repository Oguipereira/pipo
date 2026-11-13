import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Retorno do OAuth do GitHub. Troca o código pela sessão.
 * Se o trigger de allowlist recusar a conta, o Supabase volta com `error`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (searchParams.get("error")) {
    return NextResponse.redirect(new URL("/login?error=denied", origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", origin));
  }

  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
