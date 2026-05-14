import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { createIssueSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const createIssueTool: ToolDefinition = {
  name: "jira_create_issue",
  description:
    "Create a new Jira issue (Bug, Task, Story, Epic, etc.) in a project. " +
    "Returns the issue key (e.g. AUTH-21), ID, and URL.",
  schema: createIssueSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(createIssueSchema, rawInput);
    return withAudit("jira_create_issue", input, "default", () =>
      jiraService.createIssue(input)
    );
  },
};
