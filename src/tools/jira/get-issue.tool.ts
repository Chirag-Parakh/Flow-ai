import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { getIssueSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const getIssueTool: ToolDefinition = {
  name: "jira_get_issue",
  description:
    "Fetch the full details of a Jira issue by its key (e.g. AUTH-21). " +
    "Returns summary, status, type, priority, assignee, description, labels, and timestamps.",
  schema: getIssueSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(getIssueSchema, rawInput);
    return withAudit("jira_get_issue", input, "default", () =>
      jiraService.getIssue(input)
    );
  },
};
