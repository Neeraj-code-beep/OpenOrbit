import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/apiClient.js";
import { IssueFilters } from "../../components/issues/IssueFilters.jsx";
import { IssueList } from "../../components/issues/IssueList.jsx";
import { IssueDetailModal } from "../../components/issues/IssueDetailModal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Icon } from "../../components/common/Icon.jsx";

const PAGE_SIZE = 15;

export function IssuesPage({ selectedIssue, onSelectIssue, onOpenRepo }) {
  const [filters, setFilters] = useState({
    query: "",
    label: "good-first-issue",
    language: "",
  });

  const [page, setPage] = useState(1);
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [inspectedIssue, setInspectedIssue] = useState(null);

  const fetchIssues = useCallback(
    async (overrideFilters, targetPage = 1) => {
      const activeFilters = overrideFilters || filters;
      setIsLoading(true);
      setError(null);

      try {
        const res = await api.searchIssues({
          ...activeFilters,
          page: targetPage,
          per_page: PAGE_SIZE,
        });
        setIssues(res.data || []);
        setTotalCount(res.pagination?.totalCount || 0);
        setPage(targetPage);
      } catch (err) {
        setError(err);
        setIssues([]);
      } finally {
        setIsLoading(false);
      }
    },
    [filters],
  );

  // Initial load
  useEffect(() => {
    fetchIssues(filters, 1);
  }, []);

  const totalPages = Math.min(67, Math.ceil(totalCount / PAGE_SIZE)) || 1; // GitHub limits search API to 1000 items (67 pages * 15)

  const handleNextPage = () => {
    if (page < totalPages && !isLoading) {
      fetchIssues(filters, page + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (page > 1 && !isLoading) {
      fetchIssues(filters, page - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, marginBottom: 16 }}>
        Real open-source issues fetched directly from GitHub, filtered by labels
        such as <code>good-first-issue</code> and <code>help wanted</code>.
      </p>

      <IssueFilters
        filters={filters}
        onChange={setFilters}
        onSearch={() => fetchIssues(filters, 1)}
        isLoading={isLoading}
      />

      <div className="card-header" style={{ marginBottom: 12 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Results
        </h2>
        {totalCount > 0 && !isLoading && !error && (
          <span className="badge badge-label">
            {totalCount.toLocaleString()} issues found · Page {page} of {totalPages}
          </span>
        )}
      </div>

      <IssueList
        issues={issues}
        isLoading={isLoading}
        error={error}
        selectedIssue={selectedIssue}
        onSelectIssue={onSelectIssue}
        onInspectIssue={(issue) => setInspectedIssue(issue)}
        onOpenRepo={onOpenRepo}
        onRetry={() => fetchIssues(filters, page)}
      />

      {/* Pagination Bar */}
      {totalCount > PAGE_SIZE && !isLoading && !error && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
            padding: "16px 20px",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Button
            variant="secondary"
            onClick={handlePrevPage}
            disabled={page <= 1}
            style={{ fontSize: 13 }}
          >
            ← Previous
          </Button>

          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
            Page {page} of {totalPages}
          </span>

          <Button
            variant="secondary"
            onClick={handleNextPage}
            disabled={page >= totalPages}
            style={{ fontSize: 13 }}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Issue Detail & Python Analysis Modal */}
      {inspectedIssue && (
        <IssueDetailModal
          issue={inspectedIssue}
          isOpen={Boolean(inspectedIssue)}
          onClose={() => setInspectedIssue(null)}
          onSelectForPlan={(issue) => {
            onSelectIssue?.(issue);
            setInspectedIssue(null);
          }}
          onOpenRepo={onOpenRepo}
        />
      )}
    </div>
  );
}

