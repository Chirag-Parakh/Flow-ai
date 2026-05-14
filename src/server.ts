import "dotenv/config";
import { randomUUID } from "crypto";
import Fastify from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp/router.js";
import {
  getJiraAuthUrl,
  exchangeJiraCode,
  getBitbucketAuthUrl,
  exchangeBitbucketCode,
  getAuthStatus,
} from "./auth/oauth.service.js";
import { auditRepo } from "./db/client.js";
import { logger } from "./utils/logger.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const fastify = Fastify({ logger: false });

// ─── CORS ─────────────────────────────────────────────────────────────────────
fastify.addHook("onRequest", async (request, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (request.method === "OPTIONS") {
    reply.status(204).send();
  }
});

// ─── MCP Streamable HTTP transport ───────────────────────────────────────────
// SDK 1.11+ recommends StreamableHTTPServerTransport over SSEServerTransport.
// Cursor tries Streamable HTTP (POST /mcp) first, then falls back to SSE (GET /mcp).
// Both are handled by the same transport + route.

const transports = new Map<string, StreamableHTTPServerTransport>();

async function mcpHandler(
  request: Parameters<Parameters<typeof fastify.route>[0]["handler"]>[0],
  reply: Parameters<Parameters<typeof fastify.route>[0]["handler"]>[1]
) {
  const sessionId = request.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId)!;
  } else if (!sessionId && request.method === "POST") {
    // New session — create a fresh MCP server + transport pair
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
        logger.info("MCP session created", { sessionId: id });
      },
    });

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) {
        transports.delete(id);
        logger.debug("MCP session closed", { sessionId: id });
      }
    };

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
  } else {
    reply.status(400).send({ error: "Missing or invalid MCP session ID" });
    return;
  }

  // Hand off raw Node.js req/res to the transport; hijack tells Fastify to
  // stop managing the response lifecycle.
  reply.hijack();
  await transport.handleRequest(request.raw, reply.raw, request.body);
}

fastify.route({ method: "POST",   url: "/mcp", handler: mcpHandler });
fastify.route({ method: "GET",    url: "/mcp", handler: mcpHandler });
fastify.route({ method: "DELETE", url: "/mcp", handler: mcpHandler });

// ─── OAuth — Jira ─────────────────────────────────────────────────────────────
fastify.get("/auth/jira", async (_req, reply) => {
  const url = getJiraAuthUrl();
  reply.redirect(url);
});

