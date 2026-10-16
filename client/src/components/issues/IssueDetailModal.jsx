import { useState } from "react";
import { api } from "../../lib/apiClient.js";
import { Button } from "../common/Button.jsx";
import { Icon } from "../common/Icon.jsx";
import { formatDate } from "../../utils/formatters.js";

export function IssueDetailModal({
  issue,
  isOpen,
  onClose,
  onSelectForPlan,
  onOpenRepo,
}) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !issue) return null;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await api.analyzeIssue({
        issueTitle: issue.title,
        issueBody: issue.body || "",
        issueLabels: issue.labels?.map((l) => (typeof l === "string" ? l : l.name)) || [],
      });
      setAnalysis(res.data || res);
    } catch (err) {
      setAnalysisError(err.message || "Failed to analyze issue with Python AI service");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToBacklog = async () => {
    if (isSaving || isSaved) return;
    setIsSaving(true);
    try {
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
        labels: issue.labels?.map((l) => (typeof l === "string" ? l : l.name)) || [],
        state: issue.state || "open",
        bodySnippet: (issue.body || "").slice(0, 500),
      });
      setIsSaved(true);
    } catch (err) {
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(18, 22, 19, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 780,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-xl)",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-medium)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span className="badge badge-verified">
                #{issue.number}
              </span>
              {issue.repository?.fullName && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenRepo?.(issue.repository?.owner, issue.repository?.name);
                    onClose();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {issue.repository.fullName}
                </button>
              )}
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Opened {formatDate(issue.createdAt)} by @{issue.author}
              </span>
            </div>
            <h2
              id="issue-modal-title"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {issue.title}
            </h2>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close modal"
            style={{ color: "var(--text-muted)" }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Issue Labels */}
          {issue.labels?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {issue.labels.map((l) => {
                const name = typeof l === "string" ? l : l.name;
                return (
                  <span key={name} className="tag" style={{ fontSize: 11 }}>
                    {name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Issue Description Markdown */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
              Issue Description
            </h3>
            {issue.body ? (
              <div
                className="code-block"
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {issue.body}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                No description provided in this issue report.
              </p>
            )}
          </div>

          {/* Python AI Analysis Panel */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-primary)",
                  }}
                >
                  <Icon name="sparkle" size={15} />
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>
                    Python Intelligence Breakdown
                  </strong>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>
                    Automated categorization, problem isolation, and difficulty rating
                  </span>
                </div>
              </div>

              {!analysis && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleRunAnalysis}
                  isLoading={isAnalyzing}
                >
                  <Icon name="sparkle" size={14} /> Analyze Issue
                </Button>
              )}
            </div>

            {isAnalyzing && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                Synthesizing repository context and diagnosing issue complexity...
              </p>
            )}

            {analysisError && (
              <div className="callout callout-warning" style={{ fontSize: 12, padding: "8px 12px" }}>
                <Icon name="alert" size={14} />
                <span>{analysisError}</span>
              </div>
            )}

            {analysis && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span className="badge badge-primary">
                    Category: {analysis.issue_category || "General"}
                  </span>
                  <span className="badge badge-verified">
                    Difficulty: {analysis.difficulty_estimate || "Intermediate"}
                  </span>
                </div>

                {analysis.problem_statement && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                      PROBLEM STATEMENT:
                    </span>
                    <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 2, lineHeight: 1.5 }}>
                      {analysis.problem_statement}
                    </p>
                  </div>
                )}

                {analysis.recommended_approach && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                      RECOMMENDED APPROACH:
                    </span>
                    <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 2, lineHeight: 1.5 }}>
                      {analysis.recommended_approach}
                    </p>
                  </div>
                )}

                {analysis.suspected_components?.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                      SUSPECTED COMPONENTS:
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {analysis.suspected_components.map((comp, idx) => (
                        <code key={idx} style={{ fontSize: 12, padding: "2px 6px" }}>
                          {comp}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            backgroundColor: "var(--bg-elevated)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="secondary"
              onClick={handleSaveToBacklog}
              disabled={isSaving || isSaved}
              style={{ fontSize: 12 }}
            >
              <Icon name="bookmark" size={14} />
              {isSaved ? "Saved in backlog" : isSaving ? "Saving..." : "Save to backlog"}
            </Button>
            <a
              href={issue.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ fontSize: 12 }}
            >
              Open on GitHub <Icon name="external" size={12} />
            </a>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              onSelectForPlan?.(issue);
              onClose();
            }}
            style={{ fontSize: 13, borderRadius: "var(--radius-full)", padding: "8px 18px" }}
          >
            <Icon name="sparkle" size={15} /> Proceed to Contribution Planner →
          </Button>
        </div>
      </div>
    </div>
  );
}
