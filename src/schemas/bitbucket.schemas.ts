import { z } from "zod";

export const listReposSchema = z.object({
  workspace: z
    .string()
    .optional()
    .describe("Bitbucket workspace slug (defaults to your connected workspace)"),
  query: z
    .string()
    .optional()
    .describe("Search filter on repository name"),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of repos to return (1–100)"),
});

export const createPrSchema = z.object({
  workspace: z
    .string()
    .optional()
    .describe("Bitbucket workspace slug (defaults to connected workspace)"),
  repo_slug: z
    .string()
    .min(1)
    .describe("Repository slug, e.g. my-repo"),
  title: z
    .string()
    .min(1)
    .describe("Pull request title"),
  description: z
    .string()
    .optional()
    .describe("Pull request description"),
  source_branch: z
    .string()
    .min(1)
    .describe("Source branch name, e.g. feature/login"),
  target_branch: z
    .string()
    .default("main")
    .describe("Target branch name (default: main)"),
  close_source_branch: z
    .boolean()
    .default(false)
    .describe("Close the source branch after merge"),
  reviewers: z
    .array(z.string())
    .optional()
    .describe("List of reviewer account UUIDs"),
});

export const getPrSchema = z.object({
  workspace: z
    .string()
    .optional()
    .describe("Bitbucket workspace slug (defaults to connected workspace)"),
  repo_slug: z
    .string()
    .min(1)
    .describe("Repository slug"),
  pr_id: z
    .number()
    .int()
    .min(1)
    .describe("Pull request ID"),
});

export const mergePrSchema = z.object({
  workspace: z
    .string()
    .optional()
    .describe("Bitbucket workspace slug (defaults to connected workspace)"),
  repo_slug: z
    .string()
    .min(1)
    .describe("Repository slug"),
  pr_id: z
    .number()
    .int()
    .min(1)
    .describe("Pull request ID to merge"),
  merge_strategy: z
    .enum(["merge_commit", "squash", "fast_forward"])
    .default("merge_commit")
    .describe("Merge strategy"),
  message: z
    .string()
    .optional()
    .describe("Custom merge commit message"),
});

export type ListReposInput = z.infer<typeof listReposSchema>;
export type CreatePrInput = z.infer<typeof createPrSchema>;
export type GetPrInput = z.infer<typeof getPrSchema>;
export type MergePrInput = z.infer<typeof mergePrSchema>;
