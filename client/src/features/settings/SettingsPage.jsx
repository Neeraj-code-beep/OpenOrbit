import { useState } from "react";
import { Button } from "../../components/common/Button.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { Icon } from "../../components/common/Icon.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { useAuth } from "../../lib/useAuth.js";
import { api } from "../../lib/apiClient.js";
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
  const { user, reauthenticate, unlinkGitHub, authNotice, authError, clearAuthNotice, clearAuthError } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isReauthing, setIsReauthing] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshHealth?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isGitHubConnected = Boolean(user?.githubUsername || user?.githubId);

  const handleStartConnect = () => {
    setPasswordError("");
    setActionError(null);
    setShowPasswordPrompt(true);
  };

  const handleConfirmPasswordAndConnect = async (e) => {
    e.preventDefault();
    if (!password) {
      setPasswordError("Please enter your account password to authorize linking.");
      return;
    }

    setIsReauthing(true);
    setPasswordError("");
    try {
      const ticket = await reauthenticate(password);
      if (!ticket) {
        throw new Error("Could not acquire authorization ticket. Please try again.");
      }
      // Redirect to backend OAuth linking route with ticket
      const linkUrl = api.getGitHubLinkUrl({ ticket, redirectTo: "/settings" });
      window.location.href = linkUrl;
    } catch (err) {
      setPasswordError(
        err.status === 401
          ? "Incorrect password. Please verify and try again."
          : err.message || "Failed to authorize linking. Please try again."
      );
      setIsReauthing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect your GitHub account? You can reconnect anytime.")) {
      return;
    }

    setIsUnlinking(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await unlinkGitHub();
      setActionNotice("GitHub account disconnected successfully.");
    } catch (err) {
      setActionError(err.message || "Failed to disconnect GitHub account.");
    } finally {
      setIsUnlinking(false);
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

  return (
    <div className="page-stack">
      {/* Notices */}
      {(authNotice || actionNotice) && (
        <div className="callout callout-success" role="status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="checkCircle" size={18} />
            <span>{actionNotice || authNotice}</span>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={() => {
              setActionNotice(null);
              clearAuthNotice();
            }}
            aria-label="Dismiss notice"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {(authError || actionError) && (
        <div className="callout callout-danger" role="alert" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="alert" size={18} />
            <span>{actionError || authError}</span>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={() => {
              setActionError(null);
              clearAuthError();
            }}
            aria-label="Dismiss error"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Account Profile Section */}
      <section className="card" style={{ padding: "var(--space-lg)" }}>
        <div className="card-header" style={{ marginBottom: "var(--space-md)" }}>
          <div>
            <h2 className="card-title" style={{ fontSize: 18 }}>
              <Icon name="user" size={18} /> Account Profile
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
              Manage your personal credentials and linked identities.
            </p>
          </div>
        </div>

        <div className="grid-2" style={{ gap: "var(--space-md)" }}>
          <div className="provider-box">
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Full Name
            </span>
            <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>
              {user?.name || "OpenOrbit Contributor"}
            </strong>
          </div>
          <div className="provider-box">
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Email Address
            </span>
            <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>
              {user?.email || "—"}
            </strong>
          </div>
        </div>
      </section>

      {/* GitHub Integration Connection Section */}
      <section className="card" style={{ padding: "var(--space-lg)" }}>
        <div className="card-header" style={{ marginBottom: "var(--space-md)" }}>
          <div>
            <h2 className="card-title" style={{ fontSize: 18 }}>
              <Icon name="github" size={18} /> GitHub Connection & Identity
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
              Authorize OpenOrbit to access your repositories, search issues, and submit contribution workflows.
            </p>
          </div>
          <span
            className={`badge ${isGitHubConnected ? "badge-success" : "badge-neutral"}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Icon name={isGitHubConnected ? "checkCircle" : "info"} size={13} />
            {isGitHubConnected ? "Connected" : "Not connected"}
          </span>
        </div>

        {isGitHubConnected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-md)",
                padding: "var(--space-md)",
                backgroundColor: "var(--bg-elevated)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {user?.githubAvatarUrl ? (
                <img
                  src={user.githubAvatarUrl}
                  alt={user.githubUsername || "GitHub User"}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "2px solid var(--border-medium)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="github" size={24} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 16, color: "var(--text-primary)" }}>
                    @{user?.githubUsername}
                  </strong>
                  <span className="badge badge-primary" style={{ fontSize: 11 }}>Active</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  GitHub identity securely linked to your OpenOrbit session. High-rate API quotas active.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleDisconnect}
                isLoading={isUnlinking}
                style={{ color: "var(--status-danger)", borderColor: "var(--status-danger-border)" }}
              >
                <Icon name="unlink" size={15} /> Disconnect GitHub
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Connecting your GitHub account grants OpenOrbit permission to search your repositories, inspect active PRs, retrieve file context for AI planning, and unlock authenticated 5,000 req/hr GitHub API quotas.
            </p>

            {!showPasswordPrompt ? (
              <div>
                <Button
                  variant="primary"
                  onClick={handleStartConnect}
                  style={{
                    backgroundColor: "var(--accent-primary)",
                    color: "var(--text-on-accent)",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icon name="github" size={16} /> Connect GitHub Account
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleConfirmPasswordAndConnect}
                style={{
                  padding: "var(--space-md)",
                  backgroundColor: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-medium)",
                  maxWidth: 480,
                }}
              >
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
                  Confirm Password to Authorize GitHub
                </h4>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  For security, enter your OpenOrbit account password to authorize linking your external GitHub identity.
                </p>

                <div style={{ marginBottom: 12 }}>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    style={{ width: "100%" }}
                  />
                  {passwordError && (
                    <span style={{ fontSize: 12, color: "var(--status-danger)", display: "block", marginTop: 4 }}>
                      {passwordError}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isReauthing}
                    style={{ backgroundColor: "var(--accent-primary)", color: "#fff" }}
                  >
                    Authorize & Redirect to GitHub
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordPrompt(false);
                      setPassword("");
                      setPasswordError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Runtime Connectivity & Health Diagnostics */}
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <h3 className="card-title" style={{ fontSize: 16 }}>
            <Icon name="zap" size={16} /> Backend Runtime Status
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Inspect runtime connectivity, verify active AI providers, and review MCP client status.
          </p>
        </div>
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
        {/* GitHub API Telemetry */}
        <section className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Icon name="github" size={16} /> GitHub API Rate Limits
            </h3>
            <StatusBadge status={githubStatus(gh, healthConnection)} />
          </div>
          <dl className="kv-list">
            <div className="kv-row">
              <dt>Authentication</dt>
              <dd>
                {ready && gh && gh.status !== "ERROR"
                  ? gh.authenticated ? "Authenticated (5,000/hr)" : "Unauthenticated (60/hr)"
                  : "—"}
              </dd>
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
        </section>

        {/* AI Providers */}
        <section className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Icon name="bot" size={16} /> AI Providers
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
            </div>

            <div className="provider-box">
              <div
                className="integration-card-head"
                style={{ marginBottom: 6 }}
              >
                <strong>Ollama (Local Fallback)</strong>
                <StatusBadge
                  status={providerStatus(ollama, healthConnection)}
                />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Host: {ollama?.host ? <code>{ollama.host}</code> : "—"} · Model:{" "}
                {ollama?.targetModel ? <code>{ollama.targetModel}</code> : "—"}
              </span>
            </div>

            <div className="provider-box">
              <div
                className="integration-card-head"
                style={{ marginBottom: 6 }}
              >
                <strong>Python AI Intelligence Service</strong>
                <span className={`badge ${health?.checks?.pythonAiService?.status === "AVAILABLE" ? "badge-success" : "badge-neutral"}`}>
                  {health?.checks?.pythonAiService?.status || "STANDBY"}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Service URL: {health?.checks?.pythonAiService?.url ? <code>{health.checks.pythonAiService.url}</code> : <code>http://127.0.0.1:8000</code>} · Architecture & AST analysis
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Model Context Protocol (MCP) */}
      <section className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Icon name="plug" size={16} /> Model Context Protocol (MCP) Client
          </h3>
          <StatusBadge status={mcpStatus(mcp, healthConnection)} />
        </div>
        <p style={{ fontSize: 13, marginBottom: 12, color: "var(--text-secondary)" }}>
          Official <code>@modelcontextprotocol/sdk</code> client with registered tools (<code>github_search_issues</code>, <code>github_get_issue_details</code>, <code>github_get_repo_readme</code>) and argument schema verification.
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
      </section>

      {/* Security Boundary */}
      <section
        className="callout callout-success"
        style={{ padding: "var(--space-md) var(--space-lg)", display: "flex", alignItems: "center", gap: 12 }}
      >
        <Icon name="shield" size={20} />
        <div>
          <strong style={{ color: "var(--status-success)", fontSize: 14 }}>
            Security & Zero-Exposure Boundary
          </strong>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            OAuth credentials and server API tokens are strictly encrypted and isolated on the backend server. The client browser only handles secure HTTP-only sessions.
          </p>
        </div>
      </section>
    </div>
  );
}
