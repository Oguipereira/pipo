import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "hábitos" };

export default function HabitsPage() {
  return (
    <ComingSoon
      path="hábitos"
      phase={2}
      items={[
        "Hábitos sim/não, com meta (água, páginas, minutos) ou automáticos pelos commits",
        "Agenda por dias da semana, como seg–sex",
        "Check-in de hoje com um toque e edição de dias anteriores",
        "Heatmap e sequência atual/melhor de cada hábito",
      ]}
    />
  );
}
