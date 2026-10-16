import { useState } from "react";
import { formatDate, truncateText } from "../../utils/formatters.js";
import { Button } from "../common/Button.jsx";
import { Icon } from "../common/Icon.jsx";
import { api } from "../../lib/apiClient.js";

// GitHub label colors are 6-digit hex; anything else falls back to neutral.
function labelDotColor(color) {
  return /^[0-9a-fA-F]{6}$/.test(color || "") ? `#${color}` : undefined;
}

export function IssueCard({ issue, isSelected, onSelect, onOpenRepo }) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!issue) return null;

  const handleToggleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!isSaved) {
        await api.saveIssue({
          issueId: String(issue.id || issue.number),
          number: issue.number,
          title: issue.title,
          htmlUrl: issue.htmlUrl,
          repository: {
            owner: issue.repository?.owner || "unknown",
            name: issue.repository?.name || "unknown",
            fullName: issue.repository?.fullName,
          },
          labels: issue.labels?.map((l) => l.name) || [],
          state: issue.state || "open",
        });
        setIsSaved(true);
      }
    } catch (err) {
      // If already saved (409), treat as saved
      if (err.status === 409 || err.code === "ISSUE_ALREADY_SAVED") {
        setIsSaved(true);
      } else {
        alert(err.message || "Failed to save issue.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className={`card issue-card${isSelected ? " is-selected" : ""}`}>
      <div className="issue-card-top">
        <div className="issue-card-main">
          <button
            type="button"
            className="issue-card-repo"
            onClick={() =>
              onOpenRepo?.(issue.repository?.owner, issue.repository?.name)
            }
            title="Inspect this repository"
          >
            <Icon name="repository" size={14} />
            {issue.repository?.fullName || "Repository"}
          </button>
          <h3 className="issue-card-title">
            <a href={issue.htmlUrl} target="_blank" rel="noreferrer">
              <span className="issue-card-number">#{issue.number}</span>{" "}
              {issue.title}
            </a>
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className={`btn-icon ${isSaved ? "is-saved" : ""}`}
            onClick={handleToggleSave}
            disabled={isSaving}
            title={isSaved ? "Saved in backlog" : "Save issue to backlog"}
            aria-label={isSaved ? "Issue is saved" : "Save issue"}
            style={{
              color: isSaved ? "var(--status-success)" : "var(--text-muted)",
              padding: "6px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: isSaved ? "var(--status-success-bg)" : "transparent",
              border: isSaved ? "1px solid var(--status-success-border)" : "1px solid var(--border-subtle)",
            }}
          >
            <Icon name="bookmark" size={15} />
          </button>

          <a
            href={issue.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            title="Open in GitHub"
            aria-label={`Open issue #${issue.number} on GitHub (opens in a new tab)`}
          >
            GitHub <Icon name="external" size={14} />
          </a>
        </div>
      </div>

      {issue.body && (
        <p className="issue-card-body">{truncateText(issue.body, 160)}</p>
      )}

      {issue.labels?.length > 0 && (
        <div className="issue-card-tags">
          {issue.labels.map((label) => (
            <span key={label.name} className="tag">
              <span
                className="tag-dot"
                style={{ background: labelDotColor(label.color) }}
                aria-hidden="true"
              />
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="issue-card-footer">
        <div className="issue-card-meta">
          <span>
            Opened {formatDate(issue.createdAt)} by @{issue.author}
          </span>
          {issue.commentsCount > 0 && (
            <span>{issue.commentsCount} comments</span>
          )}
        </div>

        <Button
          size="sm"
          variant={isSelected ? "secondary" : "primary"}
          onClick={() => onSelect(issue)}
          aria-pressed={isSelected}
        >
          {isSelected ? (
            <>
              <Icon name="check" size={14} /> Selected
            </>
          ) : (
            "Analyze & plan →"
          )}
        </Button>
      </div>
    </article>
  );
}
