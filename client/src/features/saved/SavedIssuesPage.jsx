import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/apiClient.js";
import { Button } from "../../components/common/Button.jsx";
import { Icon } from "../../components/common/Icon.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";

const STATUS_OPTIONS = [
  { value: "all", label: "All Issues" },
  { value: "saved", label: "Backlog" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Archived" },
];

export function SavedIssuesPage({ onSelectIssueForPlan, onDiscoverMore }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [tempNotes, setTempNotes] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchSavedIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const res = await api.getSavedIssues(params);
      setIssues(res?.data?.savedIssues || []);
    } catch (err) {
      setError(err.message || "Failed to load saved issues.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSavedIssues();
  }, [fetchSavedIssues]);

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await api.updateSavedIssue(id, { status: newStatus });
      const updated = res?.data?.savedIssue;
      setIssues((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: updated?.status || newStatus } : item))
      );
    } catch (err) {
      alert(err.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (id) => {
    setUpdatingId(id);
    try {
      await api.updateSavedIssue(id, { notes: tempNotes });
      setIssues((prev) =>
        prev.map((item) => (item._id === id ? { ...item, notes: tempNotes } : item))
      );
      setEditingNotesId(null);
    } catch (err) {
      alert(err.message || "Failed to save notes.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this issue from your saved list?")) return;
    setUpdatingId(id);
    try {
      await api.deleteSavedIssue(id);
      setIssues((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete saved issue.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page-stack">
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            Saved Issues & Contribution Backlog
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            Track open-source issues you plan to contribute to, update progress, and attach implementation notes.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className="btn btn-secondary"
              style={{
                borderRadius: "var(--radius-full)",
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: statusFilter === opt.value ? "var(--accent-primary)" : "var(--bg-secondary)",
                color: statusFilter === opt.value ? "var(--text-on-accent)" : "var(--text-secondary)",
                borderColor: statusFilter === opt.value ? "var(--accent-primary)" : "var(--border-subtle)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-card" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <ErrorState
          title="Could not load saved issues"
          message={error}
          onRetry={fetchSavedIssues}
        />
      )}

      {/* Empty state */}
      {!loading && !error && issues.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "56px 24px",
            borderRadius: "var(--radius-xl)",
            backgroundColor: "var(--bg-secondary)",
            border: "1px dashed var(--border-medium)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: "var(--accent-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--accent-primary)",
            }}
          >
            <Icon name="bookmark" size={24} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            No saved issues in this view
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 24px" }}>
            Bookmark open-source issues from the Discover Issues explorer to organize your contribution backlog.
          </p>
          {onDiscoverMore && (
            <Button
              variant="primary"
              onClick={onDiscoverMore}
              style={{ borderRadius: "var(--radius-full)", padding: "10px 22px" }}
            >
              <Icon name="search" size={16} /> Explore Open Issues
            </Button>
          )}
        </div>
      )}

      {/* Issues list */}
      {!loading && !error && issues.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {issues.map((item) => {
            const isEditingNotes = editingNotesId === item._id;

            return (
              <div
                key={item._id}
                className="card"
                style={{
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span className="badge badge-primary" style={{ fontSize: 11, fontWeight: 600 }}>
                        {item.repository?.owner}/{item.repository?.name} #{item.number}
                      </span>
                      <span
                        className={`badge ${
                          item.status === "completed"
                            ? "badge-success"
                            : item.status === "in_progress"
                              ? "badge-warning"
                              : "badge-neutral"
                        }`}
                        style={{ fontSize: 11 }}
                      >
                        {item.status.replace("_", " ").toUpperCase()}
                      </span>
                      {item.language && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          • {item.language}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
                      <a
                        href={item.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {item.title}
                      </a>
                    </h3>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      className="input"
                      value={item.status}
                      disabled={updatingId === item._id}
                      onChange={(e) => handleUpdateStatus(item._id, e.target.value)}
                      style={{ fontSize: 12, padding: "4px 8px", height: 32 }}
                    >
                      <option value="saved">Backlog</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="dismissed">Archived</option>
                    </select>

                    {onSelectIssueForPlan && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          onSelectIssueForPlan({
                            number: item.number,
                            title: item.title,
                            html_url: item.htmlUrl,
                            repository_url: `https://api.github.com/repos/${item.repository?.owner}/${item.repository?.name}`,
                            repoOwner: item.repository?.owner,
                            repoName: item.repository?.name,
                          })
                        }
                        style={{ fontSize: 12, padding: "6px 12px", height: 32 }}
                      >
                        <Icon name="sparkle" size={14} /> Plan
                      </Button>
                    )}

                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleDelete(item._id)}
                      disabled={updatingId === item._id}
                      aria-label="Remove saved issue"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {/* Labels */}
                {Array.isArray(item.labels) && item.labels.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {item.labels.map((lbl, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {typeof lbl === "string" ? lbl : lbl.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes Section */}
                <div
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 14px",
                    border: "1px solid var(--border-subtle)",
                    fontSize: 13,
                  }}
                >
                  {isEditingNotes ? (
                    <div>
                      <textarea
                        className="input"
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        placeholder="Add private implementation notes or links..."
                        rows={3}
                        style={{ width: "100%", marginBottom: 8, fontSize: 13 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          variant="primary"
                          onClick={() => handleSaveNotes(item._id)}
                          isLoading={updatingId === item._id}
                          style={{ fontSize: 12, padding: "4px 10px", height: 28 }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditingNotesId(null)}
                          style={{ fontSize: 12, padding: "4px 10px", height: 28 }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: item.notes ? "var(--text-secondary)" : "var(--text-muted)", fontStyle: item.notes ? "normal" : "italic" }}>
                        {item.notes || "No notes attached. Click to add implementation notes."}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNotesId(item._id);
                          setTempNotes(item.notes || "");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--accent-primary)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: "2px 6px",
                        }}
                      >
                        {item.notes ? "Edit Notes" : "+ Add Note"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
