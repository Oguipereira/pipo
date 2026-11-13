/**
 * Arquivo → linguagem, no espírito do GitHub Linguist (docs/SPEC.md §4.4).
 * Arquivos gerados, dependências vendorizadas, lockfiles e binários não contam.
 */

const BY_EXTENSION: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", mts: "TypeScript", cts: "TypeScript",
  js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python", pyi: "Python", ipynb: "Jupyter Notebook",
  go: "Go", rs: "Rust", java: "Java", kt: "Kotlin", kts: "Kotlin", scala: "Scala",
  rb: "Ruby", php: "PHP", cs: "C#", fs: "F#", swift: "Swift", m: "Objective-C",
  c: "C", h: "C", cpp: "C++", cc: "C++", cxx: "C++", hpp: "C++", hh: "C++",
  dart: "Dart", ex: "Elixir", exs: "Elixir", erl: "Erlang", clj: "Clojure", hs: "Haskell",
  lua: "Lua", r: "R", jl: "Julia", zig: "Zig", nim: "Nim", sol: "Solidity",
  sql: "SQL", prisma: "Prisma", graphql: "GraphQL", gql: "GraphQL",
  html: "HTML", htm: "HTML", vue: "Vue", svelte: "Svelte", astro: "Astro",
  css: "CSS", scss: "SCSS", sass: "Sass", less: "Less",
  sh: "Shell", bash: "Shell", zsh: "Shell", fish: "Shell", ps1: "PowerShell",
  md: "Markdown", mdx: "MDX",
  json: "JSON", jsonc: "JSON", yml: "YAML", yaml: "YAML", toml: "TOML", xml: "XML",
  tf: "HCL", hcl: "HCL", nix: "Nix",
};

const BY_FILENAME: Record<string, string> = {
  dockerfile: "Dockerfile",
  makefile: "Makefile",
  justfile: "Just",
  "docker-compose.yml": "YAML",
};

const IGNORED_DIRS = /(^|\/)(node_modules|vendor|dist|build|out|\.next|\.nuxt|coverage|\.venv|venv|__pycache__|\.git|target|bower_components)\//i;
const IGNORED_FILES =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|poetry\.lock|Pipfile\.lock|uv\.lock|Cargo\.lock|composer\.lock|Gemfile\.lock|go\.sum)$|\.min\.(js|css)$|\.map$|(^|\/)database\.types\.ts$|\.generated\.\w+$|\.snap$/i;
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|svg|pdf|zip|gz|tar|woff2?|ttf|otf|eot|mp[34]|mov|wav|ogg|psd|exe|dll|so|dylib|bin|lockb)$/i;

/** Linguagem de um caminho, ou null se o arquivo não deve contar. */
export function languageOf(path: string): string | null {
  if (IGNORED_DIRS.test(path) || IGNORED_FILES.test(path) || BINARY.test(path)) return null;
  const name = path.split("/").pop()!.toLowerCase();
  if (BY_FILENAME[name]) return BY_FILENAME[name];
  if (name.startsWith("dockerfile")) return "Dockerfile";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return null;
  return BY_EXTENSION[name.slice(dot + 1)] ?? null;
}

export type LanguageTotals = { language: string; files: number; additions: number; deletions: number };

/** Agrega os arquivos de um commit por linguagem. */
export function aggregateFiles(files: { filename: string; additions: number; deletions: number }[]): LanguageTotals[] {
  const map = new Map<string, LanguageTotals>();
  for (const f of files) {
    const language = languageOf(f.filename);
    if (!language) continue;
    const t = map.get(language) ?? { language, files: 0, additions: 0, deletions: 0 };
    t.files++;
    t.additions += f.additions;
    t.deletions += f.deletions;
    map.set(language, t);
  }
  return [...map.values()].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));
}

/** Linguagens que são "código" (não dados, docs ou config) para o painel principal. */
const NOT_CODE = new Set(["Markdown", "MDX", "JSON", "YAML", "TOML", "XML", "Jupyter Notebook"]);
export const isCodeLanguage = (language: string) => !NOT_CODE.has(language);

export type Area = "Front-end" | "Back-end" | "Dados" | "Mobile" | "DevOps" | "Docs e config";

const AREA: Record<string, Area> = {
  TypeScript: "Front-end", JavaScript: "Front-end", HTML: "Front-end", CSS: "Front-end", SCSS: "Front-end",
  Sass: "Front-end", Less: "Front-end", Vue: "Front-end", Svelte: "Front-end", Astro: "Front-end", MDX: "Docs e config",
  Python: "Back-end", Go: "Back-end", Rust: "Back-end", Java: "Back-end", "C#": "Back-end", "F#": "Back-end",
  Ruby: "Back-end", PHP: "Back-end", Elixir: "Back-end", Erlang: "Back-end", Scala: "Back-end", Clojure: "Back-end",
  Haskell: "Back-end", C: "Back-end", "C++": "Back-end", Zig: "Back-end", Nim: "Back-end", Lua: "Back-end",
  GraphQL: "Back-end", Prisma: "Dados", Solidity: "Back-end",
  SQL: "Dados", R: "Dados", Julia: "Dados", "Jupyter Notebook": "Dados",
  Kotlin: "Mobile", Swift: "Mobile", Dart: "Mobile", "Objective-C": "Mobile",
  Shell: "DevOps", PowerShell: "DevOps", Dockerfile: "DevOps", Makefile: "DevOps", Just: "DevOps", HCL: "DevOps", Nix: "DevOps",
  Markdown: "Docs e config", JSON: "Docs e config", YAML: "Docs e config", TOML: "Docs e config", XML: "Docs e config",
};

export const areaOf = (language: string): Area => AREA[language] ?? "Back-end";

/** Cores do GitHub para as linguagens mais comuns (fallback quando não vieram da API). */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8", Rust: "#dea584",
  Java: "#b07219", Kotlin: "#A97BFF", Swift: "#F05138", Dart: "#00B4AB", Ruby: "#701516", PHP: "#4F5D95",
  "C#": "#178600", C: "#555555", "C++": "#f34b7d", HTML: "#e34c26", CSS: "#663399", SCSS: "#c6538c",
  Vue: "#41b883", Svelte: "#ff3e00", Shell: "#89e051", SQL: "#e38c00", Dockerfile: "#384d54", Elixir: "#6e4a7e",
  Markdown: "#083fa1", MDX: "#fcb32c", JSON: "#292929", YAML: "#cb171e", Prisma: "#0c344b", Astro: "#ff5a03",
  "Jupyter Notebook": "#DA5B0B", Lua: "#000080", R: "#198CE7", HCL: "#844FBA",
};
