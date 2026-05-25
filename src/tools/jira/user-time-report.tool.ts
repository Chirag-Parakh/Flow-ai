import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { userTimeReportSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const userTimeReportTool: ToolDefinition = {
  name: "jira_user_time_report",
  description:
    "Return a summary of how much time a Jira user has logged in the last N days (default 7). " +
    "Resolves the user by display name or email (defaults to 'Chirag Parakh'), then aggregates " +
    "worklogs across all matching issues. Returns a per-issue breakdown and a grand total.",
  schema: userTimeReportSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(userTimeReportSchema, rawInput);
    return withAudit("jira_user_time_report", input, "default", () =>
      jiraService.getUserTimeReport(input)
    );
  },
};
