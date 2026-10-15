import { Button } from "../../components/common/Button.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { Icon } from "../../components/common/Icon.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import {
  activeProviderEntry,
  describeHealthError,
  githubRate,
  githubStatus,
  mcpStatus,
  providerStatus,
} from "../../utils/status.js";

export function DashboardPage({
  health,
  healthConnection = "ready",
  healthError,
  onRetryHealth,
  onNavigate,
  selectedIssue,
}) {
  const gh = health?.checks?.github;
  const ai = health?.checks?.ai;
  const mcp = health?.checks?.mcp;
  const provider = activeProviderEntry(ai);
  const rate = githubRate(gh);
  const ready = healthConnection === "ready" && Boolean(health);
  const modelName = provider?.model || provider?.targetModel;

  const ghStatus = githubStatus(gh, healthConnection);
  const aiStatus = providerStatus(provider, healthConnection);
  const mcpState = mcpStatus(mcp, healthConnection);
  const unavailable = describeHealthError(healthError);

  return (
    <div className="page-stack">
      {/* Welcome / primary actions */}
      <div className="card hero">
        <div style={{ maxWidth: 760 }}>
          <span className="badge badge-primary">
            Open Source Contribution Assistant
          </span>
          <h2 className="hero-title">
            Bridge the gap between discovering an issue and submitting a
            high-quality Pull Request.
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            OpenOrbit uses real GitHub data and bounded AI planning to help you
            understand unfamiliar repositories, isolate target files, draft
            implementation strategies, and craft clean PR descriptions—keeping
            you in complete control.
          </p>
          <div className="row-wrap" style={{ gap: 10 }}>
            <Button variant="primary" onClick={() => onNavigate("issues")}>
              <Icon name="issues" size={16} /> Discover real issues
            </Button>
            <Button
              variant="secondary"
              onClick={() => onNavigate("repository")}
            >
              <Icon name="repository" size={16} /> Inspect a repository
            </Button>
            {selectedIssue && (
              <Button
                variant="secondary"
                onClick={() => onNavigate("contribution")}
              >
                <Icon name="contribution" size={16} /> Active plan (#
                {selectedIssue.number})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Live integration status */}
      <section aria-labelledby="integrations-heading">
        <h3 id="integrations-heading" className="section-title">
          Service integrations · live status
        </h3>

        {healthConnection === "unavailable" && (
          <div style={{ marginBottom: 16 }}>
            <ErrorState
              title="Backend health check unavailable"
              message={`${unavailable.message}. Integration status cannot be determined until the API responds.`}
              code={unavailable.code}
              onRetry={onRetryHealth}
            />
          </div>
        )}

        <div className="grid-3">
          {/* GitHub Status */}
          <div className="card integration-card">
            <div className="integration-card-head">
              <span className="integration-icon">
                <Icon name="github" size={18} />
              </span>
              <StatusBadge status={ghStatus} />
            </div>
            <h4 className="integration-card-title">GitHub REST API</h4>
            <p className="integration-card-line">
              Remaining calls:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {rate
                  ? `${rate.remaining}${rate.limit != null ? ` / ${rate.limit}` : ""}`
                  : "—"}
              </strong>
            </p>
            <span className="integration-card-note">
              {gh?.status === "ERROR" && gh.error
                ? `GitHub check failed: ${gh.error}`
                : ready && gh
                  ? gh.authenticated
                    ? "Authenticated with GITHUB_TOKEN"
                    : "No GITHUB_TOKEN detected; public rate limits apply"
                  : "No GitHub data received"}
            </span>
          </div>

          {/* AI Provider Status */}
          <div className="card integration-card">
            <div className="integration-card-head">
              <span className="integration-icon">
                <Icon name="bot" size={18} />
              </span>
              <StatusBadge status={aiStatus} />
            </div>
            <h4 className="integration-card-title">
              AI Provider
              {ready && ai?.activeProvider
                ? ` (${ai.activeProvider.toUpperCase()})`
                : ""}
            </h4>
            <p className="integration-card-line">
              Model: {modelName ? <code>{modelName}</code> : <strong>—</strong>}
            </p>
            <span className="integration-card-note">
              {provider?.message ||
                (ready && provider
                  ? "Provider reported no additional details"
                  : "No AI provider data received")}
            </span>
          </div>

          {/* MCP Integration Status */}
          <div className="card integration-card">
            <div className="integration-card-head">
              <span className="integration-icon">
                <Icon name="plug" size={18} />
              </span>
              <StatusBadge status={mcpState} />
            </div>
            <h4 className="integration-card-title">MCP Client Layer</h4>
            <p className="integration-card-line">
              Tools registered:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {mcp?.registeredToolsCount ?? "—"}
              </strong>
            </p>
            <span className="integration-card-note">
              {mcp?.lastError
                ? `Last error: ${mcp.lastError}`
                : mcp?.instructions ||
                  (ready && mcp
                    ? "MCP status reported by backend"
                    : "No MCP data received")}
            </span>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="card" aria-labelledby="principles-heading">
        <div className="card-header">
          <h3 id="principles-heading" className="card-title">
            <Icon name="lock" size={16} /> How OpenOrbit works
          </h3>
        </div>
        <div className="grid-3">
          <div className="principle">
            <strong>1. Real GitHub facts</strong>
            All issue descriptions, repository stars, and branches come from
            verified GitHub REST endpoints.
          </div>
          <div className="principle">
            <strong>2. Contained prompt safety</strong>
            Untrusted issue descriptions are isolated inside XML boundaries to
            prevent prompt injections.
          </div>
          <div className="principle">
            <strong>3. Human authority</strong>
            AI provides recommendations and draft plans. You make all file edits
            and retain full control over git commits.
          </div>
        </div>
      </section>
    </div>
  );
}
