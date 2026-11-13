import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { occursOn, timeLabel, typeInfo } from "@/lib/agenda";
import { isDay, today as todayIn } from "@/lib/dates";
import { getEvent } from "@/lib/data/agenda";
import { getProjects } from "@/lib/data/projects";
import { fmtLongDay } from "@/lib/format";
import { scheduleLabel } from "@/lib/habits";
import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/page-header";
import { deleteEvent, toggleOccurrence } from "../actions";

export const metadata: Metadata = { title: "compromisso" };

export default function EventPage({ params, searchParams }: PageProps<"/agenda/[id]">) {
  return (
    <div className="space-y-8">
      <Link href="/agenda" className="text-[13px] text-faint hover:text-dust">
        ← agenda
      </Link>
      <Suspense fallback={<div className="h-96" aria-busy />}>
        <EventDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EventDetail({ params, searchParams }: PageProps<"/agenda/[id]">) {
  const [{ id }, query, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const event = /^[0-9a-f-]{36}$/i.test(id) ? await getEvent(id) : null;
  if (!event) notFound();
  const projects = await getProjects();
  const info = typeInfo(event.type);
  const day = typeof query.dia === "string" && isDay(query.dia) ? query.dia : null;
  const recurring = event.recurrenceDays != null;
  const cancelled = day ? event.exceptions.includes(day) : false;

  return (
    <>
      <div>
        <PageHeader path={event.title.toLocaleLowerCase("pt-BR")} />
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-dust">
          <span aria-hidden className="block size-2 rounded-full" style={{ background: info.color }} />
          <span>{info.label}</span>
          <span className="num">{timeLabel(event)}</span>
          {recurring ? <span>repete {scheduleLabel(event.recurrenceDays!)}</span> : <span>{fmtLongDay(event.date)}</span>}
        </p>
        {event.location ? <p className="mt-2 text-[14px] text-faint">{event.location}</p> : null}
        {event.notes ? <p className="mt-4 max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-dust">{event.notes}</p> : null}
      </div>

      {recurring && day && (occursOn(event, day) || cancelled) ? (
        <form action={toggleOccurrence.bind(null, event.id, day, !cancelled)} className="text-[14px]">
          <span className="text-dust">{fmtLongDay(day)}: </span>
          <button type="submit" className="text-chalk underline decoration-seam underline-offset-4">
            {cancelled ? "voltar a mostrar este dia" : "cancelar só este dia"}
          </button>
        </form>
      ) : null}

      <details className="max-w-lg">
        <summary className="cursor-pointer text-[14px] text-dust hover:text-chalk">Editar compromisso</summary>
        <div className="mt-6">
          <EventForm
            event={event}
            defaultDate={todayIn(viewer.timezone)}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
      </details>

      <form action={deleteEvent.bind(null, event.id)}>
        <button type="submit" className="text-[13px] text-faint underline decoration-seam underline-offset-4 hover:text-alert">
          Apagar compromisso{recurring ? " (todas as ocorrências)" : ""}
        </button>
      </form>
    </>
  );
}
