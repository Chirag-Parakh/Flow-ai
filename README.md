# Flow MCP Server

MCP server for **Jira** and **Bitbucket**. Connect **Cursor**, **Claude Desktop**, or any client that supports **remote MCP over HTTP/SSE**.

**Stack:** Node.js · TypeScript · Fastify · `@modelcontextprotocol/sdk` · SQLite (tokens + audit logs)

---

## 1. Prerequisites

- **Node.js 20+**
- **Atlassian OAuth app** (Jira Cloud) — [Developer console](https://developer.atlassian.com/console/myapps/)
  - Callback: `http://localhost:3000/auth/jira/callback`
  - Scopes: `read:jira-user` `read:jira-work` `write:jira-work` `offline_access`
- **Bitbucket OAuth consumer** — [OAuth on Bitbucket Cloud](https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/) (create a consumer under **Personal settings → Access management → OAuth**)
  - Callback: `http://localhost:3000/auth/bitbucket/callback`
  - Permissions: repository + pullrequest (read/write), account (read)

---

## 2. Install & configure

```bash
cd Flow
npm install
cp .env.example .env
```

Edit `.env`: set `ATLASSIAN_*`, `BITBUCKET_*`, and match redirect URIs to your OAuth app settings (change host/port if you are not on `localhost:3000`).

Optional: set **`DEFAULT_JIRA_PROJECT_KEY`** (e.g. `SCRUM` from board issues `SCRUM-1`) so `jira_create_issue` and `jira_list_issues` can omit `project_key` in tool calls.

---

## 3. Run

```bash
npm run dev    # hot reload (tsx)
npm run build && npm start   # production
```

Server defaults to **http://localhost:3000**.

---

## 4. Connect accounts (once per machine)

Open in a browser (with the server running):

| Service   | URL |
|-----------|-----|
| Jira      | http://localhost:3000/auth/jira |
| Bitbucket | http://localhost:3000/auth/bitbucket |

Check **http://localhost:3000/auth/status** — both should show `connected: true` after OAuth.

---

## 5. Attach your AI tool (MCP)

**MCP endpoint:** `http://localhost:3000/mcp`

**Cursor:** add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "flow": { "url": "http://localhost:3000/mcp" }
  }
}
```
Then restart Cursor.

**Claude Desktop / other clients:** use the same SSE URL if they support HTTP/SSE MCP.

The model will see tools like `jira_create_issue`, `bitbucket_create_pr`, etc. Ask it in natural language (e.g. “create a Jira bug in PROJECT …”).

---

## 6. Tools (quick reference)

**Jira:** `jira_create_issue` · `jira_get_issue` · `jira_update_issue` · `jira_list_issues` · `jira_add_comment` · `jira_find_users`  

**Bitbucket:** `bitbucket_list_repos` · `bitbucket_create_pr` · `bitbucket_get_pr` · `bitbucket_merge_pr`

---

## 7. Useful HTTP routes

| Route | Purpose |
|-------|---------|
| `/` | Short HTML overview |
| `/health` | Liveness |
| `/auth/status` | Jira / Bitbucket connection state |
| `/audit` | Last 50 tool calls (audit log) |
| `/sse` | MCP SSE stream |
| `POST /messages?sessionId=…` | MCP messages (used by the SDK transport) |

---

## 8. Production notes

- Serve **HTTPS** and a stable hostname; update OAuth redirect URIs to match.
- Back up `DATABASE_PATH` (SQLite) — it holds refresh tokens.
- Set `NODE_ENV=production` and tune `LOG_LEVEL` if you add it to `.env`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run with watch |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server |
| `npm run typecheck` | `tsc --noEmit` |
