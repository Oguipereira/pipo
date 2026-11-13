"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Result = { status?: string; error?: string; stats?: { commits?: number; pending?: string[] } };

/** "Sincronizar agora": chama /api/sync com a sessão e recarrega os dados da página. */
export function SyncButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as Result;
      if (body.status === "running") setMessage("Já tem uma sincronização em andamento.");
      else if (body.error) setMessage(body.error);
      else if (body.status === "partial") setMessage("Parte sincronizada. O resto continua na próxima rodada.");
      else setMessage(body.stats?.commits ? `${body.stats.commits} commits novos.` : "Tudo em dia.");
    } catch {
      setMessage("Sem conexão com o servidor.");
    } finally {
      setBusy(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={sync}
        disabled={busy || disabled}
        className="rounded-[3px] border border-seam px-3 py-1.5 text-[14px] text-chalk hover:border-dust disabled:opacity-50"
      >
        {busy ? "Sincronizando…" : "Sincronizar agora"}
      </button>
      {message ? (
        <span role="status" className="text-[13px] text-dust">
          {message}
        </span>
      ) : null}
    </div>
  );
}
