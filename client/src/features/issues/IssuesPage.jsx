import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/apiClient.js";
import { IssueFilters } from "../../components/issues/IssueFilters.jsx";
import { IssueList } from "../../components/issues/IssueList.jsx";

export function IssuesPage({ selectedIssue, onSelectIssue, onOpenRepo }) {
  const [filters, setFilters] = useState({
    query: "",
    label: "good-first-issue",
    language: "",
  });

  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchIssues = useCallback(
    async (overrideFilters) => {
      const activeFilters = overrideFilters || filters;
      setIsLoading(true);
      setError(null);

      try {
        const res = await api.searchIssues(activeFilters);
        setIssues(res.data || []);
        setTotalCount(res.pagination?.totalCount || 0);
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
    fetchIssues();
  }, [fetchIssues]);

  return (
    <div>
      <p style={{ fontSize: 13, marginBottom: 16 }}>
        Real open-source issues fetched directly from GitHub, filtered by labels
        such as <code>good-first-issue</code> and <code>help wanted</code>.
      </p>

      <IssueFilters
        filters={filters}
        onChange={setFilters}
        onSearch={() => fetchIssues()}
        isLoading={isLoading}
      />

      <div className="card-header" style={{ marginBottom: 12 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Results
        </h2>
        {totalCount > 0 && !isLoading && !error && (
          <span className="badge badge-label">
            {totalCount.toLocaleString()} issues found
          </span>
        )}
      </div>

      <IssueList
        issues={issues}
        isLoading={isLoading}
        error={error}
        selectedIssue={selectedIssue}
        onSelectIssue={onSelectIssue}
        onOpenRepo={onOpenRepo}
        onRetry={() => fetchIssues()}
      />
    </div>
  );
}
