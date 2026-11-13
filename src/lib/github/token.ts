import "server-only";

/**
 * De onde vem o token do GitHub de cada usuário (docs/SPEC.md §2).
 *
 * Hoje: um PAT fine-grained somente leitura na env GITHUB_TOKEN (app de um usuário só).
 * SaaS: trocar por um provider de GitHub App (token por usuário com refresh,
 * guardado criptografado). Nada além desta implementação precisa mudar.
 */
export interface GitHubTokenProvider {
  getTokenFor(userId: string): Promise<string | null>;
}

export const envTokenProvider: GitHubTokenProvider = {
  async getTokenFor() {
    return process.env.GITHUB_TOKEN?.trim() || null;
  },
};

export function isGitHubConfigured() {
  return Boolean(process.env.GITHUB_TOKEN?.trim() && process.env.SUPABASE_SECRET_KEY?.trim());
}
