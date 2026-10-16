import { overallStatus } from "../../utils/status.js";
import { Icon } from "../common/Icon.jsx";
import { NAV_GROUPS } from "./navigation.js";
import { useAuth } from "../../lib/useAuth.js";

export function Sidebar({
  currentTab,
  onSelectTab,
  health,
  healthConnection = "ready",
}) {
  const { user } = useAuth();
  const status = overallStatus(health, healthConnection);
  const isHealthy = status.tone === "success" || status.tone === "info" || healthConnection === "ready";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
          }}
        >
          <Icon name="sparkle" size={18} />
        </div>
        <div>
          <p className="sidebar-title">OpenOrbit</p>
          <span className="sidebar-tagline">Contribution Assistant</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-group-label">{group.label}</p>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="nav-item"
                onClick={() => onSelectTab(item.id)}
                aria-current={currentTab === item.id ? "page" : undefined}
              >
                <Icon name={item.icon} size={18} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User Session & System Health Widget */}
      <section className="sidebar-status" aria-label="Account and system status">
        <div className="sidebar-status-head">
          <span className="sidebar-status-title">System Status</span>
          <span className="sidebar-status-state" style={{ color: "var(--status-success)" }}>
            <span
              className={`status-dot ${isHealthy ? "is-success" : "is-warning"}`}
              aria-hidden="true"
            />
            {isHealthy ? "Operational" : status.label}
          </span>
        </div>

        {user && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: "var(--accent-primary)",
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name || "Contributor"}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>
                {user.githubConnected ? `@${user.githubUsername}` : "Local Account"}
              </span>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
