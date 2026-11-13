// Consultas GraphQL usadas na sincronização e os tipos das respostas.

export const CONTRIBUTIONS_QUERY = /* GraphQL */ `
  query Contributions($from: DateTime!, $to: DateTime!) {
    viewer {
      id
      databaseId
      login
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
    rateLimit {
      remaining
      resetAt
    }
  }
`;

export type ContributionLevel = "NONE" | "FIRST_QUARTILE" | "SECOND_QUARTILE" | "THIRD_QUARTILE" | "FOURTH_QUARTILE";

export type ContributionsResponse = {
  viewer: {
    id: string;
    databaseId: number;
    login: string;
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: ContributionLevel }[] }[];
      };
    };
  };
};

export const REPOS_QUERY = /* GraphQL */ `
  query Repos($after: String) {
    viewer {
      repositories(
        first: 50
        after: $after
        ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          databaseId
          name
          nameWithOwner
          url
          description
          isPrivate
          isFork
          isArchived
          pushedAt
          owner {
            login
          }
          defaultBranchRef {
            name
          }
          primaryLanguage {
            name
          }
          languages(first: 15, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
    rateLimit {
      remaining
      resetAt
    }
  }
`;

export type RepoNode = {
  databaseId: number;
  name: string;
  nameWithOwner: string;
  url: string;
  description: string | null;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  pushedAt: string | null;
  owner: { login: string };
  defaultBranchRef: { name: string } | null;
  primaryLanguage: { name: string } | null;
  languages: { edges: { size: number; node: { name: string; color: string | null } }[] };
};

export type ReposResponse = {
  viewer: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: RepoNode[];
    };
  };
};

export const HISTORY_QUERY = /* GraphQL */ `
  query History($owner: String!, $name: String!, $author: ID!, $since: GitTimestamp!, $after: String) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 100, after: $after, since: $since, author: { id: $author }) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                oid
                message
                authoredDate
                url
                additions
                deletions
              }
            }
          }
        }
      }
    }
    rateLimit {
      remaining
      resetAt
    }
  }
`;

export type CommitNode = {
  oid: string;
  message: string;
  authoredDate: string;
  url: string;
  additions: number;
  deletions: number;
};

export type HistoryResponse = {
  repository: {
    defaultBranchRef: {
      target: {
        history?: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: CommitNode[];
        };
      } | null;
    } | null;
  } | null;
};

/** REST GET /repos/{owner}/{repo}/commits/{sha} (só os campos usados). */
export type CommitDetail = {
  sha: string;
  files?: { filename: string; additions: number; deletions: number; status: string }[];
};

/** REST GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1 */
export type TreeResponse = {
  truncated: boolean;
  tree: { path: string; type: "blob" | "tree" | "commit"; size?: number }[];
};
