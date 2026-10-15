import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/apiClient.js";
import { Button } from "../../components/common/Button.jsx";
import { Icon } from "../../components/common/Icon.jsx";
import { Input } from "../../components/common/Input.jsx";
import { LoadingState } from "../../components/common/LoadingState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { formatNumber } from "../../utils/formatters.js";

export function RepositoryPage({ targetRepo, onSearchRepoIssues }) {
  const [repoInput, setRepoInput] = useState(
    targetRepo ? `${targetRepo.owner}/${targetRepo.name}` : "expressjs/express",
  );
  const [repository, setRepository] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputError, setInputError] = useState("");

  const fetchRepo = useCallback(
    async (fullPath) => {
      const parts = (fullPath || repoInput).trim().split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        setInputError(
          'Enter a repository as "owner/repo" (for example facebook/react).',
        );
        return;
      }

      const [owner, repo] = parts;
      setInputError("");
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
    },
    [repoInput],
  );

  useEffect(() => {
    if (targetRepo?.owner && targetRepo?.name) {
      const full = `${targetRepo.owner}/${targetRepo.name}`;
      setRepoInput(full);
      fetchRepo(full);
    } else {
      fetchRepo("expressjs/express");
    }
  }, [targetRepo, fetchRepo]);

  return (
    <div className="page-stack">
      {/* Search Bar */}
      <div className="card">
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            fetchRepo();
          }}
        >
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <Input
              label="Repository (owner/repo)"
              placeholder="e.g. facebook/react or expressjs/express"
              value={repoInput}
              onChange={(e) => {
                setRepoInput(e.target.value);
                if (inputError) setInputError("");
              }}
              error={inputError}
            />
          </div>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            <Icon name="search" size={16} /> Inspect repository
          </Button>
        </form>
      </div>

      {isLoading && (
        <LoadingState message="Fetching verified repository context..." />
      )}

      {error && (
        <ErrorState
          title="Repository lookup failed"
          message={error.message}
          code={error.code}
          onRetry={() => fetchRepo()}
        />
      )}

      {repository && !isLoading && (
        <>
          {/* Main Repo Card */}
          <section className="card" aria-label="Repository summary">
            <div
              className="card-header"
              style={{ alignItems: "flex-start", marginBottom: 20 }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="row-wrap" style={{ marginBottom: 8 }}>
                  <span className="badge badge-verified">
                    Verified GitHub repo
                  </span>
                  {repository.language && (
                    <span className="badge badge-label">
                      {repository.language}
                    </span>
                  )}
                  {repository.isArchived && (
                    <span className="badge badge-suggested">Archived</span>
                  )}
                </div>
                <h2
                  style={{ fontSize: 22, margin: 0, overflowWrap: "anywhere" }}
                >
                  <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
                    {repository.fullName}
                  </a>
                </h2>
                <p style={{ marginTop: 6, fontSize: 14, maxWidth: "70ch" }}>
                  {repository.description ||
                    "No description provided by maintainers."}
                </p>
              </div>

              <div className="row-wrap">
                <Button
                  variant="primary"
                  onClick={() =>
                    onSearchRepoIssues?.(repository.owner, repository.name)
                  }
                >
                  Find issues in this repo →
                </Button>
                <a
                  href={repository.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  GitHub <Icon name="external" size={14} />
                </a>
              </div>
            </div>

            {/* Metrics */}
            <dl className="stat-grid">
              <div className="stat">
                <dt className="stat-label">Stars</dt>
                <dd className="stat-value">
                  {formatNumber(repository.starsCount)}
                </dd>
              </div>
              <div className="stat">
                <dt className="stat-label">Forks</dt>
                <dd className="stat-value">
                  {formatNumber(repository.forksCount)}
                </dd>
              </div>
              <div className="stat">
                <dt className="stat-label">Open issues</dt>
                <dd className="stat-value">
                  {formatNumber(repository.openIssuesCount)}
                </dd>
              </div>
              <div className="stat">
                <dt className="stat-label">License</dt>
                <dd className="stat-value is-text">
                  {repository.license || "—"}
                </dd>
              </div>
              <div className="stat">
                <dt className="stat-label">Default branch</dt>
                <dd className="stat-value is-text">
                  {repository.defaultBranch || "—"}
                </dd>
              </div>
            </dl>
          </section>

          {/* README Preview */}
          <section className="card" aria-labelledby="readme-heading">
            <div className="card-header">
              <h3 id="readme-heading" className="card-title">
                <Icon name="repository" size={16} /> README context (snippet)
              </h3>
            </div>
            {repository.readmeSnippet ? (
              <pre
                className="code-block"
                style={{ maxHeight: 400, overflowY: "auto" }}
              >
                {repository.readmeSnippet}
              </pre>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                No README content could be extracted.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
