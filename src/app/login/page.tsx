import type { Metadata } from "next";
import { Suspense } from "react";
import { buildGrid, levelFromCount } from "@/lib/heatmap";
import { sampleContributions } from "@/lib/sample";
import { Heatmap } from "@/components/heatmap";
import { signInWithGitHub } from "./actions";

export const metadata: Metadata = { title: "entrar" };

// Data fixa: a tela de login é estática e o heatmap é só ilustração.
const DEMO_END = "2026-11-12";

const ERRORS: Record<string, string> = {
  denied: "Esta conta do GitHub não tem acesso ao pipo.",
  oauth: "O GitHub não completou o login. Tente de novo.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  const demo = sampleContributions(DEMO_END, 182, 3);
  const max = Math.max(...demo.values());
  const grid = buildGrid(DEMO_END, (day) => ({ level: levelFromCount(demo.get(day) ?? 0, max) }), 26);

  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="opacity-70" aria-hidden>
          <Heatmap grid={grid} label="" sweep cell={10} />
        </div>

        <h1 className="mt-10 font-mono text-[40px] leading-none font-semibold tracking-tight">
          pipo
          <span aria-hidden className="ml-2 inline-block size-[0.45em] rounded-[3px] bg-heat-4" />
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-dust">
          Hábitos, código e projetos. Um quadradinho por dia.
        </p>

        <form action={signInWithGitHub} className="mt-10">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-[3px] bg-chalk font-medium text-ink hover:bg-white active:translate-y-px"
          >
            <GitHubMark />
            Entrar com GitHub
          </button>
        </form>

        <Suspense>
          <LoginError searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  if (!message) return null;
  return (
    <p role="alert" className="mt-4 text-[14px] text-alert">
      {message}
    </p>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
