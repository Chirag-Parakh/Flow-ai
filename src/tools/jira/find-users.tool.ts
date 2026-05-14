import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { findUsersSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const findUsersTool: ToolDefinition = {
  name: "jira_find_users",
  description:
    "Find Atlassian account IDs from an email address, display name, or username fragment (e.g. cparakh53). " +
    "Use issue_key (e.g. SCRUM-1) to limit to users assignable on that issue before assigning. " +
    "Returns accountId for use as assignee_account_id in jira_create_issue / jira_update_issue.",
  schema: findUsersSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(findUsersSchema, rawInput);
    return withAudit("jira_find_users", input, "default", () => jiraService.findUsers(input));
  },
};
