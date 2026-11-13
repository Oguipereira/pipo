import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "código" };

export default function CodePage() {
  return (
    <ComingSoon
      path="código"
      phase={3}
      items={[
        "Seu gráfico de contribuições do GitHub, sincronizado a cada 4 horas",
        "Commits com filtro por repositório e período",
        "Linguagens que você mais programa e bibliotecas que mais usa (fase 4)",
      ]}
    />
  );
}
