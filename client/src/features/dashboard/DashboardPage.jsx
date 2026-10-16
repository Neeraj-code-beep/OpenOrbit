import { useState, useEffect } from "react";
import { Button } from "../../components/common/Button.jsx";
import { Icon } from "../../components/common/Icon.jsx";
import { useAuth } from "../../lib/useAuth.js";
import { api } from "../../lib/apiClient.js";

export function DashboardPage({
  onNavigate,
  selectedIssue,
  onSelectIssue,
}) {
  const { user } = useAuth();
  const [savedStats, setSavedStats] = useState({ total: 0, inProgress: 0, completed: 0, backlog: 0 });
  const [recentSaved, setRecentSaved] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    async function loadWorkspaceData() {
      setLoadingData(true);
      try {
        const [savedRes, recRes] = await Promise.allSettled([
          api.getSavedIssues(),
          api.getRecommendations(),
        ]);

        if (isCurrent && savedRes.status === "fulfilled") {
          const list = savedRes.value?.data?.savedIssues || [];
          setRecentSaved(list.slice(0, 3));
          setSavedStats({
            total: list.length,
            inProgress: list.filter((i) => i.status === "in_progress").length,
            completed: list.filter((i) => i.status === "completed").length,
            backlog: list.filter((i) => i.status === "saved").length,
          });
        }

        if (isCurrent && recRes.status === "fulfilled") {
          const recs = recRes.value?.data?.recommendations || [];
          setRecommendations(recs.slice(0, 3));
        }
      } finally {
        if (isCurrent) setLoadingData(false);
      }
    }

    loadWorkspaceData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const isGitHubConnected = Boolean(user?.githubUsername || user?.githubId);

  return (
    <div className="page-stack">
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          padding: "var(--space-xl)",
          borderRadius: "var(--radius-xl)",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-medium)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: "var(--radius-full)", backgroundColor: "var(--accent-subtle)", border: "1px solid var(--accent-subtle-border)", marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--accent-primary)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-primary)" }}>
              Workspace Overview
            </span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Welcome back, {user?.name || "Contributor"}
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.6 }}>
            Track saved issues, inspect verified repositories, and generate structured AI blueprints for your next pull request.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="primary" onClick={() => onNavigate("issues")} style={{ borderRadius: "var(--radius-full)", padding: "10px 20px" }}>
            <Icon name="search" size={16} /> Discover Issues
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("contribution")} style={{ borderRadius: "var(--radius-full)", padding: "10px 18px" }}>
            <Icon name="sparkle" size={16} /> Open Planner
          </Button>
        </div>
      </div>

      {/* Active Selected Issue Banner */}
      {selectedIssue && (
        <div
          className="card"
          style={{
            backgroundColor: "var(--bg-card-sage)",
            border: "1px solid var(--accent-subtle-border)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="badge badge-primary">Active Issue</span>
            <div>
              <strong style={{ fontSize: 14, color: "var(--text-primary)" }}>
                #{selectedIssue.number} {selectedIssue.title}
              </strong>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block" }}>
                {selectedIssue.repoOwner || selectedIssue.repository?.owner}/{selectedIssue.repoName || selectedIssue.repository?.name}
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => onNavigate("contribution")}
            style={{ fontSize: 13 }}
          >
            Resume Contribution Plan →
          </Button>
        </div>
      )}

      {loadingData && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <span className="status-dot pulsing" />
          <span>Synchronizing workspace backlog & recommendations...</span>
        </div>
      )}

      {/* GitHub Onboarding Alert if not connected */}
      {!isGitHubConnected && (
        <div
          className="card"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px dashed var(--border-medium)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)" }}>
              <Icon name="github" size={18} />
            </div>
            <div>
              <strong style={{ fontSize: 14, color: "var(--text-primary)" }}>
                Connect your GitHub account
              </strong>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                Link your account to unlock 5,000 req/hr rate limits and search your repositories directly.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => onNavigate("settings")} style={{ fontSize: 13 }}>
            Connect in Settings <Icon name="arrowRight" size={14} />
          </Button>
        </div>
      )}

      {/* FlowGrid-inspired Modular Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {/* Metric Card 1: Saved Issues Summary */}
        <div
          className="card"
          style={{
            padding: "24px",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
                SAVED BACKLOG
              </span>
              <Icon name="bookmark" size={18} style={{ color: "var(--text-muted)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                {savedStats.total}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>total saved</span>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "var(--status-warning)" }}>
              ● {savedStats.inProgress} in progress
            </span>
            <span style={{ color: "var(--status-success)" }}>
              ● {savedStats.completed} completed
            </span>
            <button
              type="button"
              onClick={() => onNavigate("saved")}
              style={{ background: "none", border: "none", color: "var(--accent-primary)", fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              View all →
            </button>
          </div>
        </div>

        {/* Metric Card 2: Deep Forest Green Quick Launch (Image 2 style) */}
        <div
          className="card"
          style={{
            padding: "24px",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--bg-card-forest)",
            color: "#FFFFFF",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-lime)" }}>
                AI WORKSPACE
              </span>
              <Icon name="sparkle" size={18} style={{ color: "var(--accent-lime)" }} />
            </div>
            <strong style={{ fontSize: 20, fontWeight: 700, display: "block", marginBottom: 6 }}>
              Contribution Blueprints
            </strong>
            <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
              Generate concrete file targets, implementation steps, and PR descriptions grounded in repository facts.
            </p>
          </div>

          <div style={{ marginTop: 20 }}>
            <Button
              variant="primary"
              onClick={() => onNavigate("contribution")}
              style={{
                backgroundColor: "var(--accent-lime)",
                color: "var(--accent-forest)",
                fontWeight: 700,
                width: "100%",
                borderRadius: "var(--radius-full)",
              }}
            >
              Open Planner <Icon name="arrowRight" size={14} />
            </Button>
          </div>
        </div>

        {/* Metric Card 3: Account & Rate Status */}
        <div
          className="card"
          style={{
            padding: "24px",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--bg-card-sage)",
            border: "1px solid var(--accent-subtle-border)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-primary)" }}>
                GITHUB STATUS
              </span>
              <Icon name="github" size={18} style={{ color: "var(--accent-primary)" }} />
            </div>
            <strong style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
              {isGitHubConnected ? `@${user?.githubUsername}` : "Unconnected"}
            </strong>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {isGitHubConnected
                ? "Active GitHub session. Authenticated queries enabled."
                : "Standard rate limit active. Link account in Settings for full quotas."}
            </p>
          </div>

          <div style={{ marginTop: 20 }}>
            <Button
              variant="secondary"
              onClick={() => onNavigate("settings")}
              style={{
                backgroundColor: "#FFFFFF",
                width: "100%",
                borderRadius: "var(--radius-full)",
                borderColor: "var(--border-medium)",
              }}
            >
              Manage Connection
            </Button>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Active/Saved Issues & Recommended Issues */}
      <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
        {/* Left Column: Recent Backlog */}
        <section className="card" style={{ padding: "var(--space-lg)" }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>
              <Icon name="bookmark" size={16} /> Saved Contribution Backlog
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("saved")}
              style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              View all ({savedStats.total})
            </button>
          </div>

          {recentSaved.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 16px" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
                No issues saved yet. Bookmark issues from the discovery explorer to track them here.
              </p>
              <Button variant="secondary" onClick={() => onNavigate("issues")} style={{ fontSize: 12 }}>
                <Icon name="search" size={14} /> Browse Issues
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recentSaved.map((item) => (
                <div
                  key={item._id}
                  style={{
                    padding: "12px 14px",
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>
                      {item.repository?.owner}/{item.repository?.name} #{item.number}
                    </span>
                    <strong style={{ fontSize: 14, color: "var(--text-primary)", display: "block", marginTop: 2 }}>
                      {item.title}
                    </strong>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onSelectIssue?.({
                        number: item.number,
                        title: item.title,
                        html_url: item.htmlUrl,
                        repository_url: `https://api.github.com/repos/${item.repository?.owner}/${item.repository?.name}`,
                        repoOwner: item.repository?.owner,
                        repoName: item.repository?.name,
                      });
                      onNavigate("contribution");
                    }}
                    style={{ fontSize: 12, padding: "4px 10px", height: 28 }}
                  >
                    Plan →
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Recommendations or Active Issue */}
        <section className="card" style={{ padding: "var(--space-lg)" }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>
              <Icon name="sparkle" size={16} /> Recommended For You
            </h3>
            <span className="badge badge-primary" style={{ fontSize: 11 }}>
              Personalized
            </span>
          </div>

          {recommendations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 16px" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
                Recommendations are derived from your saved issues and preferred technologies.
              </p>
              <Button variant="secondary" onClick={() => onNavigate("issues")} style={{ fontSize: 12 }}>
                <Icon name="issues" size={14} /> Explore Good First Issues
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    padding: "12px 14px",
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <span style={{ fontSize: 11, color: "var(--accent-primary)", fontWeight: 600, display: "block" }}>
                      {rec.repo} #{rec.number}
                    </span>
                    <strong style={{ fontSize: 14, color: "var(--text-primary)", display: "block", marginTop: 2 }}>
                      {rec.title}
                    </strong>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const [owner, name] = (rec.repo || "").split("/");
                      onSelectIssue?.({
                        number: rec.number,
                        title: rec.title,
                        html_url: rec.html_url,
                        repository_url: `https://api.github.com/repos/${owner}/${name}`,
                        repoOwner: owner,
                        repoName: name,
                      });
                      onNavigate("contribution");
                    }}
                    style={{ fontSize: 12, padding: "4px 10px", height: 28 }}
                  >
                    Plan →
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