fastify.get<{ Querystring: { code?: string; error?: string } }>(
  "/auth/jira/callback",
  async (request, reply) => {
    const { code, error } = request.query;

    if (error || !code) {
      return reply
        .status(400)
        .send({ error: error ?? "Missing authorization code" });
    }

    try {
      await exchangeJiraCode(code);
      reply.type("text/html").send(successPage("Jira"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Jira OAuth callback error", { msg });
      reply.status(500).send({ error: msg });
    }
  }
);

// ─── OAuth — Bitbucket ────────────────────────────────────────────────────────
fastify.get("/auth/bitbucket", async (_req, reply) => {
  const url = getBitbucketAuthUrl();
  reply.redirect(url);
});

fastify.get<{ Querystring: { code?: string; error?: string } }>(
  "/auth/bitbucket/callback",
  async (request, reply) => {
    const { code, error } = request.query;

    if (error || !code) {
      return reply
        .status(400)
        .send({ error: error ?? "Missing authorization code" });
    }

    try {
      await exchangeBitbucketCode(code);
      reply.type("text/html").send(successPage("Bitbucket"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Bitbucket OAuth callback error", { msg });
      reply.status(500).send({ error: msg });
    }
  }
);

// ─── Status & Audit routes ────────────────────────────────────────────────────
fastify.get("/auth/status", async (_req, reply) => {
  reply.send(getAuthStatus());
});

fastify.get("/audit", async (_req, reply) => {
  reply.send(auditRepo.recent(50));
});

fastify.get("/health", async (_req, reply) => {
  reply.send({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Root — quick reference ───────────────────────────────────────────────────
fastify.get("/", async (_req, reply) => {
  reply.type("text/html").send(landingPage());
});

// ─── Start ────────────────────────────────────────────────────────────────────
fastify.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  }
  logger.info(`Flow MCP Server running`, { url: `http://localhost:${PORT}` });
  logger.info(`MCP endpoint:      http://localhost:${PORT}/mcp`);
  logger.info(`Auth status:      http://localhost:${PORT}/auth/status`);
});

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function successPage(provider: string) {
  return `<!DOCTYPE html><html><head><title>Connected</title>
  <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4}
  .box{background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  h1{color:#16a34a;margin:0 0 8px}p{color:#6b7280}</style></head>
  <body><div class="box"><h1>✅ ${provider} Connected</h1>
  <p>You can close this window and return to your AI tool.</p></div></body></html>`;
}

function landingPage() {
  return `<!DOCTYPE html><html><head><title>Flow MCP Server</title>
  <style>body{font-family:system-ui;max-width:640px;margin:60px auto;padding:0 20px;color:#111}
  h1{font-size:2rem;margin-bottom:4px}code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:.9em}
  a{color:#2563eb}table{width:100%;border-collapse:collapse;margin-top:12px}
  th{text-align:left;padding:8px;background:#f9fafb;border-bottom:1px solid #e5e7eb}
  td{padding:8px;border-bottom:1px solid #f3f4f6}
  .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:.75em;font-weight:600}
  .jira{background:#dbeafe;color:#1d4ed8}.bb{background:#fef3c7;color:#92400e}</style></head>
  <body>
  <h1>⚡ Flow MCP Server</h1>
  <p>An MCP server that connects any AI tool to <strong>Jira</strong> and <strong>Bitbucket</strong>.</p>
  <h2>Quick Start</h2>
  <ol>
    <li>Connect Jira: <a href="/auth/jira">/auth/jira</a></li>
    <li>Connect Bitbucket: <a href="/auth/bitbucket">/auth/bitbucket</a></li>
    <li>Check status: <a href="/auth/status">/auth/status</a></li>
    <li>Point your AI tool to: <code>http://localhost:3000/mcp</code></li>
  </ol>
  <h2>Available Tools</h2>
  <table>
    <tr><th>Tool</th><th>Description</th></tr>
    <tr><td><code>jira_create_issue</code> <span class="badge jira">Jira</span></td><td>Create Bug / Task / Story / Epic</td></tr>
    <tr><td><code>jira_get_issue</code> <span class="badge jira">Jira</span></td><td>Fetch issue details</td></tr>
    <tr><td><code>jira_update_issue</code> <span class="badge jira">Jira</span></td><td>Update fields or transition status</td></tr>
    <tr><td><code>jira_list_issues</code> <span class="badge jira">Jira</span></td><td>List issues with filters</td></tr>
    <tr><td><code>jira_add_comment</code> <span class="badge jira">Jira</span></td><td>Add a comment to an issue</td></tr>
    <tr><td><code>jira_find_users</code> <span class="badge jira">Jira</span></td><td>Resolve accountId from email / name / username</td></tr>
    <tr><td><code>bitbucket_list_repos</code> <span class="badge bb">Bitbucket</span></td><td>List workspace repositories</td></tr>
    <tr><td><code>bitbucket_create_pr</code> <span class="badge bb">Bitbucket</span></td><td>Open a pull request</td></tr>
    <tr><td><code>bitbucket_get_pr</code> <span class="badge bb">Bitbucket</span></td><td>Get pull request details</td></tr>
    <tr><td><code>bitbucket_merge_pr</code> <span class="badge bb">Bitbucket</span></td><td>Merge a pull request</td></tr>
  </table>
  <p style="margin-top:24px"><a href="/audit">View recent audit logs</a> · <a href="/health">Health check</a></p>
  </body></html>`;
}
