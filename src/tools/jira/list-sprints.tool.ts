import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { listSprintsSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const listSprintsTool: ToolDefinition = {
  name: "jira_list_sprints",
  description:
    "List sprints for a Jira project's board. Optionally filter by state: active, future, or closed. " +
    "Returns sprint id (needed for jira_move_to_sprint), name, state, and dates.",
  schema: listSprintsSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(listSprintsSchema, rawInput);
    return withAudit("jira_list_sprints", input, "default", () =>
      jiraService.listSprints(input)
    );
  },
};
