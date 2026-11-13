import { describe, expect, it } from "vitest";
import { aggregateFiles, areaOf, isCodeLanguage, languageOf } from "./languages";
import { libraryCategory } from "./libraries";
import { findManifests, normalizePyName, parseManifest, parsePackageJson, parsePyproject, parseRequirements } from "./manifests";

describe("languageOf", () => {
  it.each([
    ["src/app/page.tsx", "TypeScript"],
    ["lib/util.mjs", "JavaScript"],
    ["api/main.py", "Python"],
    ["Dockerfile", "Dockerfile"],
    ["docker/Dockerfile.dev", "Dockerfile"],
    ["supabase/migrations/001.sql", "SQL"],
    ["README.md", "Markdown"],
  ])("%s → %s", (path, lang) => {
    expect(languageOf(path)).toBe(lang);
  });

  it.each([
    "package-lock.json",
    "node_modules/react/index.js",
    "dist/bundle.js",
    "public/logo.png",
    "assets/app.min.js",
    "src/lib/supabase/database.types.ts",
    "LICENSE",
    "poetry.lock",
  ])("ignora %s", (path) => {
    expect(languageOf(path)).toBeNull();
  });
});

describe("aggregateFiles", () => {
  it("soma linhas por linguagem e ignora lockfiles", () => {
    expect(
      aggregateFiles([
        { filename: "a.ts", additions: 10, deletions: 2 },
        { filename: "b.tsx", additions: 5, deletions: 0 },
        { filename: "c.css", additions: 3, deletions: 3 },
        { filename: "package-lock.json", additions: 900, deletions: 900 },
      ]),
    ).toEqual([
      { language: "TypeScript", files: 2, additions: 15, deletions: 2 },
      { language: "CSS", files: 1, additions: 3, deletions: 3 },
    ]);
  });

  it("áreas e o que conta como código", () => {
    expect(areaOf("Python")).toBe("Back-end");
    expect(areaOf("TypeScript")).toBe("Front-end");
    expect(areaOf("Dockerfile")).toBe("DevOps");
    expect(isCodeLanguage("Markdown")).toBe(false);
    expect(isCodeLanguage("Go")).toBe(true);
  });
});

describe("manifests", () => {
  it("findManifests: raiz primeiro, sem node_modules nem exemplos", () => {
    expect(
      findManifests([
        "apps/web/package.json",
        "package.json",
        "node_modules/x/package.json",
        "examples/demo/package.json",
        "api/requirements.txt",
        "api/requirements-dev.txt",
        "a/b/c/d/package.json",
        "src/index.ts",
      ]),
    ).toEqual(["package.json", "api/requirements-dev.txt", "api/requirements.txt", "apps/web/package.json"]);
  });

  it("package.json: dependências e devDependencies", () => {
    const deps = parsePackageJson(
      JSON.stringify({ dependencies: { next: "16.4.6", zod: "^4" }, devDependencies: { vitest: "5.1.0", next: "x" } }),
    );
    expect(deps).toEqual([
      { ecosystem: "npm", name: "next", version: "16.4.6", isDev: false },
      { ecosystem: "npm", name: "zod", version: "^4", isDev: false },
      { ecosystem: "npm", name: "vitest", version: "5.1.0", isDev: true },
    ]);
    expect(parsePackageJson("{ quebrado")).toEqual([]);
  });

  it("requirements.txt", () => {
    const deps = parseRequirements(
      `# comentário
Django>=5.0
fastapi[all]==0.110.0 ; python_version > "3.8"
-r base.txt
git+https://github.com/x/y.git
Pillow
requests # http`,
    );
    expect(deps.map((d) => [d.name, d.version])).toEqual([
      ["django", ">=5.0"],
      ["fastapi", "==0.110.0"],
      ["pillow", null],
      ["requests", null],
    ]);
  });

  it("requirements-dev.txt conta como dev", () => {
    expect(parseManifest("requirements-dev.txt", "pytest")[0].isDev).toBe(true);
  });

  it("pyproject PEP 621", () => {
    const deps = parsePyproject(`
[project]
name = "api"
dependencies = [
  "fastapi>=0.110",  # web
  "SQLAlchemy[asyncio]~=2.0",
]

[project.optional-dependencies]
dev = ["pytest", "ruff"]
`);
    expect(deps).toEqual([
      { ecosystem: "pypi", name: "fastapi", version: ">=0.110", isDev: false },
      { ecosystem: "pypi", name: "sqlalchemy", version: "~=2.0", isDev: false },
      { ecosystem: "pypi", name: "pytest", version: null, isDev: true },
      { ecosystem: "pypi", name: "ruff", version: null, isDev: true },
    ]);
  });

  it("pyproject Poetry", () => {
    const deps = parsePyproject(`
[tool.poetry.dependencies]
python = "^3.12"
django = "^5.0"
celery = { version = "^5.3", extras = ["redis"] }

[tool.poetry.group.dev.dependencies]
pytest = "^8"
`);
    expect(deps).toEqual([
      { ecosystem: "pypi", name: "django", version: "^5.0", isDev: false },
      { ecosystem: "pypi", name: "celery", version: "^5.3", isDev: false },
      { ecosystem: "pypi", name: "pytest", version: "^8", isDev: true },
    ]);
  });

  it("normalizePyName", () => {
    expect(normalizePyName("Scikit_Learn")).toBe("scikit-learn");
  });
});

describe("libraryCategory", () => {
  it("mapa, prefixos e override do usuário", () => {
    expect(libraryCategory("npm", "next")).toBe("Framework");
    expect(libraryCategory("npm", "@radix-ui/react-dialog")).toBe("UI");
    expect(libraryCategory("npm", "@types/node")).toBe("Build e tooling");
    expect(libraryCategory("pypi", "pandas")).toBe("IA e dados");
    expect(libraryCategory("npm", "left-pad")).toBe("Outros");
    expect(libraryCategory("npm", "left-pad", new Map([["npm:left-pad", "UI"]]))).toBe("UI");
  });
});
