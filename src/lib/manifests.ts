/**
 * Dependências diretas a partir dos manifests (docs/SPEC.md §4.4).
 * JS/TS: package.json. Python: requirements*.txt e pyproject.toml (PEP 621 e Poetry).
 */

export type Ecosystem = "npm" | "pypi";
export type Dependency = { ecosystem: Ecosystem; name: string; version: string | null; isDev: boolean };

const MANIFEST = /(^|\/)(package\.json|pyproject\.toml|requirements[\w.-]*\.txt)$/i;
const SKIP_DIRS = /(^|\/)(node_modules|vendor|dist|build|\.venv|venv|examples?|fixtures?|test-data|\.git)\//i;

/** Manifests relevantes numa árvore de arquivos (raiz e monorepo), no máximo `limit`. */
export function findManifests(paths: string[], limit = 15): string[] {
  return paths
    .filter((p) => MANIFEST.test(p) && !SKIP_DIRS.test(p) && p.split("/").length <= 4)
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))
    .slice(0, limit);
}

export function parseManifest(path: string, text: string): Dependency[] {
  const name = path.split("/").pop()!.toLowerCase();
  if (name === "package.json") return parsePackageJson(text);
  if (name === "pyproject.toml") return parsePyproject(text);
  if (name.startsWith("requirements")) return parseRequirements(text, /dev|test|lint/.test(name));
  return [];
}

export function parsePackageJson(text: string): Dependency[] {
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(text);
  } catch {
    return [];
  }
  const out: Dependency[] = [];
  const take = (field: string, isDev: boolean) => {
    const deps = pkg[field];
    if (!deps || typeof deps !== "object") return;
    for (const [name, version] of Object.entries(deps as Record<string, unknown>)) {
      if (out.some((d) => d.name === name)) continue;
      out.push({ ecosystem: "npm", name, version: typeof version === "string" ? version : null, isDev });
    }
  };
  take("dependencies", false);
  take("peerDependencies", false);
  take("devDependencies", true);
  return out;
}

/** Nome normalizado do PyPI (PEP 503): minúsculas, separadores viram "-". */
export function normalizePyName(name: string): string {
  return name.trim().toLowerCase().replace(/[-_.]+/g, "-");
}

/** "fastapi[all]>=0.110 ; python_version>'3.8'" → { name: "fastapi", version: ">=0.110" } */
function parsePep508(spec: string): { name: string; version: string | null } | null {
  const clean = spec.split(";")[0].split("#")[0].trim();
  const m = clean.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*(.*)$/);
  if (!m) return null;
  const version = m[2].trim().replace(/^\((.*)\)$/, "$1").trim();
  return { name: normalizePyName(m[1]), version: version || null };
}

export function parseRequirements(text: string, isDev = false): Dependency[] {
  const out: Dependency[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("-") || line.includes("://")) continue;
    const dep = parsePep508(line);
    if (dep && !out.some((d) => d.name === dep.name)) out.push({ ecosystem: "pypi", ...dep, isDev });
  }
  return out;
}

/**
 * Leitor de TOML suficiente para pyproject: tabelas `[a.b]`, `chave = "valor"`,
 * `chave = { version = "..." }` e arrays de strings (também em várias linhas).
 */
function readToml(text: string): Map<string, Map<string, unknown>> {
  const tables = new Map<string, Map<string, unknown>>();
  let current = new Map<string, unknown>();
  tables.set("", current);
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = stripComment(lines[i]).trim();
    if (!line) continue;
    const header = line.match(/^\[([^\[\]]+)\]$/);
    if (header) {
      current = new Map();
      tables.set(header[1].trim().replace(/\s*\.\s*/g, ".").replace(/"/g, ""), current);
      continue;
    }
    const kv = line.match(/^("?[^"=]+"?)\s*=\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim().replace(/^"|"$/g, "");
    let value = kv[2].trim();
    if (value.startsWith("[") && !balanced(value)) {
      while (i + 1 < lines.length && !balanced(value)) value += " " + stripComment(lines[++i]).trim();
    }
    current.set(key, parseValue(value));
  }
  return tables;
}

function stripComment(line: string) {
  let inStr: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      if (ch === inStr && line[i - 1] !== "\\") inStr = null;
    } else if (ch === '"' || ch === "'") inStr = ch;
    else if (ch === "#") return line.slice(0, i);
  }
  return line;
}

function balanced(v: string) {
  const open = (v.match(/\[/g) ?? []).length;
  const close = (v.match(/\]/g) ?? []).length;
  return open <= close;
}

function parseValue(v: string): unknown {
  if (v.startsWith("[")) return [...v.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);
  if (v.startsWith("{")) {
    const version = v.match(/version\s*=\s*["']([^"']*)["']/);
    return { version: version?.[1] ?? null };
  }
  return v.replace(/^["']|["']$/g, "");
}

export function parsePyproject(text: string): Dependency[] {
  const toml = readToml(text);
  const out: Dependency[] = [];
  const add = (name: string, version: string | null, isDev: boolean) => {
    const n = normalizePyName(name);
    if (n === "python" || out.some((d) => d.name === n)) return;
    out.push({ ecosystem: "pypi", name: n, version, isDev });
  };

  // PEP 621
  const project = toml.get("project");
  for (const spec of (project?.get("dependencies") as string[] | undefined) ?? []) {
    const d = parsePep508(spec);
    if (d) add(d.name, d.version, false);
  }
  for (const [table, values] of toml) {
    if (table === "project.optional-dependencies" || table === "dependency-groups") {
      for (const [group, specs] of values) {
        for (const spec of (specs as string[]) ?? []) {
          const d = parsePep508(spec);
          if (d) add(d.name, d.version, /dev|test|lint|docs/.test(group));
        }
      }
    }
  }

  // Poetry
  for (const [table, values] of toml) {
    const isMain = table === "tool.poetry.dependencies";
    const isDev = table === "tool.poetry.dev-dependencies" || /^tool\.poetry\.group\.[^.]+\.dependencies$/.test(table);
    if (!isMain && !isDev) continue;
    for (const [name, v] of values) {
      const version = typeof v === "string" ? v : ((v as { version?: string | null })?.version ?? null);
      add(name, version, isDev);
    }
  }
  return out;
}
