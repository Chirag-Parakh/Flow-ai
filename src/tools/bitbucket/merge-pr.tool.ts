import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { bitbucketService } from "../../services/bitbucket.service.js";
import { mergePrSchema } from "../../schemas/bitbucket.schemas.js";
import type { ToolDefinition } from "../types";

export const mergePrTool: ToolDefinition = {
  name: "bitbucket_merge_pr",
  description:
    "Merge a Bitbucket pull request. Supports merge_commit, squash, and fast_forward strategies. " +
    "Returns the final PR state after merging.",
  schema: mergePrSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(mergePrSchema, rawInput);
    return withAudit("bitbucket_merge_pr", input, "default", () =>
      bitbucketService.mergePR(input)
    );
  },
};
