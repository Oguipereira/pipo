import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { isDay, today as todayIn } from "@/lib/dates";
import { getProjects } from "@/lib/data/projects";
import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "novo compromisso" };

export default function NewEventPage({ searchParams }: PageProps<"/agenda/novo">) {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/agenda" className="text-[13px] text-faint hover:text-dust">
          ← agenda
        </Link>
        <div className="mt-3">
          <PageHeader path="agenda/novo" />
        </div>
      </div>
      <Suspense fallback={<div className="h-96" aria-busy />}>
        <NewEvent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewEvent({ searchParams }: { searchParams: PageProps<"/agenda/novo">["searchParams"] }) {
  const [viewer, query, projects] = await Promise.all([getViewer(), searchParams, getProjects()]);
  const date = typeof query.dia === "string" && isDay(query.dia) ? query.dia : todayIn(viewer.timezone);
  return (
    <EventForm
      defaultDate={date}
      projects={projects.filter((p) => p.status !== "done").map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
