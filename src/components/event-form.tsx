"use client";

import { useActionState, useState } from "react";
import { saveEvent, type EventFormState } from "@/app/(app)/agenda/actions";
import { EVENT_TYPES, type AgendaEvent } from "@/lib/agenda";
import { WEEKDAYS_PT, weekday } from "@/lib/dates";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

type Props = { event?: AgendaEvent; defaultDate: string; projects: { id: string; name: string }[] };

export function EventForm({ event, defaultDate, projects }: Props) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(saveEvent, undefined);
  const [type, setType] = useState(event?.type ?? "estudo");
  const [date, setDate] = useState(event?.date ?? defaultDate);
  const [repeats, setRepeats] = useState(event?.recurrenceDays != null);
  const [mask, setMask] = useState(event?.recurrenceDays ?? 1 << weekday(event?.date ?? defaultDate));
  const err = state?.fieldErrors ?? {};

  return (
    <form action={action} className="max-w-lg space-y-7">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <input type="hidden" name="type" value={type} />

      <Field label="Título" error={err.title}>
        <input name="title" defaultValue={event?.title} required maxLength={120} placeholder="Aula de Cálculo, prova de ED…" className={inputClass} autoComplete="off" />
      </Field>

      <Field label="Tipo">
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setType(t.type)}
              aria-pressed={type === t.type}
              className={`inline-flex items-center gap-2 rounded-[3px] border px-3 py-1.5 text-[14px] ${
                type === t.type ? "border-heat-3 text-chalk" : "border-seam text-dust hover:border-dust"
              }`}
            >
              <span aria-hidden className="block size-1.5 rounded-full" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label={repeats ? "Começa em" : "Data"} error={err.date}>
          <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required className={`${inputClass} num px-2 [color-scheme:dark]`} />
        </Field>
        <Field label="Início" error={err.startTime}>
          <input type="time" name="startTime" defaultValue={event?.startTime?.slice(0, 5) ?? ""} className={`${inputClass} num px-2 [color-scheme:dark]`} />
        </Field>
        <Field label="Fim" error={err.endTime}>
          <input type="time" name="endTime" defaultValue={event?.endTime?.slice(0, 5) ?? ""} className={`${inputClass} num px-2 [color-scheme:dark]`} />
        </Field>
      </div>
      <p className="-mt-4 text-[12px] text-faint">Sem horário de início, vale o dia inteiro.</p>

      <div className="space-y-4">
        <label className="flex cursor-pointer items-center gap-3 text-[14px] text-chalk">
          <input type="checkbox" name="repeats" checked={repeats} onChange={(e) => setRepeats(e.target.checked)} className="size-4 accent-heat-3" />
          Repete toda semana
        </label>
        {repeats ? (
          <>
            <Field label="Dias" error={err.recurrenceDays}>
              <div className="flex gap-1.5">
                {WEEK_ORDER.map((d) => {
                  const on = (mask & (1 << d)) !== 0;
                  return (
                    <label key={d} className={`grid h-10 flex-1 cursor-pointer place-items-center rounded-[3px] font-mono text-[12px] transition-colors ${on ? "bg-heat-3 font-semibold text-ink" : "text-faint ring-1 ring-inset ring-seam hover:text-dust"}`}>
                      <input type="checkbox" name="day" value={d} checked={on} onChange={() => setMask(mask ^ (1 << d))} className="sr-only" />
                      {WEEKDAYS_PT[d]}
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Até" error={err.recurrenceUntil} hint="Opcional, ex.: o fim do semestre.">
              <input type="date" name="recurrenceUntil" defaultValue={event?.recurrenceUntil ?? ""} min={date} className={`${inputClass} num w-auto [color-scheme:dark]`} />
            </Field>
          </>
        ) : null}
      </div>

      <Field label="Local ou link">
        <input name="location" defaultValue={event?.location ?? ""} maxLength={200} placeholder="Opcional" className={inputClass} />
      </Field>

      {projects.length ? (
        <Field label="Projeto">
          <select name="projectId" defaultValue={event?.projectId ?? ""} className={`${inputClass} w-auto`}>
            <option value="">nenhum</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label="Notas">
        <textarea name="notes" defaultValue={event?.notes ?? ""} rows={3} maxLength={2000} placeholder="Conteúdo da prova, link da aula…" className={`${inputClass} h-auto py-2.5`} />
      </Field>

      {state?.error ? (
        <p role="alert" className="text-[14px] text-alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="h-11 rounded-[3px] bg-chalk px-5 font-medium text-ink hover:bg-white disabled:opacity-60">
        {pending ? "Salvando…" : event ? "Salvar alterações" : "Criar compromisso"}
      </button>
    </form>
  );
}

const inputClass =
  "block h-11 w-full rounded-[3px] border border-seam bg-transparent px-3 text-[15px] text-chalk placeholder:text-faint focus:border-dust focus:outline-none";

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-dust">{label}</p>
      {children}
      {hint && !error ? <p className="mt-2 text-[12px] text-faint">{hint}</p> : null}
      {error ? <p className="mt-2 text-[13px] text-alert">{error}</p> : null}
    </div>
  );
}
