"use client";

import { useId, useState } from "react";

type View = { key: string; label: string; content: React.ReactNode };

/**
 * Um heatmap por vez, com uma troca discreta em texto.
 * O conteúdo de cada aba vem renderizado do servidor; aqui só alternamos.
 */
export function HeatSwitch({ views }: { views: View[] }) {
  const [active, setActive] = useState(views[0]?.key);
  const id = useId();

  return (
    <div>
      <div role="tablist" aria-label="Ver atividade" className="mb-5 flex gap-5">
        {views.map((v) => {
          const selected = v.key === active;
          return (
            <button
              key={v.key}
              role="tab"
              type="button"
              id={`${id}-tab-${v.key}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${v.key}`}
              onClick={() => setActive(v.key)}
              className={`relative pb-1.5 text-[14px] transition-colors ${
                selected ? "text-chalk" : "text-faint hover:text-dust"
              }`}
            >
              {v.label}
              <span
                aria-hidden
                className={`absolute inset-x-0 -bottom-px h-px transition-opacity ${
                  selected ? "bg-heat-3 opacity-100" : "opacity-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      {views.map((v) => (
        <div
          key={v.key}
          role="tabpanel"
          id={`${id}-panel-${v.key}`}
          aria-labelledby={`${id}-tab-${v.key}`}
          hidden={v.key !== active}
        >
          {v.content}
        </div>
      ))}
    </div>
  );
}
