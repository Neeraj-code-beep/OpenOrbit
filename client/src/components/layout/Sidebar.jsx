import {
  activeProviderEntry,
  githubRate,
  overallStatus,
} from "../../utils/status.js";
import { Icon } from "../common/Icon.jsx";
import { NAV_GROUPS } from "./navigation.js";

const TONE_TEXT = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  neutral: "neutral",
  unconfigured: "warning",
};

export function Sidebar({
  currentTab,
  onSelectTab,
  health,
  healthConnection = "ready",
}) {
  const ai = health?.checks?.ai;
  const provider = activeProviderEntry(ai);
  const rate = githubRate(health?.checks?.github);
  const status = overallStatus(health, healthConnection);
  const tone = TONE_TEXT[status.tone] || "neutral";
  const hasData = healthConnection === "ready" && health;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img
          className="sidebar-logo"
          src="/favicon.svg"
          alt=""
          width="32"
          height="32"
        />
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

      <section className="sidebar-status" aria-label="System status">
        <div className="sidebar-status-head">
          <span className="sidebar-status-title">System Status</span>
          <span
            className={`sidebar-status-state status-text-${tone}`}
            role="status"
          >
            <span
              className={`status-dot${tone === "neutral" ? "" : ` is-${tone}`}${status.tone === "info" ? " pulsing" : ""}`}
              aria-hidden="true"
            />
            {status.label}
          </span>
        </div>
        <dl className="sidebar-status-rows">
          <div className="sidebar-status-row">
            <dt>Provider</dt>
            <dd>{hasData ? ai?.activeProvider || "Unknown" : "—"}</dd>
          </div>
          <div className="sidebar-status-row">
            <dt>AI</dt>
            <dd>
              {hasData
                ? (provider?.status || "Unknown")
                    .replace(/_/g, " ")
                    .toLowerCase()
                : "—"}
            </dd>
          </div>
          <div className="sidebar-status-row">
            <dt>GitHub rate</dt>
            <dd>
              {rate
                ? `${rate.remaining}${rate.limit != null ? `/${rate.limit}` : ""}`
                : "—"}
            </dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
