import { authMiddleware } from "../middleware/auth.middleware.js";
import { bitbucketExecutor, type BitbucketRepo, type BitbucketPR } from "../executors/bitbucket.executor.js";
import type {
  ListReposInput,
  CreatePrInput,
  GetPrInput,
  MergePrInput,
} from "../schemas/bitbucket.schemas.js";

const USER_ID = "default";

export const bitbucketService = {
  async listRepos(input: ListReposInput): Promise<{ repos: BitbucketRepo[]; count: number }> {
    const { token, workspace: connectedWorkspace } = await authMiddleware("bitbucket", USER_ID);
    const workspace = input.workspace ?? connectedWorkspace!;

    const repos = await bitbucketExecutor.listRepos(token, workspace, {
      query: input.query,
      maxResults: input.max_results,
    });

    return { repos, count: repos.length };
  },

  async createPR(input: CreatePrInput): Promise<BitbucketPR & { message: string }> {
    const { token, workspace: connectedWorkspace } = await authMiddleware("bitbucket", USER_ID);
    const workspace = input.workspace ?? connectedWorkspace!;

    const pr = await bitbucketExecutor.createPR(token, workspace, input.repo_slug, {
      title: input.title,
      description: input.description,
      sourceBranch: input.source_branch,
      targetBranch: input.target_branch,
      closeSourceBranch: input.close_source_branch,
      reviewers: input.reviewers,
    });

    return { ...pr, message: `Successfully created PR #${pr.id}: "${input.title}"` };
  },

  async getPR(input: GetPrInput): Promise<BitbucketPR> {
    const { token, workspace: connectedWorkspace } = await authMiddleware("bitbucket", USER_ID);
    const workspace = input.workspace ?? connectedWorkspace!;
    return bitbucketExecutor.getPR(token, workspace, input.repo_slug, input.pr_id);
  },

  async mergePR(input: MergePrInput): Promise<BitbucketPR & { message: string }> {
    const { token, workspace: connectedWorkspace } = await authMiddleware("bitbucket", USER_ID);
    const workspace = input.workspace ?? connectedWorkspace!;

    const pr = await bitbucketExecutor.mergePR(token, workspace, input.repo_slug, input.pr_id, {
      mergeStrategy: input.merge_strategy,
      message: input.message,
    });

    return { ...pr, message: `Successfully merged PR #${input.pr_id} in ${input.repo_slug}` };
  },
};
