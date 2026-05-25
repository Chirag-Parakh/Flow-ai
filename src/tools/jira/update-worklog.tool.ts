import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { updateWorklogSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const updateWorklogTool: ToolDefinition = {
  name: "jira_update_worklog",
  description:
    "Update an existing work log on a Jira issue (time spent, note, or start time). " +
    "Requires worklog_id from jira_list_worklogs. At least one of time_spent, comment, or started must be set.",
  schema: updateWorklogSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(updateWorklogSchema, rawInput);
    return withAudit("jira_update_worklog", input, "default", () =>
      jiraService.updateWorklog(input)
    );
  },
};
