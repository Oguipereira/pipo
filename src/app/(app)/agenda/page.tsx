import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { occurrences, upcomingDeadlines, weekStart, countdown } from "@/lib/agenda";
import { addDays, isDay, today as todayIn, type Day } from "@/lib/dates";
import { getEvents } from "@/lib/data/agenda";
import { fmtShortDay } from "@/lib/format";
import { OccurrenceItem } from "@/components/occurrence";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "agenda" };

export default function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  return (
    <div className="space-y-10">
      <PageHeader path="agenda">
        <Link href="/agenda/novo" className="rounded-[3px] border border-seam px-3 py-1.5 text-[14px] text-chalk hover:border-dust">
          Novo compromisso
        </Link>
      </PageHeader>
      <Suspense fallback={<div className="h-64" aria-busy />}>
        <Agenda searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Agenda({ searchParams }: { searchParams: PageProps<"/agenda">["searchParams"] }) {
  const [viewer, query] = await Promise.all([getViewer(), searchParams]);
  const today = todayIn(viewer.timezone);
  const view = query.ver === "lista" ? "lista" : "semana";
  const anchor = typeof query.semana === "string" && isDay(query.semana) ? query.semana : today;
  const monday = weekStart(anchor);
  const events = await getEvents();
  const deadlines = upcomingDeadlines(events, today, 45);

  return (
    <>
      {deadlines.length ? (
        <section aria-label="Provas e entregas próximas" className="flex flex-wrap gap-x-8 gap-y-3">
          {deadlines.slice(0, 3).map((o) => (
            <Link key={`${o.event.id}-${o.day}`} href={`/agenda/${o.event.id}?dia=${o.day}`} className="group">
              <span className="num block text-[26px] leading-none text-chalk">{countdown(o.day, today)}</span>
              <span className="mt-1 block text-[13px] text-dust group-hover:text-chalk">{o.event.title}</span>
            </Link>
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 text-[13px]">
        <nav aria-label="Visão" className="flex gap-4">
          <Link href="/agenda" className={view === "semana" ? "text-chalk" : "text-faint hover:text-dust"}>
            semana
          </Link>
          <Link href="/agenda?ver=lista" className={view === "lista" ? "text-chalk" : "text-faint hover:text-dust"}>
            próximos 30 dias
          </Link>
        </nav>
        {view === "semana" ? (
          <nav aria-label="Navegar semanas" className="flex items-center gap-4">
            <Link href={`/agenda?semana=${addDays(monday, -7)}`} className="text-faint hover:text-chalk" aria-label="Semana anterior">
              ←
            </Link>
            <span className="num text-dust">
              {fmtShortDay(monday)} a {fmtShortDay(addDays(monday, 6))}
            </span>
            <Link href={`/agenda?semana=${addDays(monday, 7)}`} className="text-faint hover:text-chalk" aria-label="Próxima semana">
              →
            </Link>
            {monday !== weekStart(today) ? (
              <Link href="/agenda" className="text-faint hover:text-chalk">
                hoje
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>

      {events.length === 0 ? (
        <p className="max-w-prose text-[15px] leading-relaxed text-dust">
          Coloque aqui aulas, horários de estudo, provas e entregas. Compromissos da semana podem se repetir nos dias que
          você escolher. <Link href="/agenda/novo" className="text-chalk underline decoration-heat-3 underline-offset-4">Criar o primeiro</Link>
        </p>
      ) : view === "semana" ? (
        <Week monday={monday} today={today} events={events} />
      ) : (
        <List today={today} events={events} />
      )}
    </>
  );
}

function Week({ monday, today, events }: { monday: Day; today: Day; events: Awaited<ReturnType<typeof getEvents>> }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const all = occurrences(events, monday, addDays(monday, 6));
  return (
    <div className="grid gap-x-3 gap-y-6 md:grid-cols-7">
      {days.map((day) => {
        const list = all.filter((o) => o.day === day);
        const isToday = day === today;
        return (
          <section key={day} aria-label={fmtShortDay(day)} className="min-w-0">
            <h2 className={`mb-1 flex items-center gap-2 border-b pb-1.5 text-[13px] ${isToday ? "border-heat-3 text-chalk" : "border-seam/60 text-faint"}`}>
              {fmtShortDay(day)}
              {isToday ? <span aria-hidden className="block size-1.5 rounded-[1px] bg-heat-4" /> : null}
            </h2>
            {list.length ? (
              <ul>
                {list.map((o) => (
                  <li key={`${o.event.id}-${o.day}`}>
                    <OccurrenceItem occurrence={o} today={today} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-[12px] text-faint/70 md:hidden">livre</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function List({ today, events }: { today: Day; events: Awaited<ReturnType<typeof getEvents>> }) {
  const all = occurrences(events, today, addDays(today, 29));
  if (all.length === 0) return <p className="text-[15px] text-dust">Nada nos próximos 30 dias.</p>;
  const byDay = new Map<Day, typeof all>();
  for (const o of all) byDay.set(o.day, [...(byDay.get(o.day) ?? []), o]);
  return (
    <div className="max-w-lg space-y-6">
      {[...byDay].map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-1 text-[13px] text-faint">{day === today ? "hoje" : day === addDays(today, 1) ? "amanhã" : fmtShortDay(day)}</h2>
          <ul>
            {list.map((o) => (
              <li key={`${o.event.id}-${o.day}`}>
                <OccurrenceItem occurrence={o} today={today} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
