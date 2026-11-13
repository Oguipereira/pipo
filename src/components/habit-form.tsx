"use client";

import { useActionState, useState } from "react";
import { saveHabit, type FormState } from "@/app/(app)/habitos/actions";
import { WEEKDAYS_PT } from "@/lib/dates";
import { SCHEDULE_PRESETS, type Habit, type HabitKind } from "@/lib/habits";
import type { Category } from "@/lib/data/habits";

type Props = { categories: Category[]; habit?: Habit; today: string };

const KINDS: { kind: HabitKind; label: string; hint: string }[] = [
  { kind: "boolean", label: "Sim ou não", hint: "Ex.: academia" },
  { kind: "quantity", label: "Com meta", hint: "Ex.: 8 copos de água" },
  { kind: "github", label: "Automático", hint: "Feito com 1 commit no dia" },
];

// Semana começando na segunda.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function HabitForm({ categories, habit, today }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveHabit, undefined);
  const [categoryId, setCategoryId] = useState(habit?.categoryId ?? categories[0]?.id ?? "");
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? "boolean");
  const [mask, setMask] = useState(habit?.scheduleDays ?? 127);

  const isCodeCategory = categories.find((c) => c.id === categoryId)?.isCode ?? false;
  const effectiveKind = kind === "github" && !isCodeCategory ? "boolean" : kind;
  const err = state?.fieldErrors ?? {};

  return (
    <form action={action} className="max-w-lg space-y-8">
      {habit ? <input type="hidden" name="id" value={habit.id} /> : null}
      <input type="hidden" name="kind" value={effectiveKind} />

      <Field label="Nome" error={err.name}>
        <input
          name="name"
          defaultValue={habit?.name}
          required
          maxLength={60}
          placeholder="Ler, beber água, academia…"
          className={inputClass}
          autoComplete="off"
        />
      </Field>

      <Field label="Categoria">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.id} className={chipClass(categoryId === c.id)}>
              <input
                type="radio"
                name="categoryId"
                value={c.id}
                checked={categoryId === c.id}
                onChange={() => setCategoryId(c.id)}
                className="sr-only"
              />
              <span aria-hidden className="block size-1.5 rounded-full" style={{ background: c.color }} />
              {c.name}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Tipo" error={err.kind}>
        <div className="grid gap-2 sm:grid-cols-3">
          {KINDS.map((k) => {
            const disabled = k.kind === "github" && !isCodeCategory;
            const selected = effectiveKind === k.kind;
            return (
              <label
                key={k.kind}
                className={`block rounded-[4px] border px-3 py-2.5 ${
                  selected ? "border-heat-3 bg-heat-1/30" : "border-seam"
                } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:border-dust"}`}
              >
                <input
                  type="radio"
                  name="kindChoice"
                  value={k.kind}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => setKind(k.kind)}
                  className="sr-only"
                />
                <span className="block text-[14px] text-chalk">{k.label}</span>
                <span className="block text-[12px] text-faint">{disabled ? "Só em Programação" : k.hint}</span>
              </label>
            );
          })}
        </div>
      </Field>

      {effectiveKind === "quantity" ? (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Meta por dia" error={err.target}>
            <input
              name="target"
              inputMode="decimal"
              defaultValue={habit?.target ?? ""}
              placeholder="8"
              required
              className={`${inputClass} num`}
            />
          </Field>
          <Field label="Unidade" error={err.unit}>
            <input
              name="unit"
              defaultValue={habit?.unit ?? ""}
              placeholder="copos, páginas, min"
              maxLength={20}
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}

      <Field label="Dias" error={err.scheduleDays}>
        <div className="flex gap-1.5">
          {WEEK_ORDER.map((d) => {
            const on = (mask & (1 << d)) !== 0;
            return (
              <label key={d} className={`${dayClass(on)} cursor-pointer`}>
                <input
                  type="checkbox"
                  name="day"
                  value={d}
                  checked={on}
                  onChange={() => setMask(mask ^ (1 << d))}
                  className="sr-only"
                />
                {WEEKDAYS_PT[d]}
              </label>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
          {SCHEDULE_PRESETS.map((p) => (
            <button
              key={p.mask}
              type="button"
              onClick={() => setMask(p.mask)}
              className={mask === p.mask ? "text-chalk" : "text-faint hover:text-dust"}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Começa em" error={err.startDate} hint="Dias antes disso não contam para % nem sequência.">
        <input
          type="date"
          name="startDate"
          defaultValue={habit?.startDate ?? today}
          max={today}
          required
          className={`${inputClass} num w-auto [color-scheme:dark]`}
        />
      </Field>

      {state?.error ? (
        <p role="alert" className="text-[14px] text-alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[3px] bg-chalk px-5 font-medium text-ink hover:bg-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : habit ? "Salvar alterações" : "Criar hábito"}
      </button>
    </form>
  );
}

const inputClass =
  "block h-11 w-full rounded-[3px] border border-seam bg-transparent px-3 text-[15px] text-chalk placeholder:text-faint focus:border-dust focus:outline-none";

function chipClass(selected: boolean) {
  return `inline-flex cursor-pointer items-center gap-2 rounded-[3px] border px-3 py-1.5 text-[14px] ${
    selected ? "border-heat-3 text-chalk" : "border-seam text-dust hover:border-dust"
  }`;
}

function dayClass(on: boolean) {
  return `grid h-10 flex-1 place-items-center rounded-[3px] font-mono text-[12px] ${
    on ? "bg-heat-2 text-chalk" : "bg-heat-0 text-faint"
  }`;
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-dust">{label}</p>
      {children}
      {hint && !error ? <p className="mt-2 text-[12px] text-faint">{hint}</p> : null}
      {error ? <p className="mt-2 text-[13px] text-alert">{error}</p> : null}
    </div>
  );
}
