import type { Ecosystem } from "./manifests";

/** Categorias de bibliotecas (docs/SPEC.md §4.4). O usuário pode sobrescrever qualquer uma. */
export const LIBRARY_CATEGORIES = [
  "Framework",
  "UI",
  "Estado e dados",
  "Banco e ORM",
  "Validação",
  "Testes",
  "Build e tooling",
  "IA e dados",
  "Infra",
  "Outros",
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

const EXACT: Record<string, LibraryCategory> = {
  // npm
  next: "Framework", react: "Framework", "react-dom": "Framework", vue: "Framework", nuxt: "Framework",
  svelte: "Framework", "@sveltejs/kit": "Framework", astro: "Framework", express: "Framework", fastify: "Framework",
  hono: "Framework", "@nestjs/core": "Framework", "react-native": "Framework", expo: "Framework", remix: "Framework",
  "@remix-run/react": "Framework", solid: "Framework", "solid-js": "Framework", angular: "Framework", "@angular/core": "Framework",
  tailwindcss: "UI", "styled-components": "UI", "@emotion/react": "UI", "framer-motion": "UI", motion: "UI",
  "lucide-react": "UI", "@mui/material": "UI", "@chakra-ui/react": "UI", "class-variance-authority": "UI",
  clsx: "UI", "tailwind-merge": "UI", "@headlessui/react": "UI", recharts: "UI", "chart.js": "UI", d3: "UI",
  zustand: "Estado e dados", redux: "Estado e dados", "@reduxjs/toolkit": "Estado e dados", jotai: "Estado e dados",
  "@tanstack/react-query": "Estado e dados", swr: "Estado e dados", axios: "Estado e dados", "@trpc/server": "Estado e dados",
  "@trpc/client": "Estado e dados", "date-fns": "Estado e dados", dayjs: "Estado e dados", lodash: "Estado e dados",
  prisma: "Banco e ORM", "@prisma/client": "Banco e ORM", "drizzle-orm": "Banco e ORM", "drizzle-kit": "Banco e ORM",
  "@supabase/supabase-js": "Banco e ORM", "@supabase/ssr": "Banco e ORM", supabase: "Banco e ORM", mongoose: "Banco e ORM",
  typeorm: "Banco e ORM", sequelize: "Banco e ORM", pg: "Banco e ORM", mysql2: "Banco e ORM", redis: "Banco e ORM",
  ioredis: "Banco e ORM", firebase: "Banco e ORM", kysely: "Banco e ORM",
  zod: "Validação", yup: "Validação", joi: "Validação", valibot: "Validação", "react-hook-form": "Validação",
  vitest: "Testes", jest: "Testes", "@playwright/test": "Testes", playwright: "Testes", cypress: "Testes", mocha: "Testes",
  typescript: "Build e tooling", eslint: "Build e tooling", prettier: "Build e tooling", vite: "Build e tooling",
  webpack: "Build e tooling", turbo: "Build e tooling", tsx: "Build e tooling", "ts-node": "Build e tooling",
  esbuild: "Build e tooling", rollup: "Build e tooling", husky: "Build e tooling", "lint-staged": "Build e tooling",
  nodemon: "Build e tooling", "@biomejs/biome": "Build e tooling", postcss: "Build e tooling", autoprefixer: "Build e tooling",
  openai: "IA e dados", "@anthropic-ai/sdk": "IA e dados", ai: "IA e dados", langchain: "IA e dados",
  "@langchain/core": "IA e dados",
  "@vercel/analytics": "Infra", dotenv: "Infra", "@sentry/nextjs": "Infra", stripe: "Infra", resend: "Infra",
  // pypi
  django: "Framework", flask: "Framework", fastapi: "Framework", starlette: "Framework", streamlit: "Framework",
  sqlalchemy: "Banco e ORM", psycopg: "Banco e ORM", "psycopg2": "Banco e ORM", "psycopg2-binary": "Banco e ORM",
  alembic: "Banco e ORM", pymongo: "Banco e ORM", "django-rest-framework": "Framework", djangorestframework: "Framework",
  pydantic: "Validação", marshmallow: "Validação",
  pytest: "Testes", "pytest-cov": "Testes", coverage: "Testes", tox: "Testes",
  ruff: "Build e tooling", black: "Build e tooling", mypy: "Build e tooling", isort: "Build e tooling",
  flake8: "Build e tooling", "pre-commit": "Build e tooling", uv: "Build e tooling", poetry: "Build e tooling",
  numpy: "IA e dados", pandas: "IA e dados", polars: "IA e dados", "scikit-learn": "IA e dados", scipy: "IA e dados",
  torch: "IA e dados", tensorflow: "IA e dados", matplotlib: "IA e dados", seaborn: "IA e dados", jupyter: "IA e dados",
  transformers: "IA e dados", "anthropic": "IA e dados",
  requests: "Estado e dados", httpx: "Estado e dados", uvicorn: "Infra", gunicorn: "Infra", celery: "Infra",
  "python-dotenv": "Infra", boto3: "Infra",
};

const PREFIX: [string, LibraryCategory][] = [
  ["@types/", "Build e tooling"],
  ["@radix-ui/", "UI"],
  ["@tanstack/", "Estado e dados"],
  ["@testing-library/", "Testes"],
  ["eslint-", "Build e tooling"],
  ["@typescript-eslint/", "Build e tooling"],
  ["@vitest/", "Testes"],
  ["@tailwindcss/", "UI"],
  ["@supabase/", "Banco e ORM"],
  ["@prisma/", "Banco e ORM"],
  ["@aws-sdk/", "Infra"],
  ["@vercel/", "Infra"],
  ["@sentry/", "Infra"],
  ["@fontsource", "UI"],
  ["pytest-", "Testes"],
  ["django-", "Framework"],
  ["flake8-", "Build e tooling"],
];

export function libraryCategory(ecosystem: Ecosystem, name: string, overrides?: Map<string, string>): string {
  const override = overrides?.get(`${ecosystem}:${name}`);
  if (override) return override;
  if (EXACT[name]) return EXACT[name];
  const prefix = PREFIX.find(([p]) => name.startsWith(p));
  return prefix ? prefix[1] : "Outros";
}
