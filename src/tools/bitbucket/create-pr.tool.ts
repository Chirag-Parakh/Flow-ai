import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { bitbucketService } from "../../services/bitbucket.service.js";
import { createPrSchema } from "../../schemas/bitbucket.schemas.js";
import type { ToolDefinition } from "../types";

export const createPrTool: ToolDefinition = {
  name: "bitbucket_create_pr",
  description:
    "Create a new Bitbucket pull request from a source branch into a target branch. " +
    "Returns the PR ID, title, state, and URL.",
  schema: createPrSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(createPrSchema, rawInput);
    return withAudit("bitbucket_create_pr", input, "default", () =>
      bitbucketService.createPR(input)
    );
  },
};
