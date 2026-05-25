import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { addWorklogSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const addWorklogTool: ToolDefinition = {
  name: "jira_add_worklog",
  description:
    "Log time spent on a Jira issue (work log). Returns the created entry with worklog id. " +
    "Use jira_list_worklogs and jira_update_worklog to change an existing entry.",
  schema: addWorklogSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(addWorklogSchema, rawInput);
    return withAudit("jira_add_worklog", input, "default", () =>
      jiraService.addWorklog(input)
    );
  },
};
