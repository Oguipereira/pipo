"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { setHabitValue } from "@/app/(app)/habitos/actions";
import { formatAmount, type Habit } from "@/lib/habits";

export type CheckInItem = {
  habit: Habit;
  /** Valor registrado no dia (0 se nada). */
  value: number;
  /** Há registro manual? (para hábitos automáticos) */
  hasLog: boolean;
  /** Commits no dia (hábitos automáticos). */
  commits: number;
  color: string | null;
};

type Props = { day: string; items: CheckInItem[]; emptyText?: React.ReactNode };

/** Lista de hábitos do dia, marcáveis com um toque. Atualiza na hora e salva em segundo plano. */
export function CheckIn({ day, items, emptyText }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(
    new Map(items.map((i) => [i.habit.id, { value: i.value, hasLog: i.hasLog }])),
    (state, { id, value }: { id: string; value: number | null }) =>
      new Map(state).set(id, { value: value ?? 0, hasLog: value !== null }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(id: string, value: number | null) {
    setError(null);
    startTransition(async () => {
      setOptimistic({ id, value });
      try {
        await setHabitValue(id, day, value);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      }
    });
  }

  if (items.length === 0) {
    return <div className="text-[15px] leading-relaxed text-dust">{emptyText}</div>;
  }

  return (
    <div>
      <ul className="divide-y divide-seam/60">
        {items.map((item) => (
          <CheckInRow
            key={item.habit.id}
            item={{ ...item, hasLog: optimistic.get(item.habit.id)?.hasLog ?? item.hasLog }}
            value={optimistic.get(item.habit.id)?.value ?? 0}
            onChange={(v) => save(item.habit.id, v)}
          />
        ))}
      </ul>
      {error ? (
        <p role="alert" className="mt-3 text-[13px] text-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CheckInRow({
  item,
  value,
  onChange,
}: {
  item: CheckInItem;
  value: number;
  /** null apaga o registro (no automático, volta a contar pelos commits). */
  onChange: (v: number | null) => void;
}) {
  const { habit } = item;

  if (habit.kind === "quantity") {
    const target = habit.target ?? 1;
    const done = value >= target;
    return (
      <li className="flex items-center gap-4 py-3.5">
        <div className="min-w-0 flex-1">
          <HabitName item={item} done={done} />
          <Pips value={value} target={target} />
        </div>
        <QuantityControl value={value} target={target} unit={habit.unit} onChange={onChange} />
      </li>
    );
  }

  if (habit.kind === "github") {
    const done = item.hasLog ? value > 0 : item.commits > 0;
    const caption = item.hasLog
      ? "marcado à mão"
      : item.commits > 0
        ? `${item.commits} commit${item.commits === 1 ? "" : "s"} no dia`
        : "marca sozinho com o primeiro commit";
    return (
      <li className="flex items-center gap-4 py-3.5">
        <button
          type="button"
          onClick={() => onChange(done ? 0 : 1)}
          aria-pressed={done}
          aria-label={done ? "Marcar como não feito (corrige o automático)" : "Marcar como feito (corrige o automático)"}
          className={`block size-7 shrink-0 rounded-[4px] ${done ? "bg-heat-4" : "bg-heat-0 ring-1 ring-inset ring-seam"}`}
        />
        <div className="min-w-0 flex-1">
          <HabitName item={item} done={done} />
          <p className="mt-0.5 text-[12px] text-faint">
            {caption}
            {item.hasLog ? (
              <>
                {" "}
                <button type="button" onClick={() => onChange(null)} className="underline decoration-seam underline-offset-4 hover:text-dust">
                  voltar ao automático
                </button>
              </>
            ) : null}
          </p>
        </div>
      </li>
    );
  }

  const done = value > 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onChange(done ? 0 : 1)}
        aria-pressed={done}
        className="flex w-full items-center gap-4 py-3.5 text-left"
      >
        <span
          aria-hidden
          className={`block size-7 shrink-0 rounded-[4px] transition-colors ${
            done ? "bg-heat-4" : "bg-heat-0 ring-1 ring-inset ring-seam"
          }`}
        />
        <span className="min-w-0 flex-1">
          <HabitName item={item} done={done} />
        </span>
      </button>
    </li>
  );
}

function HabitName({ item, done }: { item: CheckInItem; done: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {item.color ? <span aria-hidden className="block size-1.5 rounded-full" style={{ background: item.color }} /> : null}
      <span className={`truncate text-[15px] ${done ? "text-chalk" : "text-chalk/90"}`}>{item.habit.name}</span>
      {done ? <span className="sr-only">(feito)</span> : null}
    </span>
  );
}

/** Um quadradinho por unidade da meta (até 12); acima disso, uma barra. */
function Pips({ value, target }: { value: number; target: number }) {
  if (target <= 12 && Number.isInteger(target)) {
    return (
      <span aria-hidden className="mt-2 flex gap-1">
        {Array.from({ length: target }, (_, i) => (
          <span key={i} className={`block size-2 rounded-[2px] ${i < value ? "bg-heat-3" : "bg-heat-0"}`} />
        ))}
      </span>
    );
  }
  const pct = Math.min(1, value / target) * 100;
  return (
    <span aria-hidden className="mt-2 block h-1 w-full max-w-48 overflow-hidden rounded-full bg-heat-0">
      <span className="block h-full bg-heat-3" style={{ width: `${pct}%` }} />
    </span>
  );
}

function QuantityControl({
  value,
  target,
  unit,
  onChange,
}: {
  value: number;
  target: number;
  unit: string | null;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const step = target >= 30 ? 5 : 1;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <StepButton label="Diminuir" disabled={value <= 0} onClick={() => onChange(Math.max(0, value - step))}>
        −
      </StepButton>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(String(input.current?.value ?? "").replace(",", "."));
            if (Number.isFinite(n) && n >= 0) onChange(n);
            setEditing(false);
          }}
        >
          <input
            ref={input}
            autoFocus
            inputMode="decimal"
            defaultValue={value || ""}
            onBlur={(e) => e.currentTarget.form?.requestSubmit()}
            aria-label="Quantidade"
            className="num h-9 w-16 rounded-[3px] bg-heat-0 px-2 text-center text-[15px] text-chalk outline-none"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="num min-w-16 px-1 text-center text-[15px] text-chalk"
          aria-label={`${formatAmount(value)} de ${formatAmount(target)}${unit ? ` ${unit}` : ""}. Tocar para digitar.`}
        >
          {formatAmount(value)}
          <span className="text-faint">/{formatAmount(target)}</span>
          {unit ? <span className="block text-[11px] leading-tight text-faint">{unit}</span> : null}
        </button>
      )}
      <StepButton label="Aumentar" onClick={() => onChange(value + step)}>
        +
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="num grid size-9 place-items-center rounded-[4px] bg-heat-0 text-[18px] text-chalk hover:bg-seam disabled:opacity-30 active:translate-y-px"
    >
      {children}
    </button>
  );
}
