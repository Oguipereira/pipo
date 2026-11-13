import Link from "next/link";
import { countdown, timeLabel, typeInfo, type Occurrence } from "@/lib/agenda";

/** Um compromisso num dia: barra de cor do tipo, horário, título e local. */
export function OccurrenceItem({ occurrence, today, compact = false }: { occurrence: Occurrence; today: string; compact?: boolean }) {
  const { event, day } = occurrence;
  const info = typeInfo(event.type);
  const deadline = event.type === "prova" || event.type === "entrega";
  return (
    <Link
      href={`/agenda/${event.id}?dia=${day}`}
      className="group flex gap-3 rounded-[3px] py-2 pr-2 hover:bg-slab"
    >
      <span aria-hidden className="w-[3px] shrink-0 rounded-full" style={{ background: info.color }} />
      <span className="min-w-0 flex-1">
        <span className="num block text-[12px] text-faint">
          {timeLabel(event)}
          {deadline && day >= today ? <span className="ml-2 text-alert/90">{countdown(day, today)}</span> : null}
        </span>
        <span className="block truncate text-[14px] text-chalk">{event.title}</span>
        {!compact && event.location ? <span className="block truncate text-[12px] text-faint">{event.location}</span> : null}
      </span>
      {!compact ? <span className="shrink-0 self-start pt-0.5 text-[11px] text-faint">{info.label.toLowerCase()}</span> : null}
    </Link>
  );
}
