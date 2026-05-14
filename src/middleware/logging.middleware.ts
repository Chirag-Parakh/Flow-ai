import { auditRepo } from "../db/client.js";
import { logger } from "../utils/logger.js";

export interface AuditEntry {
  toolName: string;
  userId?: string;
  input?: unknown;
  output?: unknown;
  durationMs?: number;
  status: "success" | "error";
  error?: string;
}

/**
 * Persists an audit log entry and emits a structured log line.
 */
export function logAudit(entry: AuditEntry): void {
  const row = {
    tool_name: entry.toolName,
    user_id: entry.userId ?? "default",
    input: entry.input !== undefined ? JSON.stringify(entry.input) : null,
    output: entry.output !== undefined ? JSON.stringify(entry.output) : null,
    duration_ms: entry.durationMs ?? null,
    status: entry.status,
    error: entry.error ?? null,
  };

  auditRepo.insert(row);

  if (entry.status === "success") {
    logger.info(`[audit] ${entry.toolName}`, {
      userId: row.user_id,
      durationMs: row.duration_ms,
    });
  } else {
    logger.warn(`[audit] ${entry.toolName} failed`, {
      userId: row.user_id,
      error: entry.error,
    });
  }
}

/**
 * Wraps an async tool handler with automatic timing and audit logging.
 */
export async function withAudit<T>(
  toolName: string,
  input: unknown,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logAudit({
      toolName,
      userId,
      input,
      output: result,
      durationMs: Date.now() - start,
      status: "success",
    });
    return result;
  } catch (err) {
    logAudit({
      toolName,
      userId,
      input,
      durationMs: Date.now() - start,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
