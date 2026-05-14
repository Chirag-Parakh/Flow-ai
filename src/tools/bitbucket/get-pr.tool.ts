import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { bitbucketService } from "../../services/bitbucket.service.js";
import { getPrSchema } from "../../schemas/bitbucket.schemas.js";
import type { ToolDefinition } from "../types";

export const getPrTool: ToolDefinition = {
  name: "bitbucket_get_pr",
  description:
    "Fetch details of a Bitbucket pull request by repo and PR ID. " +
    "Returns title, state, branches, author, reviewers, and timestamps.",
  schema: getPrSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(getPrSchema, rawInput);
    return withAudit("bitbucket_get_pr", input, "default", () =>
      bitbucketService.getPR(input)
    );
  },
};
