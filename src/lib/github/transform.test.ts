import { describe, expect, it } from "vitest";
import type { ContributionsResponse, RepoNode } from "./queries";
import {
  commitRow,
  commitTitle,
  contributionRows,
  dayStartIso,
  historySince,
  repoLanguageRows,
  repoRow,
  reposNeedingCommits,
} from "./transform";

const repoNode: RepoNode = {
  databaseId: 42,
  name: "pipo",
  nameWithOwner: "Oguipereira/pipo",
  url: "https://github.com/Oguipereira/pipo",
  description: null,
  isPrivate: false,
  isFork: false,
  isArchived: false,
  pushedAt: "2026-11-12T02:00:00Z",
  owner: { login: "Oguipereira" },
  defaultBranchRef: { name: "main" },
  primaryLanguage: { name: "TypeScript" },
  languages: {
    edges: [
      { size: 9000, node: { name: "TypeScript", color: "#3178c6" } },
      { size: 1000, node: { name: "CSS", color: "#663399" } },
    ],
  },
};

describe("contributionRows", () => {
  it("achata as semanas e converte o nível", () => {
    const data: ContributionsResponse = {
      viewer: {
        id: "U_1",
        databaseId: 1,
        login: "x",
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: 5,
            weeks: [
              {
                contributionDays: [
                  { date: "2026-11-08", contributionCount: 0, contributionLevel: "NONE" },
                  { date: "2026-11-09", contributionCount: 5, contributionLevel: "FOURTH_QUARTILE" },
                ],
              },
            ],
          },
        },
      },
    };
    expect(contributionRows(data, "u")).toEqual([
      { user_id: "u", date: "2026-11-08", count: 0, level: 0 },
      { user_id: "u", date: "2026-11-09", count: 5, level: 4 },
    ]);
  });
});

describe("repos", () => {
  it("repoRow", () => {
    const row = repoRow(repoNode, "u");
    expect(row).toMatchObject({ github_id: 42, full_name: "Oguipereira/pipo", owner: "Oguipereira", default_branch: "main" });
  });

  it("repoLanguageRows", () => {
    expect(repoLanguageRows(repoNode, "r", "u")).toEqual([
      { repo_id: "r", user_id: "u", language: "TypeScript", color: "#3178c6", bytes: 9000 },
      { repo_id: "r", user_id: "u", language: "CSS", color: "#663399", bytes: 1000 },
    ]);
  });
});

describe("commitRow", () => {
  it("commit às 23h30 em São Paulo fica no dia local, não no UTC", () => {
    const row = commitRow(
      { oid: "a".repeat(40), message: "feat: x", authoredDate: "2026-03-11T02:30:00Z", url: "u", additions: 1, deletions: 2 },
      "r",
      "u",
      "America/Sao_Paulo",
    );
    expect(row.local_date).toBe("2026-03-10");
    expect(row.committed_at).toBe("2026-03-11T02:30:00Z");
  });
});

describe("dayStartIso", () => {
  it("usa o offset do fuso", () => {
    expect(dayStartIso("2026-11-12", "America/Sao_Paulo")).toBe("2026-11-12T00:00:00-03:00");
    expect(dayStartIso("2026-11-12", "UTC")).toBe("2026-11-12T00:00:00+00:00");
  });
});

describe("reposNeedingCommits", () => {
  const today = "2026-11-12";
  const repos = [
    { id: "new", ignored: false, pushedAt: "2026-11-10T00:00:00Z", commitsSyncedAt: null },
    { id: "fresh", ignored: false, pushedAt: "2026-11-01T00:00:00Z", commitsSyncedAt: "2026-11-02T00:00:00Z" },
    { id: "pushed", ignored: false, pushedAt: "2026-11-11T00:00:00Z", commitsSyncedAt: "2026-11-02T00:00:00Z" },
    { id: "ignored", ignored: true, pushedAt: "2026-11-11T00:00:00Z", commitsSyncedAt: null },
    { id: "old", ignored: false, pushedAt: "2024-01-01T00:00:00Z", commitsSyncedAt: null },
    { id: "empty", ignored: false, pushedAt: null, commitsSyncedAt: null },
  ];

  it("só novos ou com push depois da última sincronização, mais recentes primeiro", () => {
    expect(reposNeedingCommits(repos, today).map((r) => r.id)).toEqual(["pushed", "new"]);
  });
});

describe("historySince", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  it("primeira vez: 1 ano", () => {
    expect(historySince(null, now)).toBe("2025-11-12T12:00:00.000Z");
  });
  it("depois: última sincronização menos 2 dias", () => {
    expect(historySince("2026-11-10T00:00:00Z", now)).toBe("2026-11-08T00:00:00.000Z");
  });
});

describe("commitTitle", () => {
  it("primeira linha", () => {
    expect(commitTitle("feat: x\n\ncorpo")).toBe("feat: x");
  });
});
