import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { listWorklogsSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const listWorklogsTool: ToolDefinition = {
  name: "jira_list_worklogs",
  description:
    "List work log entries on a Jira issue. Returns worklog id, author, time spent, started, and comment. " +
    "Use worklog id with jira_update_worklog.",
  schema: listWorklogsSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(listWorklogsSchema, rawInput);
    return withAudit("jira_list_worklogs", input, "default", () =>
      jiraService.listWorklogs(input)
    );
  },
};
