import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { setStoryPointsSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const setStoryPointsTool: ToolDefinition = {
  name: "jira_set_story_points",
  description:
    "Set the story point estimate on a Jira issue (uses customfield_10016 by default). " +
    "Pass custom_field_id if your site uses a different field.",
  schema: setStoryPointsSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(setStoryPointsSchema, rawInput);
    return withAudit("jira_set_story_points", input, "default", () =>
      jiraService.setStoryPoints(input)
    );
  },
};
