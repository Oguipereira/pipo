import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "agenda" };

export default function AgendaPage() {
  return (
    <ComingSoon
      path="agenda"
      phase={6}
      items={[
        "Aulas, estudos, provas e entregas num cronograma semanal",
        "Compromissos que se repetem nos dias da semana que você escolher",
        "Contagem regressiva para provas e entregas",
      ]}
    />
  );
}
