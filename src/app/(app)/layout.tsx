import { Suspense } from "react";
import Link from "next/link";
import { Nav, NavFallback } from "@/components/nav";
import { UserMenu, UserMenuFallback } from "@/components/user-menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl md:gap-10 md:px-8">
      <aside className="hidden w-40 shrink-0 flex-col gap-8 py-8 md:flex">
        <Link href="/" className="font-mono text-[15px] font-semibold tracking-tight text-chalk">
          pipo
        </Link>
        <Suspense fallback={<NavFallback />}>
          <Nav />
        </Suspense>
        <div className="mt-auto">
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="pt-safe flex items-center justify-between px-5 md:hidden">
          <Link href="/" className="font-mono text-[15px] font-semibold tracking-tight text-chalk">
            pipo
          </Link>
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </div>
        <main className="px-5 pt-6 pb-28 md:px-0 md:pt-8 md:pb-12">{children}</main>
      </div>

      <div className="md:hidden">
        <Suspense fallback={<NavFallback />}>
          <Nav />
        </Suspense>
      </div>
    </div>
  );
}
