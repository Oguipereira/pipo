import "server-only";
import { addDays, today as todayIn, type Day } from "../dates";
import { isActiveOn, ratioLookup, type Habit, type HabitLog, type RatioLookup } from "../habits";
import type { CheckInItem } from "@/components/check-in";
import { getCategories, getCommitCounts, getHabits, getLogs, type Category } from "./habits";

export type HabitBoard = {
  today: Day;
  from: Day;
  habits: Habit[];
  categories: Category[];
  logs: HabitLog[];
  commits: Map<Day, number>;
  ratio: RatioLookup;
};

/** Tudo o que as telas de hábitos precisam, num período que termina hoje (fuso do usuário). */
export async function loadHabitBoard(timezone: string, days = 371): Promise<HabitBoard> {
  const today = todayIn(timezone);
  const from = addDays(today, -(days - 1));
  const [habits, categories, commits] = await Promise.all([
    getHabits(),
    getCategories(),
    getCommitCounts(from, today),
  ]);
  const logs = await getLogs(
    from,
    today,
    habits.map((h) => h.id),
  );
  return { today, from, habits, categories, logs, commits, ratio: ratioLookup(logs, commits) };
}

/** Itens do check-in de um dia: hábitos que valem naquele dia, na ordem do usuário. */
export function checkInItems(board: HabitBoard, day: Day): CheckInItem[] {
  const colorOf = new Map(board.categories.map((c) => [c.id, c.color]));
  const logOf = new Map(board.logs.filter((l) => l.date === day).map((l) => [l.habitId, l]));
  return board.habits
    .filter((h) => isActiveOn(h, day))
    .map((habit) => {
      const log = logOf.get(habit.id);
      return {
        habit,
        value: log?.value ?? 0,
        hasLog: Boolean(log),
        commits: board.commits.get(day) ?? 0,
        color: habit.categoryId ? (colorOf.get(habit.categoryId) ?? null) : null,
      };
    });
}
