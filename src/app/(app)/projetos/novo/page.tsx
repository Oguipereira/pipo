import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { getRepos } from "@/lib/data/github";
import { getCategories } from "@/lib/data/habits";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";

export const metadata: Metadata = { title: "novo projeto" };

export default function NewProjectPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/projetos" className="text-[13px] text-faint hover:text-dust">
          ← projetos
        </Link>
        <div className="mt-3">
          <PageHeader path="projetos/novo" />
        </div>
      </div>
      <Suspense fallback={<div className="h-96" aria-busy />}>
        <NewProject />
      </Suspense>
    </div>
  );
}

async function NewProject() {
  await getViewer();
  const [categories, repos] = await Promise.all([getCategories(), getRepos()]);
  return <ProjectForm categories={categories} repos={repos} />;
}
