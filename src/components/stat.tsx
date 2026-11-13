/** Número grande em mono com legenda curta embaixo (referência: painel do LeetCode). */
export function Stat({ value, label, unit }: { value: number | string; label: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <p className="num text-[28px] leading-none font-medium text-chalk md:text-[34px]">
        {value}
        {unit ? <span className="ml-1 text-[14px] font-normal text-dust">{unit}</span> : null}
      </p>
      <p className="mt-1.5 text-[12px] text-dust">{label}</p>
    </div>
  );
}
