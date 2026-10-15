import { useState } from "react";
import { Button } from "../../components/common/Button.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { Icon } from "../../components/common/Icon.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import {
  describeHealthError,
  githubRate,
  githubStatus,
  mcpStatus,
  providerStatus,
} from "../../utils/status.js";

export function SettingsPage({
  health,
  healthConnection = "ready",
  healthError,
  onRefreshHealth,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshHealth?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const gh = health?.checks?.github;
  const ai = health?.checks?.ai;
  const mcp = health?.checks?.mcp;
  const gemini = ai?.gemini;
  const ollama = ai?.ollama;
  const rate = githubRate(gh);
  const ready = healthConnection === "ready" && Boolean(health);
  const unavailable = describeHealthError(healthError);

  let authText = "—";
  if (ready && gh && gh.status !== "ERROR") {
    authText = gh.authenticated ? "Authenticated" : "Unauthenticated";
  }

  return (
    <div className="page-stack">
      {/* Intro & action */}
      <div className="card-header" style={{ marginBottom: 0 }}>
        <p style={{ fontSize: 14, maxWidth: "62ch" }}>
          Check runtime connectivity, verify active providers, and review setup
          instructions.
        </p>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          isLoading={isRefreshing}
        >
          <Icon name="refresh" size={16} /> Refresh status
        </Button>
      </div>

      {healthConnection === "unavailable" && (
        <ErrorState
          title="Backend health check unavailable"
          message={`${unavailable.message}. Integration status cannot be determined until the API responds.`}
          code={unavailable.code}
          onRetry={handleRefresh}
        />
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* GitHub */}
        <section className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Icon name="github" size={16} /> GitHub API
            </h3>
            <StatusBadge status={githubStatus(gh, healthConnection)} />
          </div>
          <dl className="kv-list">
            <div className="kv-row">
              <dt>Auth token</dt>
              <dd>{authText}</dd>
            </div>
            <div className="kv-row">
              <dt>Remaining calls</dt>
              <dd>
                {rate
                  ? `${rate.remaining}${rate.limit != null ? ` / ${rate.limit}` : ""}`
                  : "—"}
              </dd>
            </div>
            <div className="kv-row">
              <dt>Resets at</dt>
              <dd>
                {ready && gh?.status !== "ERROR" && gh?.rateLimit?.resetsAt
                  ? new Date(gh.rateLimit.resetsAt).toLocaleTimeString()
                  : "—"}
              </dd>
            </div>
          </dl>
          {gh?.status === "ERROR" && gh.error && (
            <div
              className="callout callout-danger"
              role="note"
              style={{ marginTop: 12 }}
            >
              <Icon name="alert" size={16} />
              <span>GitHub check failed: {gh.error}</span>
            </div>
          )}
          <p
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            To increase rate limits, add <code>GITHUB_TOKEN=ghp_...</code> to
            your <code>.env</code> file.
          </p>
        </section>

        {/* AI providers */}
        <section className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Icon name="bot" size={16} /> AI providers
            </h3>
            <span className="badge badge-primary">
              Active:{" "}
              {ready && ai?.activeProvider
                ? ai.activeProvider.toUpperCase()
                : "—"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 13,
            }}
          >
            <div className="provider-box">
              <div
                className="integration-card-head"
                style={{ marginBottom: 6 }}
              >
                <strong>Google Gemini / Gemma</strong>
                <StatusBadge
                  status={providerStatus(gemini, healthConnection)}
                />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Model: {gemini?.model ? <code>{gemini.model}</code> : "—"}
              </span>
              {gemini?.message && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: 2,
                  }}
                >
                  {gemini.message}
                </span>
              )}
            </div>

            <div className="provider-box">
              <div
                className="integration-card-head"
                style={{ marginBottom: 6 }}
              >
                <strong>Ollama (local)</strong>
                <StatusBadge
                  status={providerStatus(ollama, healthConnection)}
                />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Host: {ollama?.host ? <code>{ollama.host}</code> : "—"} · Model:{" "}
                {ollama?.targetModel ? <code>{ollama.targetModel}</code> : "—"}
              </span>
              {ollama?.message && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: 2,
                  }}
                >
                  {ollama.message}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* MCP */}
      <section className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Icon name="plug" size={16} /> Model Context Protocol (MCP) client
          </h3>
          <StatusBadge status={mcpStatus(mcp, healthConnection)} />
        </div>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          OpenOrbit implements the official{" "}
          <code>@modelcontextprotocol/sdk</code> client with lifecycle
          management, registered tool definitions (
          <code>github_search_issues</code>,{" "}
          <code>github_get_issue_details</code>,{" "}
          <code>github_get_repo_readme</code>), and argument schema validation.
        </p>
        {mcp?.lastError && (
          <div
            className="callout callout-danger"
            role="note"
            style={{ marginBottom: 12 }}
          >
            <Icon name="alert" size={16} />
            <span>Last error: {mcp.lastError}</span>
          </div>
        )}

        <div className="code-block">
          <strong
            style={{
              color: "var(--text-primary)",
              display: "block",
              marginBottom: 6,
              fontFamily: "var(--font-sans)",
            }}
          >
            Connecting a live MCP server
          </strong>
          {`# In your .env file:
MCP_ENABLED=true
MCP_SERVER_COMMAND=npx
MCP_SERVER_ARGS='["-y", "@modelcontextprotocol/server-github"]'`}
        </div>
      </section>

      {/* Security */}
      <section
        className="callout callout-success"
        style={{ padding: "var(--space-lg)" }}
      >
        <Icon name="lock" size={18} />
        <div>
          <h3
            className="card-title"
            style={{ color: "var(--status-success)", marginBottom: 4 }}
          >
            Security & privacy boundary
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Environment secrets (e.g. <code>GEMINI_API_KEY</code>,{" "}
            <code>GITHUB_TOKEN</code>) are strictly isolated on the backend
            server. The client browser receives only non-sensitive telemetry and
            sanitized API responses.
          </p>
        </div>
      </section>
    </div>
  );
}
