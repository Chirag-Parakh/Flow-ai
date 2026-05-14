import { z } from "zod";

export const createIssueSchema = z.object({
  project_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Jira project key (prefix in SCRUM-1 → SCRUM). Omit to use DEFAULT_JIRA_PROJECT_KEY from server .env."
    ),
  title: z
    .string()
    .min(1)
    .describe("Issue summary / title"),
  description: z
    .string()
    .optional()
    .describe("Issue description (plain text)"),
  issue_type: z
    .enum(["Bug", "Task", "Story", "Epic", "Subtask"])
    .default("Task")
    .describe("Jira issue type"),
  priority: z
    .enum(["Highest", "High", "Medium", "Low", "Lowest"])
    .optional()
    .describe("Issue priority"),
  assignee_account_id: z
    .string()
    .optional()
    .describe(
      "Atlassian account ID of the assignee. Use jira_find_users with email or name to resolve the ID."
    ),
  labels: z
    .array(z.string())
    .optional()
    .describe("Labels to attach to the issue"),
});

export const getIssueSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key, e.g. AUTH-21"),
});

export const updateIssueSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key to update, e.g. AUTH-21"),
  title: z
    .string()
    .optional()
    .describe("New summary / title"),
  description: z
    .string()
    .optional()
    .describe("New description (plain text)"),
  status: z
    .string()
    .optional()
    .describe("Transition to this status name, e.g. In Progress, Done"),
  priority: z
    .enum(["Highest", "High", "Medium", "Low", "Lowest"])
    .optional()
    .describe("New priority"),
  assignee_account_id: z
    .string()
    .optional()
    .describe(
      "Atlassian account ID of the new assignee. Use jira_find_users to resolve from email or name."
    ),
});

export const listIssuesSchema = z.object({
  project_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Jira project key to list. Omit to use DEFAULT_JIRA_PROJECT_KEY from server .env."
    ),
  status: z
    .string()
    .optional()
    .describe("Filter by status name, e.g. 'In Progress'"),
  assignee_account_id: z
    .string()
    .optional()
    .describe("Filter by assignee account ID (use jira_find_users to resolve from email or name)"),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of issues to return (1–100)"),
});

export const addCommentSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key, e.g. AUTH-21"),
  body: z
    .string()
    .min(1)
    .describe("Comment text"),
});

export const findUsersSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Search text: email address, display name, or username fragment (e.g. cparakh53 or user@company.com). Jira matches prefixes on name/email depending on site settings."
    ),
  issue_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "If set, only users assignable to this issue are returned (best before setting assignee on that issue)."
    ),
  project_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "If set (and issue_key omitted), only users assignable in this project (pass project key, e.g. SCRUM)."
    ),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(15)
    .describe("Maximum users to return (1–50)"),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type GetIssueInput = z.infer<typeof getIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ListIssuesInput = z.infer<typeof listIssuesSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type FindUsersInput = z.infer<typeof findUsersSchema>;
