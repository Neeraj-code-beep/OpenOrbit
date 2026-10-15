import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient.js';
import { IssueFilters } from '../../components/issues/IssueFilters.jsx';
import { IssueList } from '../../components/issues/IssueList.jsx';

export function IssuesPage({ selectedIssue, onSelectIssue, onOpenRepo }) {
  const [filters, setFilters] = useState({
    query: '',
    label: 'good-first-issue',
    language: '',
  });

  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchIssues = useCallback(async (overrideFilters) => {
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
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0 }}>Discover Beginner-Friendly Issues</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Real open-source issues fetched directly from GitHub with <code>good-first-issue</code> and <code>help wanted</code> labels.
          </p>
        </div>

        {totalCount > 0 && !isLoading && (
          <span className="badge badge-label">
            Found {totalCount.toLocaleString()} issues
          </span>
        )}
      </div>

      <IssueFilters
        filters={filters}
        onChange={setFilters}
        onSearch={() => fetchIssues()}
        isLoading={isLoading}
      />

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
