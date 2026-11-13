import { PageHeader } from "./page-header";

/** Página provisória de uma seção que chega numa fase futura (docs/SPEC.md §9). */
export function ComingSoon({ path, phase, items }: { path: string; phase: number; items: string[] }) {
  return (
    <div className="space-y-8">
      <PageHeader path={path} />
      <div className="max-w-prose space-y-4">
        <p className="text-[15px] leading-relaxed text-dust">
          Esta seção chega na <span className="text-chalk">fase {phase}</span>. O que vai ter aqui:
        </p>
        <ul className="space-y-2 text-[14px] text-dust">
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden className="mt-[7px] block size-1.5 shrink-0 rounded-[1px] bg-heat-2" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
