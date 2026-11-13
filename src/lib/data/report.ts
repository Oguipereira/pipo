import "server-only";
import { occurrences } from "../agenda";
import { localDate, type Day } from "../dates";
import { dayCompletion, ratioLookup } from "../habits";
import { buildMonthReport, compareMonths, monthRange, shiftMonth } from "../report";
import { getEvents } from "./agenda";
import { getLanguageShares, getRepoActivity } from "./github";
import { getCommitCounts, getHabits, getLogs } from "./habits";
import { getProjects } from "./projects";

/** Tudo que a página do relatório precisa: o mês, o anterior e a comparação. */
export async function loadMonthReport(month: string, today: Day, timezone: string) {
  const prev = shiftMonth(month, -1);
  const { start, end } = monthRange(month);
  const { start: prevStart, end: prevEnd } = monthRange(prev);

  const [active, archived, commitsByDay, repos, prevRepos, languages, projects, events] = await Promise.all([
    getHabits(),
    getHabits({ archived: true }),
    getCommitCounts(prevStart, end),
    getRepoActivity(start, end),
    getRepoActivity(prevStart, prevEnd),
    getLanguageShares(start, end),
    getProjects(),
    getEvents(),
  ]);
  const habits = [...active, ...archived];
  const logs = await getLogs(
    prevStart,
    end,
    habits.map((h) => h.id),
  );
  const ratio = ratioLookup(logs, commitsByDay);
  const tasksDone = projects.flatMap((p) =>
    p.tasks.filter((t) => t.status === "done" && t.doneAt).map((t) => ({ project: p.name, day: localDate(t.doneAt!, timezone) })),
  );
  const studyDays = occurrences(
    events.filter((e) => e.type === "aula" || e.type === "estudo"),
    prevStart,
    end,
  ).map((o) => o.day);

  const base = { today, habits, ratio, commitsByDay, tasksDone, studyDays };
  const current = buildMonthReport({ ...base, month, repos });
  const previous = buildMonthReport({ ...base, month: prev, repos: prevRepos });

  return {
    current,
    previous,
    comparison: compareMonths(current, previous),
    languages: languages.shares,
    dayCompletion: (day: Day) => dayCompletion(habits, ratio, day),
  };
}
