import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { updateIssueSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const updateIssueTool: ToolDefinition = {
  name: "jira_update_issue",
  description:
    "Update an existing Jira issue. You can change the title, description, priority, " +
    "assignee, or transition it to a new status (e.g. 'In Progress', 'Done').",
  schema: updateIssueSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(updateIssueSchema, rawInput);
    return withAudit("jira_update_issue", input, "default", () =>
      jiraService.updateIssue(input)
    );
  },
};
