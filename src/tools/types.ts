import { ZodSchema } from "zod";

export interface ToolDefinition {
  /** MCP tool name — use snake_case, e.g. jira_create_issue */
  name: string;
  /** Human-readable description shown to the AI */
  description: string;
  /** Zod schema used for input validation */
  schema: ZodSchema;
  /** Business handler — receives raw (unvalidated) input */
  execute(rawInput: unknown): Promise<unknown>;
}
