import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "projetos" };

export default function ProjectsPage() {
  return (
    <ComingSoon
      path="projetos"
      phase={5}
      items={[
        "Projetos ligados aos seus repositórios, com frequência de commits",
        "Plano de execução com marcos e tarefas",
        "Commit com #T12 aparece na tarefa 12 e conclui tarefas de programação",
      ]}
    />
  );
}
