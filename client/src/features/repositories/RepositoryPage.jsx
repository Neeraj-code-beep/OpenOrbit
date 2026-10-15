import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient.js';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { LoadingState } from '../../components/common/LoadingState.jsx';
import { ErrorState } from '../../components/common/ErrorState.jsx';
import { formatNumber } from '../../utils/formatters.js';

export function RepositoryPage({ targetRepo, onSearchRepoIssues }) {
  const [repoInput, setRepoInput] = useState(targetRepo ? `${targetRepo.owner}/${targetRepo.name}` : 'expressjs/express');
  const [repository, setRepository] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRepo = useCallback(async (fullPath) => {
    const parts = (fullPath || repoInput).trim().split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError(new Error('Please enter a valid repository format: "owner/repo" (e.g. facebook/react)'));
      return;
    }

    const [owner, repo] = parts;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.getRepository(owner, repo);
      setRepository(res.data);
    } catch (err) {
      setError(err);
      setRepository(null);
    } finally {
      setIsLoading(false);
    }
  }, [repoInput]);

  useEffect(() => {
    if (targetRepo?.owner && targetRepo?.name) {
      const full = `${targetRepo.owner}/${targetRepo.name}`;
      setRepoInput(full);
      fetchRepo(full);
    } else {
      fetchRepo('expressjs/express');
    }
  }, [targetRepo, fetchRepo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Search Bar */}
      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchRepo();
          }}
          style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <Input
              label="Inspect GitHub Repository (owner/repo)"
              placeholder="e.g. facebook/react or expressjs/express"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Inspect Repository 🔎
          </Button>
        </form>
      </div>

      {isLoading && <LoadingState message="Fetching verified repository context..." />}

      {error && (
        <ErrorState
          title="Repository Lookup Failed"
          message={error.message}
          code={error.code}
          onRetry={() => fetchRepo()}
        />
      )}

      {repository && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Main Repo Card */}
          <div className="card" style={{ borderColor: 'var(--border-medium)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="badge badge-verified">Verified GitHub Repo</span>
                  <span className="badge badge-label">{repository.language}</span>
                  {repository.isArchived && <span className="badge badge-suggested">Archived</span>}
                </div>
                <h2 style={{ fontSize: 22, margin: 0 }}>
                  <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
                    {repository.fullName}
                  </a>
                </h2>
                <p style={{ marginTop: 6, fontSize: 14 }}>
                  {repository.description || 'No description provided by maintainers.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="primary"
                  onClick={() => onSearchRepoIssues?.(repository.owner, repository.name)}
                >
                  Find Issues in this Repo →
                </Button>
                <a
                  href={repository.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  GitHub ↗
                </a>
              </div>
            </div>

            {/* Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stars</span>
                <p style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0 0' }}>★ {formatNumber(repository.starsCount)}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Forks</span>
                <p style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0 0' }}>🍴 {formatNumber(repository.forksCount)}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Open Issues</span>
                <p style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0 0' }}>🎯 {formatNumber(repository.openIssuesCount)}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>License</span>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0 0' }}>📜 {repository.license}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Default Branch</span>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0 0' }}>🌿 {repository.defaultBranch}</p>
              </div>
            </div>
          </div>

          {/* README Preview */}
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📖</span> README Context (Snippet)
            </h3>
            {repository.readmeSnippet ? (
              <pre
                style={{
                  background: 'var(--bg-input)',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 400,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {repository.readmeSnippet}
              </pre>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No README content could be extracted.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
