import Link from "next/link";

export default function NotFound() {
  return (
    <main className="pt-safe flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <p className="font-mono text-[40px] leading-none text-chalk">
          404
          <span aria-hidden className="ml-2 inline-block size-[0.45em] rounded-[3px] bg-heat-0" />
        </p>
        <p className="mt-4 text-[15px] text-dust">Esta página não existe ou foi apagada.</p>
        <Link href="/" className="mt-8 inline-block text-[15px] text-chalk underline decoration-heat-3 underline-offset-4">
          Voltar para hoje
        </Link>
      </div>
    </main>
  );
}
