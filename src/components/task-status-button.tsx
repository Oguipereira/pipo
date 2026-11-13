"use client";

import { useOptimistic, useTransition } from "react";
import { setTaskStatus } from "@/app/(app)/projetos/actions";
import { nextStatus, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/projects";

/** Quadradinho de status: vazio = a fazer, meio = fazendo, cheio = feito. Um toque avança. */
export function TaskStatusButton({ id, status }: { id: string; status: TaskStatus }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [, start] = useTransition();
  const next = nextStatus(optimistic);

  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          setOptimistic(next);
          await setTaskStatus(id, next);
        })
      }
      aria-label={`Status: ${TASK_STATUS_LABEL[optimistic]}. Tocar para marcar como ${TASK_STATUS_LABEL[next]}.`}
      className="grid size-6 shrink-0 place-items-center rounded-[4px]"
    >
      <span
        aria-hidden
        className={`block size-5 rounded-[3px] transition-colors ${
          optimistic === "done"
            ? "bg-heat-4"
            : optimistic === "doing"
              ? "bg-[linear-gradient(135deg,var(--color-heat-2)_50%,var(--color-heat-0)_50%)]"
              : "bg-heat-0 ring-1 ring-inset ring-seam"
        }`}
      />
    </button>
  );
}
