# pipo

Hábitos, código e projetos de um dev, na estética do gráfico de contribuições do GitHub. Um quadradinho por dia.

> Em construção, por fases. A especificação completa está em [`docs/SPEC.md`](docs/SPEC.md). O README final, com prints e decisões de arquitetura, chega na fase 8.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · Vitest · Vercel

## Rodando localmente

Requisitos: Node 22+.

```bash
npm install
cp .env.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Abra http://localhost:3000. O login é com GitHub e só contas na allowlist entram (veja abaixo).

### Banco

As migrations ficam em `supabase/migrations`. Com a Supabase CLI:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push        # aplica as migrations no projeto remoto
npm run db:types            # regenera src/lib/supabase/database.types.ts
```

Para um banco local (Docker): `npx supabase start`. O login com GitHub local precisa de um OAuth App de desenvolvimento; veja `supabase/config.toml`.

### Login com GitHub

1. Crie um OAuth App em GitHub → Settings → Developer settings → OAuth Apps, com callback `https://<project-ref>.supabase.co/auth/v1/callback`.
2. No Supabase: Authentication → Sign In / Providers → GitHub, cole o Client ID e o Client Secret.
3. Em Authentication → URL Configuration, use `http://localhost:3000` como Site URL e adicione `http://localhost:3000/auth/callback` (e a URL de produção) em Redirect URLs.

Quem pode entrar fica em `private.allowed_github_ids`. Um trigger em `auth.users` recusa qualquer outra conta.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run check` | lint + typecheck + testes |
| `npm test` | testes (Vitest) |
| `npm run build` | build de produção |
| `npm run db:types` | regenera os tipos do banco |

## Fases

- [x] 1. Fundação: tema, layout, login GitHub com allowlist, perfis e categorias
- [ ] 2. Hábitos
- [ ] 3. GitHub: sincronização, contribuições e commits
- [ ] 4. Linguagens e bibliotecas
- [ ] 5. Projetos e plano de execução
- [ ] 6. Agenda de estudos
- [ ] 7. Relatório mensal
- [ ] 8. Tela inicial do iPhone, polimento, README e deploy
