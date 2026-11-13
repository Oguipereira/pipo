import "server-only";

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/**
 * Busca todas as linhas de uma consulta paginando de 1000 em 1000
 * (limite padrão de linhas por resposta da Data API do Supabase).
 */
export async function fetchAll<T>(page: (from: number, to: number) => Page<T>, size = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}
