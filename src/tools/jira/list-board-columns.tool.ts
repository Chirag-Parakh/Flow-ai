import { validateInput } from "../../middleware/validation.middleware.js";
import { withAudit } from "../../middleware/logging.middleware.js";
import { jiraService } from "../../services/jira.service.js";
import { listBoardColumnsSchema } from "../../schemas/jira.schemas.js";
import type { ToolDefinition } from "../types";

export const listBoardColumnsTool: ToolDefinition = {
  name: "jira_list_board_columns",
  description:
    "List the columns (stages) of a Jira Scrum/Kanban board and the workflow statuses mapped to each. " +
    "Returns boardId, boardName, columnCount, and a columns array with name + status IDs. " +
    "Pass project_key (e.g. SCRUM) or a specific board_id. Omit both to use DEFAULT_JIRA_PROJECT_KEY.",
  schema: listBoardColumnsSchema,

  async execute(rawInput: unknown) {
    const input = validateInput(listBoardColumnsSchema, rawInput);
    return withAudit("jira_list_board_columns", input, "default", () =>
      jiraService.listBoardColumns(input)
    );
  },
};
