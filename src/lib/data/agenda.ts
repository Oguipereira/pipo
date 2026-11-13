import "server-only";
import type { AgendaEvent, EventType } from "../agenda";
import { DEMO, demoEvents } from "../demo";
import { createClient } from "../supabase/server";

export async function getEvents(): Promise<AgendaEvent[]> {
  if (DEMO) return demoEvents();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, event_exceptions!event_exceptions_event_id_user_id_fkey(date)")
    .order("date");
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type as EventType,
    date: e.date,
    startTime: e.start_time,
    endTime: e.end_time,
    recurrenceDays: e.recurrence_days,
    recurrenceUntil: e.recurrence_until,
    location: e.location,
    notes: e.notes,
    categoryId: e.category_id,
    projectId: e.project_id,
    taskId: e.task_id,
    exceptions: (e.event_exceptions ?? []).map((x: { date: string }) => x.date),
  }));
}

export async function getEvent(id: string): Promise<AgendaEvent | null> {
  const events = await getEvents();
  return events.find((e) => e.id === id) ?? null;
}
