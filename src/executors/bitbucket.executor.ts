import axios, { AxiosError } from "axios";
import { logger } from "../utils/logger.js";

const BB_BASE = "https://api.bitbucket.org/2.0";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function handleAxiosError(err: unknown): never {
  if (err instanceof AxiosError) {
    const msg =
      err.response?.data?.error?.message ??
      err.response?.data?.message ??
      err.response?.statusText ??
      err.message;
    throw new Error(`Bitbucket API error (${err.response?.status ?? "network"}): ${JSON.stringify(msg)}`);
  }
  throw err;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BitbucketRepo {
  slug: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  language: string | null;
  mainBranch: string | null;
  cloneUrlHttp: string | null;
  updatedAt: string;
  url: string;
}

export interface BitbucketPR {
  id: number;
  title: string;
  description: string | null;
  state: string;
  sourceBranch: string;
  targetBranch: string;
  author: string;
  reviewers: string[];
  createdAt: string;
  updatedAt: string;
  url: string;
}

// ─── Executor ─────────────────────────────────────────────────────────────────

export const bitbucketExecutor = {
  async listRepos(
    token: string,
    workspace: string,
    opts: { query?: string; maxResults: number }
  ): Promise<BitbucketRepo[]> {
    logger.debug("bitbucketExecutor.listRepos", { workspace });

    try {
      const params: Record<string, unknown> = { pagelen: opts.maxResults };
      if (opts.query) params.q = `name ~ "${opts.query}"`;

      const { data } = await axios.get<{
        values: Array<{
          slug: string;
          full_name: string;
          description: string | null;
          is_private: boolean;
          language: string | null;
          mainbranch: { name: string } | null;
          links: {
            clone: Array<{ name: string; href: string }>;
            html: { href: string };
          };
          updated_on: string;
        }>;
      }>(`${BB_BASE}/repositories/${workspace}`, {
        headers: authHeaders(token),
        params,
      });

      return data.values.map((r) => ({
        slug: r.slug,
        fullName: r.full_name,
        description: r.description,
        isPrivate: r.is_private,
        language: r.language,
        mainBranch: r.mainbranch?.name ?? null,
        cloneUrlHttp: r.links.clone.find((c) => c.name === "https")?.href ?? null,
        updatedAt: r.updated_on,
        url: r.links.html.href,
      }));
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async createPR(
    token: string,
    workspace: string,
    repoSlug: string,
    payload: {
      title: string;
      description?: string;
      sourceBranch: string;
      targetBranch: string;
      closeSourceBranch: boolean;
      reviewers?: string[];
    }
  ): Promise<BitbucketPR> {
    logger.debug("bitbucketExecutor.createPR", { workspace, repoSlug });

    try {
      const body: Record<string, unknown> = {
        title: payload.title,
        source: { branch: { name: payload.sourceBranch } },
        destination: { branch: { name: payload.targetBranch } },
        close_source_branch: payload.closeSourceBranch,
        ...(payload.description && { description: payload.description }),
        ...(payload.reviewers?.length && {
          reviewers: payload.reviewers.map((uuid) => ({ uuid })),
        }),
      };

      const { data } = await axios.post<{
        id: number;
        title: string;
        description: string | null;
        state: string;
        source: { branch: { name: string } };
        destination: { branch: { name: string } };
        author: { display_name: string };
        reviewers: Array<{ display_name: string }>;
        created_on: string;
        updated_on: string;
        links: { html: { href: string } };
      }>(`${BB_BASE}/repositories/${workspace}/${repoSlug}/pullrequests`, body, {
        headers: authHeaders(token),
      });

      return mapPR(data);
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async getPR(
    token: string,
    workspace: string,
    repoSlug: string,
    prId: number
  ): Promise<BitbucketPR> {
    logger.debug("bitbucketExecutor.getPR", { workspace, repoSlug, prId });

    try {
      const { data } = await axios.get(
        `${BB_BASE}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`,
        { headers: authHeaders(token) }
      );
      return mapPR(data);
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async mergePR(
    token: string,
    workspace: string,
    repoSlug: string,
    prId: number,
    opts: { mergeStrategy: string; message?: string }
  ): Promise<BitbucketPR> {
    logger.debug("bitbucketExecutor.mergePR", { workspace, repoSlug, prId });

    try {
      const body: Record<string, unknown> = {
        merge_strategy: opts.mergeStrategy,
        ...(opts.message && { message: opts.message }),
      };

      const { data } = await axios.post(
        `${BB_BASE}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/merge`,
        body,
        { headers: authHeaders(token) }
      );
      return mapPR(data);
    } catch (err) {
      handleAxiosError(err);
    }
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapPR(data: {
  id: number;
  title: string;
  description: string | null;
  state: string;
  source: { branch: { name: string } };
  destination: { branch: { name: string } };
  author: { display_name: string };
  reviewers: Array<{ display_name: string }>;
  created_on: string;
  updated_on: string;
  links: { html: { href: string } };
}): BitbucketPR {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    state: data.state,
    sourceBranch: data.source.branch.name,
    targetBranch: data.destination.branch.name,
    author: data.author.display_name,
    reviewers: data.reviewers.map((r) => r.display_name),
    createdAt: data.created_on,
    updatedAt: data.updated_on,
    url: data.links.html.href,
  };
}
