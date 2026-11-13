import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { today as todayIn } from "@/lib/dates";
import { getCategories } from "@/lib/data/habits";
import { HabitForm } from "@/components/habit-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "novo hábito" };

export default function NewHabitPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/habitos" className="text-[13px] text-faint hover:text-dust">
          ← hábitos
        </Link>
        <div className="mt-3">
          <PageHeader path="hábitos/novo" />
        </div>
      </div>
      <Suspense fallback={<div className="h-96" aria-busy />}>
        <NewHabit />
      </Suspense>
    </div>
  );
}

async function NewHabit() {
  const viewer = await getViewer();
  const categories = await getCategories();
  return <HabitForm categories={categories} today={todayIn(viewer.timezone)} />;
}
