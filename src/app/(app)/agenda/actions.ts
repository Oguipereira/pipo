"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isDay } from "@/lib/dates";
import { DEMO } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export type EventFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.")
  .nullable();

const eventSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1, "Dê um título.").max(120, "Até 120 caracteres."),
    type: z.enum(["aula", "estudo", "prova", "entrega", "reuniao", "outro"]),
    date: z.string().refine(isDay, "Data inválida."),
    startTime: time,
    endTime: time,
    repeats: z.boolean(),
    recurrenceDays: z.number().int().min(0).max(127),
    recurrenceUntil: z
      .string()
      .nullable()
      .refine((v) => v === null || isDay(v), "Data inválida."),
    location: z.string().trim().max(200).nullable(),
    notes: z.string().trim().max(2000).nullable(),
    projectId: z.string().uuid().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.endTime && !v.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Informe o início." });
    if (v.startTime && v.endTime && v.endTime <= v.startTime)
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "O fim precisa ser depois do início." });
    if (v.repeats && v.recurrenceDays === 0)
      ctx.addIssue({ code: "custom", path: ["recurrenceDays"], message: "Escolha os dias da semana." });
    if (v.repeats && v.recurrenceUntil && v.recurrenceUntil < v.date)
      ctx.addIssue({ code: "custom", path: ["recurrenceUntil"], message: "O fim precisa ser depois da primeira data." });
  });

const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

export async function saveEvent(_prev: EventFormState, fd: FormData): Promise<EventFormState> {
  await getViewer();
  if (DEMO) return { error: "Modo demonstração: nada é salvo." };
  const days = fd.getAll("day").map(Number).filter((d) => d >= 0 && d <= 6);
  const parsed = eventSchema.safeParse({
    id: text(fd, "id") ?? undefined,
    title: text(fd, "title") ?? "",
    type: text(fd, "type") ?? "estudo",
    date: text(fd, "date") ?? "",
    startTime: text(fd, "startTime"),
    endTime: text(fd, "endTime"),
    repeats: fd.get("repeats") === "on",
    recurrenceDays: days.reduce((m, d) => m | (1 << d), 0),
    recurrenceUntil: text(fd, "recurrenceUntil"),
    location: text(fd, "location"),
    notes: text(fd, "notes"),
    projectId: text(fd, "projectId"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const v = parsed.data;
  const row = {
    title: v.title,
    type: v.type,
    date: v.date,
    start_time: v.startTime,
    end_time: v.startTime ? v.endTime : null,
    recurrence_days: v.repeats ? v.recurrenceDays : null,
    recurrence_until: v.repeats ? v.recurrenceUntil : null,
    location: v.location,
    notes: v.notes,
    project_id: v.projectId,
  };
  const supabase = await createClient();
  const { error } = v.id
    ? await supabase.from("events").update(row).eq("id", v.id)
    : await supabase.from("events").insert(row);
  if (error) return { error: "Não foi possível salvar o compromisso." };
  redirect(`/agenda?semana=${v.date}`);
}

export async function deleteEvent(id: string) {
  await getViewer();
  if (DEMO || !z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", id);
  redirect("/agenda");
}

/** Cancela só uma ocorrência de um compromisso recorrente (ou volta a mostrá-la). */
export async function toggleOccurrence(eventId: string, day: string, cancel: boolean) {
  await getViewer();
  if (DEMO || !z.string().uuid().safeParse(eventId).success || !isDay(day)) return;
  const supabase = await createClient();
  if (cancel) {
    await supabase.from("event_exceptions").upsert({ event_id: eventId, date: day }, { onConflict: "event_id,date" });
  } else {
    await supabase.from("event_exceptions").delete().eq("event_id", eventId).eq("date", day);
  }
  refresh();
}
