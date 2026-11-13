"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { diffDays, isDay, today as todayIn } from "@/lib/dates";
import { DEMO } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const habitSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Dê um nome ao hábito.").max(60, "Até 60 caracteres."),
    categoryId: z.string().uuid().nullable(),
    kind: z.enum(["boolean", "quantity", "github"]),
    target: z.number().positive("A meta precisa ser maior que zero.").max(99999).nullable(),
    unit: z.string().trim().max(20, "Até 20 caracteres.").nullable(),
    scheduleDays: z.number().int().min(1, "Escolha pelo menos um dia.").max(127),
    startDate: z.string().refine(isDay, "Data inválida."),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "quantity" && v.target == null) {
      ctx.addIssue({ code: "custom", path: ["target"], message: "Hábitos com meta precisam de um número." });
    }
  });

function parseHabitForm(formData: FormData) {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const days = formData.getAll("day").map(Number).filter((d) => d >= 0 && d <= 6);
  const kind = str("kind") ?? "boolean";
  const target = str("target");
  return habitSchema.safeParse({
    id: str("id") ?? undefined,
    name: str("name") ?? "",
    categoryId: str("categoryId"),
    kind,
    target: kind === "quantity" && target ? Number(target.replace(",", ".")) : null,
    unit: kind === "quantity" ? str("unit") : null,
    scheduleDays: days.reduce((mask, d) => mask | (1 << d), 0),
    startDate: str("startDate") ?? "",
  });
}

export async function saveHabit(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (DEMO) return { error: "Modo demonstração: nada é salvo." };
  const parsed = parseHabitForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const v = parsed.data;
  if (diffDays(todayIn(viewer.timezone), v.startDate) > 0) {
    return { fieldErrors: { startDate: "O início não pode ser no futuro." } };
  }

  const supabase = await createClient();

  if (v.kind === "github" && v.categoryId) {
    const { data: cat } = await supabase.from("categories").select("is_code").eq("id", v.categoryId).single();
    if (!cat?.is_code) {
      return { fieldErrors: { kind: "Hábitos automáticos só existem em categorias de programação." } };
    }
  }

  const row = {
    name: v.name,
    category_id: v.categoryId,
    kind: v.kind,
    target: v.target,
    unit: v.unit,
    schedule_days: v.scheduleDays,
    start_date: v.startDate,
  };

  let id = v.id;
  if (id) {
    const { error } = await supabase.from("habits").update(row).eq("id", id);
    if (error) return { error: "Não foi possível salvar. Tente de novo." };
  } else {
    const { data: last } = await supabase
      .from("habits")
      .select("position")
      .is("archived_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("habits")
      .insert({ ...row, position: (last?.position ?? -1) + 1 })
      .select("id")
      .single();
    if (error || !data) return { error: "Não foi possível criar o hábito. Tente de novo." };
    id = data.id;
  }

  redirect(`/habitos/${id}`);
}

const valueSchema = z.object({
  habitId: z.string().uuid(),
  day: z.string().refine(isDay),
  value: z.number().min(0).max(99999).nullable(),
});

/**
 * Registra o valor de um hábito num dia (check-in ou edição de dias anteriores).
 * `null` ou 0 apaga o registro. Guarda a meta vigente como target_snapshot.
 */
export async function setHabitValue(habitId: string, day: string, value: number | null) {
  const viewer = await getViewer();
  if (DEMO) return;
  const parsed = valueSchema.safeParse({ habitId, day, value });
  if (!parsed.success) throw new Error("Valor inválido.");
  if (diffDays(todayIn(viewer.timezone), day) > 0) throw new Error("Não dá para marcar dias no futuro.");

  const supabase = await createClient();
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id, kind, target, start_date")
    .eq("id", habitId)
    .single();
  if (habitError || !habit) throw new Error("Hábito não encontrado.");
  if (diffDays(habit.start_date, day) < 0) throw new Error("Esse dia é anterior ao início do hábito.");

  const v = parsed.data.value;
  // Hábito automático: 0 explícito é um registro válido (corrige um commit que não deveria contar).
  const removes = v == null || (v === 0 && habit.kind !== "github");

  if (removes) {
    const { error } = await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("date", day);
    if (error) throw new Error("Não foi possível salvar.");
  } else {
    const { error } = await supabase.from("habit_logs").upsert(
      {
        habit_id: habitId,
        date: day,
        value: v,
        target_snapshot: habit.kind === "quantity" ? habit.target : null,
        source: "manual",
      },
      { onConflict: "habit_id,date" },
    );
    if (error) throw new Error("Não foi possível salvar.");
  }

  refresh();
}

export async function archiveHabit(id: string) {
  await getViewer();
  if (DEMO) return;
  const supabase = await createClient();
  await supabase.from("habits").update({ archived_at: new Date().toISOString() }).eq("id", id);
  redirect("/habitos");
}

export async function restoreHabit(id: string) {
  await getViewer();
  if (DEMO) return;
  const supabase = await createClient();
  await supabase.from("habits").update({ archived_at: null }).eq("id", id);
  refresh();
}

/** Troca a posição com o vizinho de cima (-1) ou de baixo (+1). */
export async function moveHabit(id: string, direction: -1 | 1) {
  await getViewer();
  if (DEMO) return;
  const supabase = await createClient();
  const { data: habits } = await supabase
    .from("habits")
    .select("id, position")
    .is("archived_at", null)
    .order("position")
    .order("created_at");
  if (!habits) return;
  const index = habits.findIndex((h) => h.id === id);
  const other = habits[index + direction];
  if (index < 0 || !other) return;

  // Renumera tudo em sequência para evitar posições repetidas.
  const order = habits.map((h) => h.id);
  [order[index], order[index + direction]] = [order[index + direction], order[index]];
  await Promise.all(
    order.map((habitId, position) =>
      supabase.from("habits").update({ position }).eq("id", habitId),
    ),
  );
  refresh();
}
