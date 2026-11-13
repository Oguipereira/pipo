"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-prose space-y-4 py-10">
      <p className="font-mono text-[22px] text-chalk">
        <span className="text-faint">~/</span>erro
        <span aria-hidden className="ml-1.5 inline-block size-[0.55em] rounded-[2px] bg-alert" />
      </p>
      <p className="text-[15px] leading-relaxed text-dust">
        Não foi possível carregar esta tela. Se o problema continuar, confira a conexão com o banco e as variáveis de
        ambiente.
      </p>
      {error.digest ? <p className="num text-[12px] text-faint">código {error.digest}</p> : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-[3px] border border-seam px-3 py-1.5 text-[14px] text-chalk hover:border-dust"
      >
        Tentar de novo
      </button>
    </div>
  );
}
