import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { bitbucketService } from "../../services/bitbucket.service.js";
import { listReposSchema } from "../../schemas/bitbucket.schemas.js";
import type { ToolDefinition } from "../types";

export const listReposTool: ToolDefinition = {
  name: "bitbucket_list_repos",
  description:
    "List Bitbucket repositories in a workspace. " +
    "Optionally filter by name. Returns slug, full name, language, main branch, and clone URL.",
  schema: listReposSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(listReposSchema, rawInput);
    return withAudit("bitbucket_list_repos", input, "default", () =>
      bitbucketService.listRepos(input)
    );
  },
};
