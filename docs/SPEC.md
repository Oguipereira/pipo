# pipo — Especificação

> Controle pessoal de hábitos, código e projetos para devs. Um quadradinho por dia.

Status: **aprovada** (2026-11-12) · **implementada** (fases 1–8, 2026-11-13). Este documento é a fonte da verdade do produto; decisões que mudarem durante a implementação são registradas aqui e na seção [Registro de decisões](#registro-de-decisões).

---

## 1. Visão

O pipo junta, na estética do gráfico de contribuições do GitHub, três coisas que hoje vivem separadas:

1. **Atividade de código** — contribuições, commits, linguagens e bibliotecas, puxadas do GitHub.
2. **Hábitos** — rotina diária/semanal (água, academia, leitura, estudo), com check-in rápido no celular.
3. **Projetos e estudos** — plano de execução por projeto e uma agenda de estudos/compromissos.

Princípios:

- **Um quadradinho por dia** é a unidade visual de tudo.
- **Mobile-first**: uso principal no iPhone, como página web adicionada à tela inicial (não é app nativo).
- **Sem LLM, sem notificações, sem e-mail.** Tudo é determinístico e sob demanda.
- **Uso pessoal hoje, pronto para SaaS amanhã**: o modelo é multi-tenant desde a primeira migration, mas só o dono consegue entrar.

### Fora de escopo (por enquanto)

LLM, notificações, múltiplos usuários abertos, app nativo, cobrança. Ideia futura opcional: gerar uma imagem de papel de parede com os heatmaps.

---

## 2. Usuários e acesso

- **Login com GitHub** (Supabase Auth, provider GitHub, escopo mínimo — só identidade).
- **Allowlist**: um trigger no banco recusa a criação de qualquer usuário cujo GitHub ID não esteja em `private.allowed_github_ids`. Hoje a lista contém apenas o dono (`251160849` / `Oguipereira`). Abrir para SaaS = remover o trigger.
- Toda tabela de domínio tem `user_id` e **RLS** (`user_id = auth.uid()`).
- Cada usuário tem **fuso horário** próprio em `profiles.timezone` (padrão `America/Sao_Paulo`).

### Token de dados do GitHub

- Login e acesso a dados são separados. O login não pede escopo de repositório.
- A sincronização usa um **PAT fine-grained somente leitura** guardado em variável de ambiente do servidor (`GITHUB_TOKEN`). Nunca vai para o front-end.
- Todo acesso ao token passa por uma interface `GitHubTokenProvider` (`getTokenFor(userId)`). Hoje a implementação lê a env; no SaaS ela é trocada por **GitHub App** (permissões finas read-only, token por usuário com refresh, guardado criptografado). Nenhum outro código muda.
- Permissões do PAT: *Metadata: read*, *Contents: read* em todos os repositórios do dono (inclui privados). Contribuições do perfil vêm do GraphQL `viewer`.

---

## 3. Regra de ouro: "o dia"

- O dia de qualquer evento é a **data local no fuso do usuário**, nunca a data UTC.
- Toda linha que representa algo datado guarda o instante (`timestamptz`) **e** a data local (`date`), calculada no momento da escrita com o fuso do perfil.
- Exemplo: commit em `2026-03-10T23:30-03:00` (= `2026-03-11T02:30Z`) pertence a **2026-03-10**.
- Se o usuário mudar de fuso, um job recalcula as datas locais.
- A biblioteca de datas é `date-fns` + `@date-fns/tz`. Toda conversão passa por `src/lib/dates.ts` (testado).

### Heatmap do GitHub × commits próprios

O gráfico de contribuições do GitHub conta commits, PRs, issues e reviews e fecha os dias pela regra dele. O pipo:

- mostra o **heatmap de contribuições exatamente como o GitHub devolve** (`contribution_days`);
- calcula **todo o resto** (relatório, projetos, linguagens, hábito automático) a partir da tabela `commits`, no fuso do usuário.

Nas bordas os dois podem divergir em um quadradinho; isso é esperado e está documentado na interface.

---

## 4. Funcionalidades

### 4.1 Categorias

Conjunto pequeno, por usuário, editável. Seed padrão:

| Categoria | `is_code` | Uso |
|---|---|---|
| Programação | **sim** | estudo/prática de código; ligada ao GitHub |
| Estudos | não | estudo geral (faculdade, idiomas, cursos) |
| Saúde | não | água, academia, sono |
| Pessoal | não | leitura, outros |

`is_code = true` é o que liga uma categoria ao GitHub: hábitos automáticos e fechamento de tarefas por commit só valem nessas categorias.

### 4.2 Hábitos

- CRUD, arquivar (não apaga histórico), reordenar (arrastar no desktop, setas no celular).
- **Tipos**:
  - `boolean` — sim/não (academia).
  - `quantity` — meta + unidade (água 8 copos, leitura 20 páginas, estudo 60 min).
  - `github` — **automático**: marcado como cumprido no dia em que existe **≥ 1 commit** do usuário (dia local). Só em categoria `is_code`. Não aceita check-in manual (pode ser sobrescrito manualmente em caso de erro, marcando `source = 'manual'`).
- **Agenda do hábito**: dias da semana em que ele vale (`schedule_days`, bitmask seg→dom). Padrões rápidos: *todos os dias*, *seg–sex*, *fim de semana*, personalizado.
  - Dias fora da agenda **não contam** para %, nem quebram streak; aparecem neutros no heatmap.
- **Check-in de hoje**: lista dos hábitos agendados para hoje. Um toque marca `boolean`; `quantity` tem `+1`/`−1` e toque longo para digitar o valor. Meta batida = quadradinho cheio.
- **Dias anteriores**: tocar num quadradinho do heatmap abre o editor daquele dia.
- **Meta histórica**: cada `habit_log` guarda `target_snapshot`. Mudar a meta não reescreve o passado.
- **Cumprimento do dia** (`ratio`):
  - `boolean`: 0 ou 1.
  - `quantity`: `min(value / target_snapshot, 1)` para %, mas o valor bruto é preservado.
  - `github`: 0 ou 1.
- **Heatmap por hábito**: 5 níveis — `0` (nada), `1` (1–33%), `2` (34–66%), `3` (67–99%), `4` (≥100%). Dia fora da agenda = nível neutro.
- **Streak**: dias **agendados** consecutivos com `ratio = 1`. O dia de hoje, se ainda não cumprido, **não quebra** a sequência até acabar. Guardamos atual e melhor.

### 4.3 Atividade no GitHub

- **Sincronização** para um cache próprio no Postgres, nunca chamando o GitHub a cada página.
  - Botão "sincronizar agora" (com trava: no máximo 1 sync em andamento por usuário).
  - Automática a cada 4h via **Supabase `pg_cron` + `pg_net`** chamando `POST /api/sync` com `CRON_SECRET`. (O cron da Vercel no plano Hobby só roda 1×/dia, por isso não é usado.)
  - **Incremental**: cada repositório guarda `last_synced_at`/cursor; só busca o que mudou desde então.
  - **Rate limit**: lê os headers/`rateLimit` do GraphQL, para antes de ficar abaixo de uma reserva (ex.: 500 pontos) e retoma na próxima execução. Cada execução é registrada em `sync_runs`.
  - **Backfill inicial**: 1 ano.
- **Contribuições**: GraphQL `viewer.contributionsCollection.contributionCalendar` → `contribution_days`.
- **Repositórios**: todos os que o usuário acessa (pessoais, privados, organizações). Cada um pode ser marcado como **ignorado** (forks, dotfiles) — some de todas as estatísticas.
- **Commits**: histórico do branch padrão de cada repositório, filtrado pelo autor (`history(author: {id})`). Commits que só existem em branches não mesclados não aparecem. Lista com filtros por repositório e período; cada item mostra repositório, mensagem, data local e link.

### 4.4 Linguagens e bibliotecas

**Linguagens** — "o que eu programo de verdade":

- Para cada commit, buscar os arquivos alterados (REST `GET /repos/{o}/{r}/commits/{sha}`) e guardar as linhas adicionadas/removidas por linguagem em `commit_languages` (agregado por commit, em vez de um registro por arquivo). Commits são imutáveis: cada um é buscado **uma única vez**.
- Extensão → linguagem por um mapa no estilo do Linguist (`src/lib/languages.ts`), ignorando lockfiles, arquivos gerados e vendor.
- Peso = linhas alteradas (adições + remoções).
- O backfill é feito aos poucos, respeitando o rate limit (5.000 req/h do PAT; custo zero).
- **Reserva**: enquanto um commit ainda não foi detalhado, usa-se a distribuição de bytes do repositório (`repo_languages`, GraphQL `languages`) ponderada pelos commits.
- **Áreas**: cada linguagem pertence a uma área (Front, Back, Dados, DevOps, Mobile, Outros) para agrupar no painel.

**Bibliotecas**:

- Apenas **dependências diretas**, lidas dos manifests no branch padrão: começando por **JS/TS** (`package.json`) e **Python** (`requirements*.txt`, `pyproject.toml`). Outros ecossistemas entram depois por parsers plugáveis.
- Guarda: ecossistema, nome, versão declarada, se é só de desenvolvimento, caminho do manifest (suporta monorepo).
- "Mais usadas" = em quantos repositórios aparece, ponderado pela atividade (commits) de cada repositório no período.
- **Categorias de biblioteca** (Framework, UI, Estado, Dados/ORM, Testes, Build/Tooling, Infra, Outros): mapa curado em código + override manual por usuário em `library_categories`.

**Painéis**: distribuição de linguagens (gráfico radial de "pétalas"), evolução no tempo, top bibliotecas por categoria.

### 4.5 Projetos e plano de execução

- Projetos com nome, descrição, status (ativo, pausado, concluído), cor, categoria e um ou mais repositórios vinculados.
- Por projeto: commits e frequência de commits (heatmap + barras semanais).
- **Plano**: marcos (`milestones`) ordenados, cada um com tarefas ordenadas; tarefa tem status (`todo`, `doing`, `done`), prazo opcional, categoria.
- **Número da tarefa por usuário**: `T1`, `T2`, … (`tasks.number`, único por usuário). Não é o ID do banco — necessário para SaaS.
- **Vínculo commit ↔ tarefa** sem LLM:
  - Padrão: `#T<número>`, sem diferenciar maiúsculas, pode haver vários por commit, não casa no meio de palavras (`abc#T12` não conta). Parser em `src/lib/task-refs.ts` (testado).
  - Todo commit com referência aparece dentro da tarefa (`task_commits`).
  - **Se a tarefa for de categoria `is_code`** (ou, sem categoria própria, se o projeto for), o commit mais antigo que a cita a marca como **feita** (`done_via = 'commit'`). Nas demais categorias, o commit só fica vinculado.
  - Ao criar a tarefa T12, commits antigos que já citavam `#T12` também são vinculados.
  - Se o usuário reabrir manualmente uma tarefa fechada por commit, aquele mesmo commit não a fecha de novo; só um commit novo.

### 4.6 Agenda de estudos (cronograma)

Inspirada no Notion, focada em estudo:

- **Compromissos** (`events`) com título, tipo, início/fim, local/link opcional, notas, categoria, e vínculo opcional a projeto ou tarefa.
- **Tipos** (fixos, pequenos): Aula, Estudo, Prova, Entrega, Reunião, Outro — cada um com ícone/cor.
- **Recorrência semanal** simples: dias da semana + data final opcional (ex.: "Aula de Cálculo seg/qua 19h–21h até 15/12"). Exceções: cancelar uma ocorrência.
- **Visões**: *Hoje* (no dashboard), *Semana* (grade de 7 colunas, rolável no celular) e *Lista* (próximos compromissos).
- Prova/Entrega mostram contagem regressiva ("em 3 dias").

### 4.7 Relatório mensal

Página `/relatorio/2026-11`, montada sob demanda (consulta + agregação em código; nada é enviado):

- % de cumprimento de cada hábito (sobre os dias agendados do mês) e melhor sequência no mês.
- Dias em que **todos** os hábitos agendados foram cumpridos.
- Total de commits, dias com commit, repositório mais ativo, linguagens do mês.
- Tarefas concluídas por projeto; compromissos de estudo realizados.
- Comparação com o mês anterior (delta em cada indicador).
- Gráficos simples, legíveis, em SVG próprio.

### 4.8 Dashboard (tela inicial)

1. Heatmap de contribuições do GitHub + bloco de números (estilo LeetCode: número grande em mono, legenda pequena).
2. Heatmap combinado de hábitos do ano (média do % dos hábitos agendados em cada dia).
3. **Hoje**: check-in dos hábitos + compromissos da agenda.
4. Projetos ativos com a próxima tarefa de cada um.

---

## 5. Estética

- **Dark mode por padrão**, quase de terminal, limpo.
- **Fonte monoespaçada** (JetBrains Mono) em números e títulos; Geist Sans no texto corrido.
- **Os quadradinhos verdes são a identidade**: paleta escura do GitHub (`#161b22` → `#0e4429` → `#006d32` → `#26a641` → `#39d353`).
- Números grandes com legendas pequenas (referência: painel do LeetCode).
- Gráfico radial de "pétalas" para distribuições (referência enviada pelo usuário).
- Gráficos em **SVG próprio**, sem biblioteca de gráficos — para não parecer template.
- Navegação inferior fixa no celular (polegar), barra lateral no desktop.

### Instalação no iPhone

Não é um app nativo nem um PWA completo: é a página web **adicionada à tela inicial**. Para isso:

- `manifest.webmanifest` com nome, ícones, `display: standalone`, cores do tema.
- `apple-touch-icon`, `apple-mobile-web-app-capable`, barra de status `black-translucent`, respeito às *safe areas*.
- Sem modo offline nem service worker na v1 (pode entrar depois se fizer falta).

---

## 6. Arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| App | **Next.js 16** (App Router) + **TypeScript** | Server Components buscam do banco sem API extra; route handlers para sync e cron |
| Estilo | **Tailwind CSS 4** com tokens próprios | Rápido, sem kit de componentes genérico |
| Banco/Auth | **Supabase** (Postgres + Auth + RLS + pg_cron) | Login GitHub pronto; RLS dá isolamento por usuário para o SaaS |
| Migrations | **Supabase CLI**, versionadas em `supabase/migrations` | Reprodutível, revisável |
| Deploy | **Vercel** | Integração natural com Next.js |
| Agendamento | **pg_cron + pg_net** → `/api/sync` | Cron da Vercel Hobby é limitado a 1×/dia |
| Testes | **Vitest** | Rápido, TS nativo |
| Datas | **date-fns** + **@date-fns/tz** | Conversão de fuso confiável e testável |

Por que não algo mais simples (SQLite + senha)? Atenderia o uso pessoal, mas o objetivo de abrir para outros devs torna Auth + RLS + Postgres a base certa desde já.

### Estrutura de pastas

```
src/
  app/                 rotas (App Router)
  components/          UI (heatmap, radial, nav…)
  lib/                 lógica pura e testada (dates, streak, levels, task-refs, languages, report)
  lib/github/          cliente GraphQL/REST, sync, GitHubTokenProvider
  lib/supabase/        clientes server/browser/admin
supabase/
  migrations/          SQL versionado
  seed.sql             dados de exemplo
docs/
  SPEC.md
```

### Variáveis de ambiente

| Variável | Onde | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | público | chave publicável (RLS protege os dados) |
| `SUPABASE_SECRET_KEY` | servidor | sync e cron (ignora RLS, uso restrito) |
| `GITHUB_TOKEN` | servidor | PAT fine-grained read-only |
| `CRON_SECRET` | servidor | opcional; o segredo do pg_cron fica no Vault |

---

## 7. Modelo de dados

Todas as tabelas de domínio: `id uuid`, `user_id uuid → auth.users`, `created_at`, `updated_at`, RLS por `user_id`.

| Tabela | Campos principais |
|---|---|
| `profiles` | `id` (= auth user), `github_id`, `github_login`, `avatar_url`, `timezone` |
| `categories` | `name`, `color`, `is_code`, `position` |
| `habits` | `name`, `category_id`, `kind` (`boolean`/`quantity`/`github`), `target`, `unit`, `schedule_days` (smallint bitmask), `position`, `archived_at` |
| `habit_logs` | `habit_id`, `date`, `value`, `target_snapshot`, `source` (`manual`/`github`) — único (`habit_id`, `date`) |
| `repos` | `github_id`, `full_name`, `default_branch`, `is_private`, `is_fork`, `ignored`, `pushed_at`, `last_synced_at` |
| `repo_languages` | `repo_id`, `language`, `bytes` |
| `commits` | `repo_id`, `sha`, `message`, `committed_at`, `local_date`, `url`, `additions`, `deletions`, `files_fetched` |
| `commit_languages` | `commit_id`, `language`, `files`, `additions`, `deletions` |
| `dependencies` | `repo_id`, `ecosystem`, `name`, `version`, `is_dev`, `manifest_path` |
| `library_categories` | `ecosystem`, `name`, `category` (override do usuário) |
| `contribution_days` | `date`, `count`, `level` — único (`user_id`, `date`) |
| `projects` | `name`, `description`, `status`, `color`, `category_id` |
| `project_repos` | `project_id`, `repo_id` |
| `milestones` | `project_id`, `title`, `position`, `due_date` |
| `tasks` | `project_id`, `milestone_id`, `number` (único por usuário), `title`, `status`, `due_date`, `position`, `category_id`, `done_at`, `done_via` |
| `task_commits` | `task_id`, `commit_id` |
| `events` | `title`, `type`, `date`, `start_time`, `end_time` (horário de parede), `recurrence_days`, `recurrence_until`, `category_id`, `project_id`, `task_id`, `notes`, `location` |
| `event_exceptions` | `event_id`, `date` (ocorrência cancelada) |
| `sync_runs` | `started_at`, `finished_at`, `status`, `trigger` (`manual`/`cron`), `stats` (jsonb), `rate_limit_remaining`, `error` |

Esquema `private` (sem acesso pela API): `allowed_github_ids` e funções internas (triggers, `own_table`, `trigger_github_sync`).

Todas as FKs entre tabelas de domínio são compostas `(id, user_id)`: o banco garante que nada aponta para dados de outro usuário. Tabelas de cache do GitHub são somente leitura para o usuário; quem grava é a sincronização (chave secreta, sempre filtrando por `user_id`).

Funções SQL (`security invoker`, respeitam RLS): `commit_counts`, `repo_commit_counts`, `language_stats`, `language_monthly`, `library_usage`, `project_commit_counts`, `project_activity`.

---

## 8. Qualidade

- **Testes (Vitest)** para a lógica que importa: datas/fuso, níveis do heatmap, streak (com agenda semanal), % de cumprimento, agregação do relatório, parser `#T12`, mapeamento de linguagens, parsers de manifest.
- **CI** (GitHub Actions): lint, typecheck, testes e build em todo push/PR.
- **Advisors do Supabase** checados após cada migration (RLS, índices).
- **Seed** (`supabase/seed.sql`) com hábitos, logs, repositórios, commits, projetos e agenda de exemplo, para ver as telas antes de conectar o GitHub.
- **README** caprichado com prints, como rodar, variáveis de ambiente e decisões de arquitetura (repositório de portfólio).

---

## 9. Fases

Cada fase termina com testes passando e **um commit claro**.

| # | Fase | Entrega |
|---|---|---|
| 1 | **Fundação** | Spec, scaffold, tema e layout, migration base (profiles, categories, allowlist), login GitHub, heatmap com dados de exemplo, CI |
| 2 | **Hábitos** | CRUD, agenda semanal, check-in de hoje, edição de dias anteriores, heatmap por hábito, streaks, seed |
| 3 | **GitHub** | Sync incremental + rate limit, botão e cron, contribuições, repositórios, lista de commits, hábito automático |
| 4 | **Linguagens e bibliotecas** | `commit_files` com backfill gradual, manifests JS/Python, categorias, painéis |
| 5 | **Projetos** | Projetos, marcos, tarefas, frequência de commits, `#T12` e fechamento automático em tarefas de programação |
| 6 | **Agenda** | Compromissos, tipos, recorrência semanal, visões Hoje/Semana/Lista |
| 7 | **Relatório mensal** | Página por mês com comparação |
| 8 | **Fechamento** | Instalação na tela inicial, polimento visual, README com prints, deploy na Vercel |

O dashboard ganha blocos ao longo das fases.

---

## Registro de decisões

| Data | Decisão |
|---|---|
| 2026-11-12 | Multi-tenant (user_id + RLS) desde o início; acesso restrito por allowlist de GitHub ID. |
| 2026-11-12 | Login com GitHub separado do token de dados; PAT em env atrás de `GitHubTokenProvider`, GitHub App no futuro SaaS. |
| 2026-11-12 | Agendamento via pg_cron + pg_net (Vercel Hobby só permite cron diário). |
| 2026-11-12 | Hábitos com agenda por dias da semana; dias fora da agenda não contam nem quebram streak. |
| 2026-11-12 | Categoria com flag `is_code`: hábito automático (≥ 1 commit no dia) e fechamento de tarefa por commit só nessas categorias. |
| 2026-11-12 | Linguagens medidas pelos arquivos alterados em cada commit (linhas), com bytes do repo como reserva. |
| 2026-11-12 | Bibliotecas: dependências diretas de JS/TS e Python primeiro. |
| 2026-11-12 | Instalação como página web na tela inicial do iPhone, sem service worker na v1. |
| 2026-11-12 | Nova fase: agenda de estudos estilo Notion. |
| 2026-11-12 | Gráficos em SVG próprio, sem biblioteca de gráficos. |
| 2026-11-13 | Visual mais sutil: um heatmap por vez (código/hábitos), sem painéis, números em uma linha. |
| 2026-11-13 | FKs compostas `(id, user_id)` em todas as relações entre tabelas de domínio. |
| 2026-11-13 | Sincronização grava com a chave secreta (rota `/api/sync`); cache do GitHub é somente leitura para o usuário. `task_commits` aceita inserção do dono (vínculo retroativo ao criar tarefa). |
| 2026-11-13 | Linguagens agregadas por commit em `commit_languages` (não um registro por arquivo). |
| 2026-11-13 | Hábito automático calculado na leitura a partir de `commits` (sem gravar `habit_logs`); um registro manual corrige o dia. |
| 2026-11-13 | Agenda com data + horário de parede (não `timestamptz`), para recorrências não mudarem com horário de verão. |
| 2026-11-13 | Modo demonstração (`PIPO_DEMO=1`, só em desenvolvimento) para prints e revisão visual sem banco. |
| 2026-11-13 | Segredo do pg_cron gerado e guardado só no Vault, conferido por `verify_cron_secret` (service_role); `CRON_SECRET` na env vira opcional. |
| 2026-11-13 | Relatório em `/relatorio/AAAA-MM`; dados do mês anterior calculados com a mesma função para a comparação. |
