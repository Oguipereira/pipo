import type { HeatGrid } from "@/lib/heatmap";
import { WEEKDAYS_PT } from "@/lib/dates";

type HeatmapProps = {
  grid: HeatGrid;
  /** Descrição para leitores de tela. */
  label: string;
  /** Dia a destacar com contorno (normalmente hoje). */
  highlight?: string;
  /** Anima o "acender" do ano ao carregar. */
  sweep?: boolean;
  cell?: number;
  gap?: number;
  /** Quadradinhos clicáveis (usado com <DayPicker>). */
  interactive?: boolean;
  /** No desktop, estica para a largura da coluna. Desligue em heatmaps pequenos. */
  fluid?: boolean;
  /** Mostra rótulos de meses e dias da semana. */
  labels?: boolean;
};


export function Heatmap({
  grid,
  label,
  highlight,
  sweep = false,
  cell = 11,
  gap = 3,
  interactive = false,
  fluid = true,
  labels = true,
}: HeatmapProps) {
  const LEFT = labels ? 28 : 0;
  const TOP = labels ? 18 : 0;
  const step = cell + gap;
  const width = LEFT + grid.weeks.length * step - gap;
  const height = TOP + 7 * step - gap;

  return (
    <div className="scroll-end overflow-x-auto">
      {/* min-w-full: alinha à esquerda quando cabe; w-max: rola a partir de hoje quando não cabe */}
      <div className={`w-max min-w-full ${fluid ? "md:w-full" : ""}`}>
      <svg
        role="img"
        aria-label={label}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`block shrink-0 ${fluid ? "md:h-auto md:w-full md:max-w-[1100px]" : ""} ${sweep ? "heat-sweep" : ""} ${
          interactive ? "[&_rect[data-day]]:cursor-pointer [&_rect[data-day]:hover]:opacity-80" : ""
        }`}
      >
        <defs>
          <pattern id="pipo-off" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="3" fill="var(--color-ink)" />
            <rect width="1" height="3" fill="var(--color-heat-0)" />
          </pattern>
        </defs>

        {labels && grid.months.map((m) => (
          <text
            key={`${m.column}-${m.label}`}
            x={LEFT + m.column * step}
            y={10}
            className="fill-dust font-mono text-[10px]"
          >
            {m.label}
          </text>
        ))}

        {labels && [1, 3, 5].map((d) => (
          <text
            key={d}
            x={0}
            y={TOP + d * step + cell - 2}
            className="fill-faint font-mono text-[9px]"
          >
            {WEEKDAYS_PT[d]}
          </text>
        ))}

        {grid.weeks.map((week, c) =>
          week.map((day, r) => {
            if (!day) return null;
            const isHighlight = day.day === highlight;
            return (
              <rect
                key={day.day}
                data-c={c}
                data-day={day.day}
                style={sweep ? ({ "--c": c } as React.CSSProperties) : undefined}
                x={LEFT + c * step}
                y={TOP + r * step}
                width={cell}
                height={cell}
                rx={2}
                className={day.off ? "heat-off" : `heat-${day.level}`}
                stroke={isHighlight ? "var(--color-chalk)" : undefined}
                strokeWidth={isHighlight ? 1 : undefined}
              >
                <title>{day.label ?? day.day}</title>
              </rect>
            );
          }),
        )}
      </svg>
      </div>
    </div>
  );
}

export function HeatLegend({ less = "menos", more = "mais" }: { less?: string; more?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-dust" aria-hidden>
      <span>{less}</span>
      {[0, 1, 2, 3, 4].map((l) => (
        <svg key={l} width="10" height="10" className="block">
          <rect width="10" height="10" rx="2" className={`heat-${l}`} />
        </svg>
      ))}
      <span>{more}</span>
    </div>
  );
}
