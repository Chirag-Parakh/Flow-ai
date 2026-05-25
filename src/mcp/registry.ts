import { createIssueTool } from "../tools/jira/create-issue.tool.js";
import { getIssueTool } from "../tools/jira/get-issue.tool.js";
import { updateIssueTool } from "../tools/jira/update-issue.tool.js";
import { listIssuesTool } from "../tools/jira/list-issues.tool.js";
import { addCommentTool } from "../tools/jira/add-comment.tool.js";
import { findUsersTool } from "../tools/jira/find-users.tool.js";
import { addWorklogTool } from "../tools/jira/add-worklog.tool.js";
import { updateWorklogTool } from "../tools/jira/update-worklog.tool.js";
import { listWorklogsTool } from "../tools/jira/list-worklogs.tool.js";
import { setStoryPointsTool } from "../tools/jira/set-story-points.tool.js";
import { listSprintsTool } from "../tools/jira/list-sprints.tool.js";
import { moveToSprintTool } from "../tools/jira/move-to-sprint.tool.js";

import { listReposTool } from "../tools/bitbucket/list-repos.tool.js";
import { createPrTool } from "../tools/bitbucket/create-pr.tool.js";
import { getPrTool } from "../tools/bitbucket/get-pr.tool.js";
import { mergePrTool } from "../tools/bitbucket/merge-pr.tool.js";

import type { ToolDefinition } from "../tools/types.js";

const ALL_TOOLS: ToolDefinition[] = [
  // Jira
  createIssueTool,
  getIssueTool,
  updateIssueTool,
  listIssuesTool,
  addCommentTool,
  findUsersTool,
  addWorklogTool,
  updateWorklogTool,
  listWorklogsTool,
  setStoryPointsTool,
  listSprintsTool,
  moveToSprintTool,
  // Bitbucket
  listReposTool,
  createPrTool,
  getPrTool,
  mergePrTool,
];

/** Map of tool name → definition for O(1) lookup */
export const toolRegistry = new Map<string, ToolDefinition>(
  ALL_TOOLS.map((t) => [t.name, t])
);

export { ALL_TOOLS };
