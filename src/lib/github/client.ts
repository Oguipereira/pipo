import "server-only";

const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export type RateLimit = { remaining: number; resetAt: string | null };

/**
 * Cliente mínimo da API do GitHub (GraphQL + REST) que acompanha o rate limit.
 * O orquestrador da sincronização consulta `graphqlRemaining`/`restRemaining`
 * para parar antes de esgotar a cota e retomar na próxima execução.
 */
export class GitHubClient {
  graphqlRemaining = Number.POSITIVE_INFINITY;
  restRemaining = Number.POSITIVE_INFINITY;
  requests = 0;

  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pipo-app",
      ...extra,
    };
  }

  async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    this.requests++;
    const res = await this.fetchImpl(`${API}/graphql`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining != null) this.graphqlRemaining = Number(remaining);

    if (!res.ok) throw new GitHubError(await describe(res), res.status);
    const body = (await res.json()) as { data?: T & { rateLimit?: RateLimit }; errors?: { message: string }[] };
    if (body.errors?.length) throw new GitHubError(body.errors.map((e) => e.message).join("; "));
    if (!body.data) throw new GitHubError("Resposta vazia do GitHub.");
    if (body.data.rateLimit) this.graphqlRemaining = body.data.rateLimit.remaining;
    return body.data;
  }

  /** GET na API REST. `accept` permite pedir o conteúdo cru de arquivos. */
  async rest<T>(path: string, accept = "application/vnd.github+json"): Promise<T | null> {
    this.requests++;
    const res = await this.fetchImpl(`${API}${path}`, {
      headers: this.headers({ Accept: accept }),
      cache: "no-store",
    });
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining != null) this.restRemaining = Number(remaining);
    if (res.status === 404 || res.status === 409) return null; // não existe / repositório vazio
    if (!res.ok) throw new GitHubError(await describe(res), res.status);
    return accept.includes("raw") ? ((await res.text()) as T) : ((await res.json()) as T);
  }
}

async function describe(res: Response) {
  if (res.status === 401) return "Token do GitHub inválido ou expirado.";
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const when = reset ? new Date(Number(reset) * 1000).toISOString() : null;
    return `Limite da API do GitHub atingido${when ? ` (libera em ${when})` : ""}.`;
  }
  const text = await res.text().catch(() => "");
  return `GitHub respondeu ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`;
}
