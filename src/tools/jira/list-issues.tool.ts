import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { listIssuesSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const listIssuesTool: ToolDefinition = {
  name: "jira_list_issues",
  description:
    "List issues in a Jira project, with optional filters for status and assignee. " +
    "Returns up to 100 issues ordered by creation date (newest first).",
  schema: listIssuesSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(listIssuesSchema, rawInput);
    return withAudit("jira_list_issues", input, "default", () =>
      jiraService.listIssues(input)
    );
  },
};
