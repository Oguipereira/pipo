"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { DEMO } from "@/lib/demo";
import { LIBRARY_CATEGORIES } from "@/lib/libraries";
import { createClient } from "@/lib/supabase/server";

/** Liga/desliga "ignorar" num repositório (some de todas as estatísticas). */
export async function setRepoIgnored(repoId: string, ignored: boolean) {
  await getViewer();
  if (DEMO) return;
  if (!z.string().uuid().safeParse(repoId).success) return;
  const supabase = await createClient();
  await supabase.from("repos").update({ ignored }).eq("id", repoId);
  refresh();
}

const categorySchema = z.object({
  ecosystem: z.enum(["npm", "pypi"]),
  name: z.string().min(1).max(214),
  category: z.enum(LIBRARY_CATEGORIES).nullable(),
});

/** Define (ou volta ao padrão, com null) a categoria de uma biblioteca. */
export async function setLibraryCategory(ecosystem: string, name: string, category: string | null) {
  const viewer = await getViewer();
  if (DEMO) return;
  const parsed = categorySchema.safeParse({ ecosystem, name, category });
  if (!parsed.success) return;
  const supabase = await createClient();
  if (parsed.data.category === null) {
    await supabase.from("library_categories").delete().eq("ecosystem", ecosystem).eq("name", name);
  } else {
    await supabase
      .from("library_categories")
      .upsert(
        { user_id: viewer.id, ecosystem, name, category: parsed.data.category },
        { onConflict: "user_id,ecosystem,name" },
      );
  }
  refresh();
}
