import { getViewer } from "@/lib/auth";

/** Avatar + sair. Lê a sessão: renderize dentro de <Suspense>. */
export async function UserMenu() {
  const viewer = await getViewer();

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[2px] text-[13px] text-dust hover:text-chalk [&::-webkit-details-marker]:hidden">
        {viewer.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar externo do GitHub, 28px
          <img src={viewer.avatarUrl} alt="" width={28} height={28} className="size-7 rounded-[3px]" />
        ) : (
          <span className="block size-7 rounded-[3px] bg-heat-0" />
        )}
        <span className="hidden font-mono md:inline">{viewer.login ?? "você"}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-48 border border-seam bg-slab p-1 text-[13px] md:left-0 md:right-auto">
        <p className="px-3 py-2 text-dust">
          fuso <span className="text-chalk">{viewer.timezone}</span>
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full px-3 py-2 text-left text-chalk hover:bg-ink">
            Sair
          </button>
        </form>
      </div>
    </details>
  );
}

export function UserMenuFallback() {
  return <span className="block size-7 rounded-[3px] bg-heat-0" aria-hidden />;
}
