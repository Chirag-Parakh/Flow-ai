import Database, { type Database as BetterSqlite3Database } from "better-sqlite3";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger.js";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/flow.db";

// Ensure the data directory exists
const dir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db: BetterSqlite3Database = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Migrations ────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS oauth_connections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    provider        TEXT    NOT NULL,          -- 'jira' | 'bitbucket'
    user_id         TEXT    NOT NULL DEFAULT 'default',
    access_token    TEXT,
    refresh_token   TEXT,
    expires_at      INTEGER,                   -- unix epoch seconds
    cloud_id        TEXT,                      -- Jira cloud id
    cloud_name      TEXT,                      -- Jira site name
    workspace       TEXT,                      -- Bitbucket workspace slug
    created_at      INTEGER DEFAULT (strftime('%s','now')),
    updated_at      INTEGER DEFAULT (strftime('%s','now')),
    UNIQUE(provider, user_id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name   TEXT    NOT NULL,
    user_id     TEXT    NOT NULL DEFAULT 'default',
    input       TEXT,                          -- JSON
    output      TEXT,                          -- JSON
    duration_ms INTEGER,
    status      TEXT    NOT NULL,              -- 'success' | 'error'
    error       TEXT,
    created_at  INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_tool    ON audit_logs(tool_name);
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`);

logger.debug("SQLite database ready", { path: path.resolve(DB_PATH) });

// ─── Typed helpers ─────────────────────────────────────────────────────────────

export interface OAuthConnection {
  id: number;
  provider: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  cloud_id: string | null;
  cloud_name: string | null;
  workspace: string | null;
  created_at: number;
  updated_at: number;
}

export interface AuditLog {
  id: number;
  tool_name: string;
  user_id: string;
  input: string | null;
  output: string | null;
  duration_ms: number | null;
  status: string;
  error: string | null;
  created_at: number;
}

export const oauthRepo = {
  upsert(
    provider: string,
    userId: string,
    data: Partial<Omit<OAuthConnection, "id" | "provider" | "user_id" | "created_at" | "updated_at">>
  ) {
    const existing = this.find(provider, userId);
    if (existing) {
      const sets = Object.keys(data)
        .map((k) => `${k} = @${k}`)
        .join(", ");
      db.prepare(
        `UPDATE oauth_connections SET ${sets}, updated_at = strftime('%s','now') WHERE provider = @provider AND user_id = @userId`
      ).run({ ...data, provider, userId });
    } else {
      const cols = ["provider", "user_id", ...Object.keys(data)].join(", ");
      const vals = ["@provider", "@userId", ...Object.keys(data).map((k) => `@${k}`)].join(", ");
      db.prepare(`INSERT INTO oauth_connections (${cols}) VALUES (${vals})`).run({
        provider,
        userId,
        ...data,
      });
    }
  },

  find(provider: string, userId = "default"): OAuthConnection | undefined {
    return db
      .prepare("SELECT * FROM oauth_connections WHERE provider = ? AND user_id = ?")
      .get(provider, userId) as OAuthConnection | undefined;
  },

  delete(provider: string, userId = "default") {
    db.prepare("DELETE FROM oauth_connections WHERE provider = ? AND user_id = ?").run(provider, userId);
  },
};

export const auditRepo = {
  insert(entry: Omit<AuditLog, "id" | "created_at">) {
    db.prepare(
      `INSERT INTO audit_logs (tool_name, user_id, input, output, duration_ms, status, error)
       VALUES (@tool_name, @user_id, @input, @output, @duration_ms, @status, @error)`
    ).run(entry);
  },

  recent(limit = 50): AuditLog[] {
    return db
      .prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?")
      .all(limit) as AuditLog[];
  },
};
