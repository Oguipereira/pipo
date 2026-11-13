/**
 * Gráfico radial de "pétalas" (referência visual do usuário): cada fatia tem
 * uma pétala de fundo apagada e, por cima, uma pétala clara cujo raio é
 * proporcional ao valor. Lê melhor que pizza para 4–9 categorias.
 */
type Slice = { label: string; value: number; color?: string };

type Props = {
  slices: Slice[];
  size?: number;
  /** Texto do valor dentro da pétala (padrão: % do total). */
  format?: (value: number, total: number) => string;
  label: string;
};

export function RadialChart({ slices, size = 320, format = pct, label }: Props) {
  const data = slices.filter((s) => s.value > 0);
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(...data.map((d) => d.value));
  const c = size / 2;
  const inner = size * 0.09;
  const outer = size * 0.48;
  const step = (Math.PI * 2) / data.length;
  const gap = Math.min(step * 0.06, 0.05);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label={label} className="mx-auto block max-w-[360px]">
      {data.map((d, i) => {
        const a0 = -Math.PI / 2 + i * step + gap;
        const a1 = a0 + step - gap * 2;
        // raiz quadrada: área da pétala proporcional ao valor
        const r = inner + (outer - inner) * Math.sqrt(d.value / max);
        const mid = (a0 + a1) / 2;
        const labelR = Math.max(inner + (r - inner) * 0.62, inner + 26);
        const lx = c + Math.cos(mid) * labelR;
        const ly = c + Math.sin(mid) * labelR;
        return (
          <g key={d.label}>
            <path d={petal(c, inner, outer, a0, a1)} fill="var(--color-heat-0)" />
            <path d={petal(c, inner, r, a0, a1)} fill={d.color ?? "var(--color-chalk)"} fillOpacity={0.9} />
            <text
              x={lx}
              y={ly - 3}
              textAnchor="middle"
              className="num"
              fontSize={size * 0.048}
              fill={r - inner > 40 ? "var(--color-ink)" : "var(--color-chalk)"}
            >
              {format(d.value, total)}
            </text>
            <text
              x={lx}
              y={ly + size * 0.04}
              textAnchor="middle"
              fontSize={size * 0.033}
              fill={r - inner > 40 ? "var(--color-ink)" : "var(--color-dust)"}
              fillOpacity={0.85}
            >
              {d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label}
            </text>
            <title>{`${d.label}: ${format(d.value, total)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function pct(value: number, total: number) {
  const p = (value / total) * 100;
  return `${p < 1 ? p.toFixed(1) : Math.round(p)}%`;
}

/** Fatia de anel com cantos externos arredondados. */
function petal(c: number, r0: number, r1: number, a0: number, a1: number) {
  const round = Math.min(10, (r1 - r0) / 3, ((a1 - a0) * r1) / 4);
  const p = (r: number, a: number) => `${(c + Math.cos(a) * r).toFixed(2)} ${(c + Math.sin(a) * r).toFixed(2)}`;
  const da = round / r1;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${p(r0, a0)}`,
    `L ${p(r1 - round, a0)}`,
    `Q ${p(r1, a0)} ${p(r1, a0 + da)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1 - da)}`,
    `Q ${p(r1, a1)} ${p(r1 - round, a1)}`,
    `L ${p(r0, a1)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}`,
    "Z",
  ].join(" ");
}
