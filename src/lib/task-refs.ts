/**
 * Referências a tarefas em mensagens de commit: `#T12` → tarefa 12 (docs/SPEC.md §4.5).
 *
 * - Não diferencia maiúsculas: `#t12` também vale.
 * - Pode haver várias no mesmo commit; duplicadas contam uma vez.
 * - Não casa no meio de palavras nem de outros números:
 *   `abc#T12`, `#T12a` e `#T012x` não contam; `(#T12)`, `#T12,` e `fix #T12.` contam.
 * - Zeros à esquerda são ignorados: `#T007` = tarefa 7. `#T0` não é válido.
 */
const REF = /(?<![\p{L}\p{N}_])#t(\d{1,7})(?![\p{L}\p{N}_])/giu;

export function parseTaskRefs(message: string): number[] {
  const found = new Set<number>();
  for (const match of message.matchAll(REF)) {
    const n = Number.parseInt(match[1], 10);
    if (n > 0) found.add(n);
  }
  return [...found].sort((a, b) => a - b);
}

export function formatTaskRef(number: number): string {
  return `#T${number}`;
}
