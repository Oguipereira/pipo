"use client";

import { useTransition } from "react";
import { setLibraryCategory } from "@/app/(app)/codigo/actions";
import { LIBRARY_CATEGORIES } from "@/lib/libraries";

/** Troca a categoria de uma biblioteca; "padrão" volta para a categoria automática. */
export function LibraryCategorySelect({
  ecosystem,
  name,
  value,
  custom,
}: {
  ecosystem: string;
  name: string;
  value: string;
  custom: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={`Categoria de ${name}`}
      value={custom ? value : ""}
      disabled={pending}
      onChange={(e) => start(() => setLibraryCategory(ecosystem, name, e.target.value || null))}
      className="max-w-32 cursor-pointer appearance-none bg-transparent text-right text-[12px] text-faint hover:text-dust focus:text-chalk"
    >
      <option value="">{custom ? "padrão" : value}</option>
      {LIBRARY_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
