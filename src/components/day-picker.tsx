"use client";

import { useRouter } from "next/navigation";

/**
 * Torna os quadradinhos de um <Heatmap interactive> clicáveis: o dia escolhido
 * vai para a URL (?dia=AAAA-MM-DD) e a página mostra o editor daquele dia.
 * A URL atual é lida só no clique, então nada aqui bloqueia a pré-renderização.
 */
export function DayPicker({ children, param = "dia" }: { children: React.ReactNode; param?: string }) {
  const router = useRouter();

  return (
    <div
      onClick={(e) => {
        const day = (e.target as Element).closest("[data-day]")?.getAttribute("data-day");
        if (!day) return;
        const url = new URL(window.location.href);
        url.searchParams.set(param, day);
        router.replace(`${url.pathname}${url.search}`, { scroll: false });
      }}
    >
      {children}
    </div>
  );
}
