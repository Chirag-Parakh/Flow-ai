import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { moveToSprintSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const moveToSprintTool: ToolDefinition = {
  name: "jira_move_to_sprint",
  description:
    "Move a Jira issue into a sprint. Use jira_list_sprints to find the sprint_id first.",
  schema: moveToSprintSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(moveToSprintSchema, rawInput);
    return withAudit("jira_move_to_sprint", input, "default", () =>
      jiraService.moveToSprint(input)
    );
  },
};
