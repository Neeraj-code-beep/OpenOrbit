import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../lib/apiClient.js";
import { Button } from "../../components/common/Button.jsx";
import { Icon } from "../../components/common/Icon.jsx";
import { LoadingState } from "../../components/common/LoadingState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { formatNumber } from "../../utils/formatters.js";

const LANGUAGES = [
  { value: "", label: "All Languages" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
];

const SORTS = [
  { value: "stars", label: "Most Stars" },
  { value: "forks", label: "Most Forks" },
  { value: "updated", label: "Recently Updated" },
];

export function RepositoryPage({ targetRepo, onSearchRepoIssues }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedSort, setSelectedSort] = useState("stars");
  const [repositories, setRepositories] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Inspector state
  const [inspectedRepo, setInspectedRepo] = useState(null);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [inspectError, setInspectError] = useState(null);
  const [pullRequests, setPullRequests] = useState([]);
  const [commits, setCommits] = useState([]);
  const [activeInspectorTab, setActiveInspectorTab] = useState("readme");

  // Python AI Architecture Context State
  const [repoContext, setRepoContext] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState(null);

  // Python Code Analyzer State
  const [codePath, setCodePath] = useState("src/index.js");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeAnalysis, setCodeAnalysis] = useState(null);
  const [isAnalyzingCode, setIsAnalyzingCode] = useState(false);
  const [codeAnalysisError, setCodeAnalysisError] = useState(null);

  // Stale request guard
  const reqSeqRef = useRef(0);

  // Execute repository search
  const performSearch = useCallback(
    async (query, language, sort, page = 1) => {
      const seq = ++reqSeqRef.current;
      setIsSearching(true);
      setSearchError(null);

      try {
        const res = await api.searchRepositories({
          query: query || "",
          language: language || "",
          sort: sort || "stars",
          order: "desc",
          page,
          per_page: 12,
        });

        // Ignore stale responses
        if (seq !== reqSeqRef.current) return;

        setRepositories(res.data || []);
        setTotalCount(res.pagination?.totalCount || 0);
        setCurrentPage(page);
      } catch (err) {
        if (seq !== reqSeqRef.current) return;
        setSearchError(err);
        setRepositories([]);
      } finally {
        if (seq === reqSeqRef.current) {
          setIsSearching(false);
        }
      }
    },
    []
  );

  // Inspect a specific repository (owner/repo)
  const inspectRepository = useCallback(async (owner, repo) => {
    setIsLoadingRepo(true);
    setInspectError(null);
    setPullRequests([]);
    setCommits([]);
    setRepoContext(null);
    setCodeAnalysis(null);
    setActiveInspectorTab("readme");

    try {
      const [repoRes, prsRes, commitsRes] = await Promise.allSettled([
        api.getRepository(owner, repo),
        api.getPullRequests(owner, repo, { per_page: 5 }),
        api.getCommits(owner, repo, { per_page: 5 }),
      ]);

      if (repoRes.status === "fulfilled") {
        setInspectedRepo(repoRes.value.data);
      } else {
        throw repoRes.reason;
      }

      if (prsRes.status === "fulfilled") {
        setPullRequests(prsRes.value?.data || []);
      }
      if (commitsRes.status === "fulfilled") {
        setCommits(commitsRes.value?.data || []);
      }
    } catch (err) {
      setInspectError(err);
      setInspectedRepo(null);
    } finally {
      setIsLoadingRepo(false);
    }
  }, []);

  const fetchRepositoryContext = async () => {
    if (!inspectedRepo || isLoadingContext) return;
    setIsLoadingContext(true);
    setContextError(null);
    try {
      const res = await api.getRepositoryContext({
        metadata: {
          owner: inspectedRepo.owner,
          name: inspectedRepo.name,
          defaultBranch: inspectedRepo.defaultBranch || "main",
          stars: inspectedRepo.starsCount || 0,
          openIssues: inspectedRepo.openIssuesCount || 0,
          language: inspectedRepo.language || "",
        },
        filePaths: [
          "package.json",
          "requirements.txt",
          "src/index.js",
          "src/server.js",
          "README.md",
          "tests/test_main.py",
          "test/index.test.js",
          "docs/index.md",
        ],
        keyFilesContent: inspectedRepo.readmeSnippet ? { "README.md": inspectedRepo.readmeSnippet } : {},
      });
      setRepoContext(res.data || res);
    } catch (err) {
      setContextError(err.message || "Failed to load architecture context from Python AI service.");
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleAnalyzeCode = async () => {
    if (!codePath.trim() || !codeSnippet.trim() || isAnalyzingCode) return;
    setIsAnalyzingCode(true);
    setCodeAnalysisError(null);
    try {
      const res = await api.analyzeCode({
        filePath: codePath.trim(),
        codeContent: codeSnippet,
        language: inspectedRepo?.language?.toLowerCase() || "",
      });
      setCodeAnalysis(res.data || res);
    } catch (err) {
      setCodeAnalysisError(err.message || "Failed to analyze source code.");
    } finally {
      setIsAnalyzingCode(false);
    }
  };


  // Handle external navigation targetRepo
  useEffect(() => {
    if (targetRepo?.owner && targetRepo?.name) {
      inspectRepository(targetRepo.owner, targetRepo.name);
    }
  }, [targetRepo, inspectRepository]);

  // Debounced search on query/filter changes
  useEffect(() => {
    if (targetRepo?.owner && targetRepo?.name) return;
    const timer = setTimeout(() => {
      performSearch(searchQuery, selectedLanguage, selectedSort, 1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedLanguage, selectedSort, targetRepo, performSearch]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    // Check if query is directly in format "owner/repo"
    const trimmed = searchQuery.trim();
    if (trimmed.includes("/") && trimmed.split("/").length === 2 && !trimmed.includes(" ")) {
      const [owner, repo] = trimmed.split("/");
      inspectRepository(owner, repo);
      return;
    }
    performSearch(searchQuery, selectedLanguage, selectedSort, 1);
  };

  return (
    <div className="page-stack">
      {/* If a repository is being inspected, display the Inspector view */}
      {inspectedRepo || isLoadingRepo || inspectError ? (
        <div>
          {/* Breadcrumb Header */}
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setInspectedRepo(null);
                setInspectError(null);
              }}
              style={{
                borderRadius: "var(--radius-full)",
                fontSize: 13,
                gap: 8,
              }}
            >
              ← Back to repository discovery
            </button>
          </div>

          {isLoadingRepo && (
            <LoadingState message="Fetching repository context, README, and activity..." />
          )}

          {inspectError && (
            <ErrorState
              title="Repository inspection failed"
              message={inspectError.message}
              code={inspectError.code}
              onRetry={() => {
                if (inspectedRepo) {
                  inspectRepository(inspectedRepo.owner, inspectedRepo.name);
                }
              }}
            />
          )}

          {inspectedRepo && !isLoadingRepo && (
            <div className="page-stack">
              {/* Repository Banner Card */}
              <section className="card" aria-label="Repository summary">
                <div
                  className="card-header"
                  style={{ alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 16 }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row-wrap" style={{ marginBottom: 8, gap: 8 }}>
                      <span className="badge badge-verified">Verified GitHub Repo</span>
                      {inspectedRepo.language && (
                        <span className="badge badge-label">{inspectedRepo.language}</span>
                      )}
                      {inspectedRepo.isArchived && (
                        <span className="badge badge-suggested">Archived</span>
                      )}
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                      {inspectedRepo.fullName}
                    </h2>
                    <p style={{ marginTop: 8, fontSize: 14, color: "var(--text-secondary)", maxWidth: "75ch", lineHeight: 1.6 }}>
                      {inspectedRepo.description || "No description provided by repository maintainers."}
                    </p>
                  </div>

                  <div className="row-wrap" style={{ gap: 10 }}>
                    <Button
                      variant="primary"
                      onClick={() => onSearchRepoIssues?.(inspectedRepo.owner, inspectedRepo.name)}
                      style={{ borderRadius: "var(--radius-full)" }}
                    >
                      <Icon name="issues" size={16} /> Discover Issues
                    </Button>
                    <a
                      href={inspectedRepo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ borderRadius: "var(--radius-full)" }}
                    >
                      <Icon name="github" size={16} /> View on GitHub <Icon name="external" size={14} />
                    </a>
                  </div>
                </div>

                {/* Metrics */}
                <dl className="stat-grid">
                  <div className="stat">
                    <dt className="stat-label">Stars</dt>
                    <dd className="stat-value">{formatNumber(inspectedRepo.starsCount)}</dd>
                  </div>
                  <div className="stat">
                    <dt className="stat-label">Forks</dt>
                    <dd className="stat-value">{formatNumber(inspectedRepo.forksCount)}</dd>
                  </div>
                  <div className="stat">
                    <dt className="stat-label">Open Issues</dt>
                    <dd className="stat-value">{formatNumber(inspectedRepo.openIssuesCount)}</dd>
                  </div>
                  <div className="stat">
                    <dt className="stat-label">License</dt>
                    <dd className="stat-value is-text">{inspectedRepo.license || "—"}</dd>
                  </div>
                  <div className="stat">
                    <dt className="stat-label">Default Branch</dt>
                    <dd className="stat-value is-text">{inspectedRepo.defaultBranch || "main"}</dd>
                  </div>
                </dl>
              </section>

              {/* Inspector Navigation Tabs */}
              <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn ${activeInspectorTab === "readme" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveInspectorTab("readme")}
                  style={{ borderRadius: "var(--radius-full)", fontSize: 13 }}
                >
                  README Documentation
                </button>
                <button
                  type="button"
                  className={`btn ${activeInspectorTab === "architecture" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setActiveInspectorTab("architecture");
                    if (!repoContext) fetchRepositoryContext();
                  }}
                  style={{ borderRadius: "var(--radius-full)", fontSize: 13 }}
                >
                  <Icon name="sparkle" size={14} /> Architecture & Context
                </button>
                <button
                  type="button"
                  className={`btn ${activeInspectorTab === "code_analysis" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveInspectorTab("code_analysis")}
                  style={{ borderRadius: "var(--radius-full)", fontSize: 13 }}
                >
                  <Icon name="repository" size={14} /> Code Analyzer
                </button>
                <button
                  type="button"
                  className={`btn ${activeInspectorTab === "prs" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveInspectorTab("prs")}
                  style={{ borderRadius: "var(--radius-full)", fontSize: 13 }}
                >
                  Recent Pull Requests ({pullRequests.length})
                </button>
                <button
                  type="button"
                  className={`btn ${activeInspectorTab === "commits" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveInspectorTab("commits")}
                  style={{ borderRadius: "var(--radius-full)", fontSize: 13 }}
                >
                  Recent Commits ({commits.length})
                </button>
              </div>

              {/* Tab 1: README Content */}
              {activeInspectorTab === "readme" && (
                <section className="card" aria-labelledby="readme-heading">
                  <div className="card-header">
                    <h3 id="readme-heading" className="card-title">
                      <Icon name="repository" size={16} /> README context snippet
                    </h3>
                  </div>
                  {inspectedRepo.readmeSnippet ? (
                    <pre
                      className="code-block"
                      style={{ maxHeight: 420, overflowY: "auto", fontSize: 13, lineHeight: 1.6 }}
                    >
                      {inspectedRepo.readmeSnippet}
                    </pre>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      No README file could be retrieved for this repository.
                    </p>
                  )}
                </section>
              )}

              {/* Tab 2: Pull Requests */}
              {activeInspectorTab === "prs" && (
                <section className="card">
                  <div className="card-header">
                    <h3 className="card-title">Recent Pull Requests</h3>
                  </div>
                  {pullRequests.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {pullRequests.map((pr) => (
                        <div
                          key={pr.id}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--bg-secondary)",
                            border: "1px solid var(--border-subtle)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              #{pr.number} {pr.title}
                            </span>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                              by @{pr.author} · state: {pr.state}
                            </div>
                          </div>
                          <a
                            href={pr.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: "4px 10px" }}
                          >
                            View PR <Icon name="external" size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      No recent pull requests found.
                    </p>
                  )}
                </section>
              )}

              {/* Tab 3: Commits */}
              {activeInspectorTab === "commits" && (
                <section className="card">
                  <div className="card-header">
                    <h3 className="card-title">Recent Commit Activity</h3>
                  </div>
                  {commits.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {commits.map((c) => (
                        <div
                          key={c.sha}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--bg-secondary)",
                            border: "1px solid var(--border-subtle)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {c.message}
                            </span>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                              <code>{c.shortSha}</code> by {c.authorName || c.authorLogin || "contributor"}
                            </div>
                          </div>
                          <a
                            href={c.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: "4px 10px" }}
                          >
                            Commit <Icon name="external" size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      No recent commit history retrieved.
                    </p>
                  )}
                </section>
              )}

              {/* Tab 4: Python Architecture & Context Summary */}
              {activeInspectorTab === "architecture" && (
                <section className="card" aria-label="Architecture context summary">
                  <div className="card-header" style={{ marginBottom: 16 }}>
                    <div>
                      <h3 className="card-title">
                        <Icon name="sparkle" size={16} /> Python Architecture Intelligence
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                        Stack identification, entry point mapping, and detected test framework structures.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={fetchRepositoryContext}
                      isLoading={isLoadingContext}
                    >
                      <Icon name="refresh" size={14} /> Refresh Context
                    </Button>
                  </div>

                  {isLoadingContext && (
                    <LoadingState
                      message="Extracting repository architecture and entry points..."
                      subtext="Invoking Python AI service repository context parser"
                    />
                  )}

                  {contextError && (
                    <ErrorState
                      title="Context extraction failed"
                      message={contextError}
                      onRetry={fetchRepositoryContext}
                    />
                  )}

                  {repoContext && !isLoadingContext && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* High-level tags */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span className="badge badge-primary">
                          Stack: {repoContext.project_type || "Standard Project"}
                        </span>
                        {repoContext.languages_detected?.map((lang) => (
                          <span key={lang} className="badge badge-verified">
                            {lang}
                          </span>
                        ))}
                      </div>

                      {/* Entry points & Test frameworks */}
                      <div className="grid-2" style={{ gap: 16 }}>
                        <div
                          style={{
                            padding: "14px 16px",
                            backgroundColor: "var(--bg-elevated)",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <strong style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 8 }}>
                            Detected Entry Points
                          </strong>
                          {repoContext.entry_points?.length > 0 ? (
                            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
                              {repoContext.entry_points.map((ep, i) => (
                                <li key={i} style={{ marginBottom: 4 }}>
                                  <code>{ep}</code>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              No distinct entry files isolated.
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            padding: "14px 16px",
                            backgroundColor: "var(--bg-elevated)",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <strong style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 8 }}>
                            Testing Frameworks & Configs
                          </strong>
                          {repoContext.test_frameworks?.length > 0 ? (
                            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
                              {repoContext.test_frameworks.map((tf, i) => (
                                <li key={i} style={{ marginBottom: 4 }}>
                                  <code>{tf}</code>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              Default test runner or scripts in config.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Architecture Summary Text */}
                      {repoContext.summary_markdown && (
                        <div>
                          <strong style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 8 }}>
                            Architecture Overview
                          </strong>
                          <div
                            className="code-block"
                            style={{
                              maxHeight: 280,
                              overflowY: "auto",
                              fontFamily: "var(--font-sans)",
                              fontSize: 13,
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {repoContext.summary_markdown}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Tab 5: Python Structural Code Analyzer */}
              {activeInspectorTab === "code_analysis" && (
                <section className="card" aria-label="Code structural analyzer">
                  <div className="card-header" style={{ marginBottom: 16 }}>
                    <div>
                      <h3 className="card-title">
                        <Icon name="repository" size={16} /> Python Code Structural Analyzer
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                        Extract AST symbols, function declarations, imports, and complexity notes using Python analysis.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 240px" }}>
                        <label className="field-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                          Target File Path
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={codePath}
                          onChange={(e) => setCodePath(e.target.value)}
                          placeholder="e.g. src/services/auth.js or app/main.py"
                          style={{ width: "100%", fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="field-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                        Source Code Content
                      </label>
                      <textarea
                        className="input"
                        rows={6}
                        value={codeSnippet}
                        onChange={(e) => setCodeSnippet(e.target.value)}
                        placeholder="Paste code snippet or function to analyze structure and dependencies..."
                        style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 12 }}
                      />
                    </div>

                    <div>
                      <Button
                        variant="primary"
                        onClick={handleAnalyzeCode}
                        isLoading={isAnalyzingCode}
                        disabled={!codeSnippet.trim() || !codePath.trim()}
                        style={{ fontSize: 13 }}
                      >
                        <Icon name="sparkle" size={14} /> Analyze Code Structure
                      </Button>
                    </div>

                    {codeAnalysisError && (
                      <div className="callout callout-warning" style={{ fontSize: 12, padding: "8px 12px" }}>
                        <Icon name="alert" size={14} />
                        <span>{codeAnalysisError}</span>
                      </div>
                    )}

                    {codeAnalysis && !isAnalyzingCode && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "16px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span className="badge badge-primary">
                            Lines: {codeAnalysis.line_count}
                          </span>
                          <span className="badge badge-verified">
                            Language: {codeAnalysis.language}
                          </span>
                        </div>

                        {codeAnalysis.complexity_notes && (
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                              COMPLEXITY & DESIGN:
                            </span>
                            <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 2 }}>
                              {codeAnalysis.complexity_notes}
                            </p>
                          </div>
                        )}

                        {codeAnalysis.symbols?.length > 0 && (
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                              EXTRACTED SYMBOLS ({codeAnalysis.symbols.length}):
                            </span>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                              {codeAnalysis.symbols.map((sym, idx) => (
                                <span key={idx} className="badge badge-label" style={{ fontSize: 11 }}>
                                  {sym.type}: <code>{sym.name}</code> {sym.line_start ? `(L${sym.line_start})` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {codeAnalysis.dependencies?.length > 0 && (
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                              IMPORTED DEPENDENCIES:
                            </span>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                              {codeAnalysis.dependencies.map((dep, idx) => (
                                <code key={idx} style={{ fontSize: 12, padding: "2px 6px" }}>
                                  {dep}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Repository Discovery & Search View */
        <div className="page-stack">
          {/* Search Toolbar */}
          <div className="card">
            <form onSubmit={handleManualSearch}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  alignItems: "end",
                }}
              >
                {/* Free text search input */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    htmlFor="repo-search-input"
                    style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}
                  >
                    Search Repositories
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="repo-search-input"
                      type="text"
                      className="input"
                      placeholder="e.g. react, fastapi, rust, or facebook/react..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 38 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                        pointerEvents: "none",
                      }}
                    >
                      <Icon name="search" size={16} />
                    </div>
                  </div>
                </div>

                {/* Language Filter */}
                <div>
                  <label
                    htmlFor="repo-lang-select"
                    style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}
                  >
                    Language
                  </label>
                  <select
                    id="repo-lang-select"
                    className="input"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Option */}
                <div>
                  <label
                    htmlFor="repo-sort-select"
                    style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}
                  >
                    Sort By
                  </label>
                  <select
                    id="repo-sort-select"
                    className="input"
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {totalCount > 0 ? `${formatNumber(totalCount)} repositories matched` : "Search real GitHub open-source repositories"}
                </span>
                <Button type="submit" variant="primary" isLoading={isSearching} style={{ borderRadius: "var(--radius-full)" }}>
                  <Icon name="search" size={16} /> Search
                </Button>
              </div>
            </form>
          </div>

          {/* Loading Indicator */}
          {isSearching && (
            <LoadingState message="Querying real GitHub repository index..." />
          )}

          {/* Error Message */}
          {searchError && !isSearching && (
            <ErrorState
              title="Search request failed"
              message={searchError.message}
              code={searchError.code}
              onRetry={() => performSearch(searchQuery, selectedLanguage, selectedSort, currentPage)}
            />
          )}

          {/* Zero Results State */}
          {!isSearching && !searchError && repositories.length === 0 && (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "48px 24px",
                borderRadius: "var(--radius-xl)",
                backgroundColor: "var(--bg-secondary)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "var(--accent-primary)",
                }}
              >
                <Icon name="search" size={24} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                No repositories matched your query
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6, maxWidth: 480, margin: "6px auto 20px" }}>
                Try adjusting your search terms, removing language filters, or searching for a general topic like &quot;cli&quot;, &quot;ai&quot;, or &quot;framework&quot;.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedLanguage("");
                  setSelectedSort("stars");
                }}
                style={{ borderRadius: "var(--radius-full)" }}
              >
                Reset Search Filters
              </Button>
            </div>
          )}

          {/* Results Grid */}
          {!isSearching && repositories.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 20,
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-medium)",
                    boxShadow: "var(--shadow-sm)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <div>
                    {/* Header badges */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span className="badge badge-label" style={{ fontSize: 12 }}>
                        {repo.language || "Unknown"}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4 }}>
                        ★ {formatNumber(repo.starsCount)}
                      </span>
                    </div>

                    {/* Repository title */}
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, wordBreak: "break-word" }}>
                      <button
                        type="button"
                        onClick={() => inspectRepository(repo.owner, repo.name)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          textAlign: "left",
                          cursor: "pointer",
                          color: "var(--accent-primary)",
                          fontWeight: 700,
                          fontSize: 17,
                        }}
                      >
                        {repo.fullName}
                      </button>
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        marginTop: 8,
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {repo.description || "No description provided."}
                    </p>
                  </div>

                  {/* Metadata and Actions */}
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                      <span>⑂ {formatNumber(repo.forksCount)} forks</span>
                      <span>◎ {formatNumber(repo.openIssuesCount)} issues</span>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        variant="primary"
                        onClick={() => inspectRepository(repo.owner, repo.name)}
                        style={{ flex: 1, borderRadius: "var(--radius-full)", fontSize: 13, padding: "7px 12px" }}
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => onSearchRepoIssues?.(repo.owner, repo.name)}
                        style={{ borderRadius: "var(--radius-full)", fontSize: 13, padding: "7px 12px" }}
                        title="Discover issues in this repo"
                      >
                        <Icon name="issues" size={15} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isSearching && totalCount > 12 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 24 }}>
              <Button
                variant="secondary"
                disabled={currentPage <= 1 || isSearching}
                onClick={() => performSearch(searchQuery, selectedLanguage, selectedSort, currentPage - 1)}
                style={{ borderRadius: "var(--radius-full)", fontSize: 13 }}
              >
                Previous
              </Button>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                Page {currentPage} of {Math.ceil(Math.min(totalCount, 1000) / 12)}
              </span>
              <Button
                variant="secondary"
                disabled={currentPage >= Math.ceil(Math.min(totalCount, 1000) / 12) || isSearching}
                onClick={() => performSearch(searchQuery, selectedLanguage, selectedSort, currentPage + 1)}
                style={{ borderRadius: "var(--radius-full)", fontSize: 13 }}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
