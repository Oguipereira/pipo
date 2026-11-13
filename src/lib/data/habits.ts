import "server-only";
import type { Day } from "../dates";
import type { Habit, HabitLog } from "../habits";
import { DEMO, demoCategories, demoCommitCounts, demoHabits, demoLogs } from "../demo";
import { createClient } from "../supabase/server";
import type { Tables } from "../supabase/database.types";
import { fetchAll } from "./fetch-all";

export type Category = { id: string; name: string; color: string; isCode: boolean };

export function toHabit(row: Tables<"habits">): Habit {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    target: row.target,
    unit: row.unit,
    scheduleDays: row.schedule_days,
    startDate: row.start_date,
    archivedAt: row.archived_at,
    categoryId: row.category_id,
    position: row.position,
  };
}

export async function getCategories(): Promise<Category[]> {
  if (DEMO) return demoCategories;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, color, is_code")
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color, isCode: c.is_code }));
}

export async function getHabits({ archived = false } = {}): Promise<Habit[]> {
  if (DEMO) return archived ? [] : demoHabits;
  const supabase = await createClient();
  let query = supabase.from("habits").select("*").order("position").order("created_at");
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toHabit);
}

export async function getHabit(id: string): Promise<Habit | null> {
  if (DEMO) return demoHabits.find((h) => h.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("habits").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toHabit(data) : null;
}

export async function getLogs(from: Day, to: Day, habitIds?: string[]): Promise<HabitLog[]> {
  if (habitIds && habitIds.length === 0) return [];
  if (DEMO) return demoLogs().filter((l) => l.date >= from && l.date <= to && (!habitIds || habitIds.includes(l.habitId)));
  const supabase = await createClient();
  const rows = await fetchAll((a, b) => {
    let q = supabase
      .from("habit_logs")
      .select("habit_id, date, value, target_snapshot")
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("habit_id");
    if (habitIds) q = q.in("habit_id", habitIds);
    return q.range(a, b);
  });
  return rows.map((r) => ({
    habitId: r.habit_id,
    date: r.date,
    value: Number(r.value),
    targetSnapshot: r.target_snapshot == null ? null : Number(r.target_snapshot),
  }));
}

/** Commits por dia local (repositórios ignorados ficam de fora). */
export async function getCommitCounts(from: Day, to: Day): Promise<Map<Day, number>> {
  if (DEMO) return new Map([...demoCommitCounts()].filter(([d]) => d >= from && d <= to));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("commit_counts", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r) => [r.day, r.commits]));
}
