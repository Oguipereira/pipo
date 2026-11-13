type PageHeaderProps = {
  /** Caminho exibido como no terminal, ex.: "hábitos" → "~/hábitos". */
  path?: string;
  children?: React.ReactNode;
};

/** Cabeçalho de página no formato de um prompt: `~/hábitos ■`. */
export function PageHeader({ path, children }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4">
      <h1 className="font-mono text-[22px] leading-none font-medium tracking-tight text-chalk md:text-[26px]">
        <span className="text-faint">~/</span>
        {path ?? ""}
        <span aria-hidden className="ml-1.5 inline-block size-[0.55em] rounded-[2px] bg-heat-4 align-baseline" />
      </h1>
      {children}
    </header>
  );
}

/** Título de seção: minúsculo, mono, sem rótulos decorativos. */
export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-mono text-[13px] text-dust">{children}</h2>
      {aside}
    </div>
  );
}
