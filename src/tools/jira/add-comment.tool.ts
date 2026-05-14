import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { addCommentSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const addCommentTool: ToolDefinition = {
  name: "jira_add_comment",
  description:
    "Add a comment to an existing Jira issue. Returns the created comment details.",
  schema: addCommentSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(addCommentSchema, rawInput);
    return withAudit("jira_add_comment", input, "default", () =>
      jiraService.addComment(input)
    );
  },
};
