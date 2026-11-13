import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { today } from "@/lib/dates";

/** /relatorio → relatório do mês atual (no fuso do usuário). */
export default function ReportIndex() {
  return (
    <Suspense>
      <ToCurrentMonth />
    </Suspense>
  );
}

async function ToCurrentMonth(): Promise<null> {
  const viewer = await getViewer();
  redirect(`/relatorio/${today(viewer.timezone).slice(0, 7)}`);
}
