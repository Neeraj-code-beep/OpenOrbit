import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/apiClient.js";
import { Button } from "../../components/common/Button.jsx";
import { Icon } from "../../components/common/Icon.jsx";
import { LoadingState } from "../../components/common/LoadingState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ContributionPlan } from "../../components/contribution/ContributionPlan.jsx";

export function ContributionPage({
  selectedIssue,
  onNavigateToIssues,
  onNavigateToSettings,
}) {
  const [plan, setPlan] = useState(null);
  const [prDescription, setPrDescription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiMeta, setAiMeta] = useState(null);

  const generatePlan = useCallback(async () => {
    if (!selectedIssue) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.generateContributionPlan({
        issueTitle: selectedIssue.title,
        issueBody: selectedIssue.body,
        repoOwner: selectedIssue.repository?.owner,
        repoName: selectedIssue.repository?.name,
      });

      setPlan(res.data);
      setAiMeta(res.meta);

      // Generate preliminary PR description
      try {
        const prRes = await api.generatePRDescription({
          plan: res.data,
          issueNumber: selectedIssue.number,
          issueTitle: selectedIssue.title,
          repoOwner: selectedIssue.repository?.owner,
          repoName: selectedIssue.repository?.name,
        });
        setPrDescription(prRes.data);
      } catch (prErr) {
        console.warn("Could not generate PR template:", prErr);
      }
    } catch (err) {
      setError(err);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIssue]);

  // Automatically generate plan when an issue is selected if not already present
  useEffect(() => {
    if (selectedIssue && !plan && !isLoading && !error) {
      generatePlan();
    }
  }, [selectedIssue, plan, isLoading, error, generatePlan]);

  if (!selectedIssue) {
    return (
      <EmptyState
        icon="contribution"
        title="No issue selected for contribution"
        message="Select an issue from the 'Discover Issues' catalog or enter a repository to generate an AI-assisted contribution plan."
        actionText="Browse issues →"
        onAction={onNavigateToIssues}
      />
    );
  }

  return (
    <div className="page-stack">
      {/* Selected issue context */}
      <section className="card" aria-label="Selected issue">
        <div
          className="card-header"
          style={{
            alignItems: "flex-start",
            marginBottom: selectedIssue.body ? 14 : 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="row-wrap" style={{ marginBottom: 8 }}>
              <span className="badge badge-primary">Active GitHub issue</span>
              <span className="badge badge-label">#{selectedIssue.number}</span>
              {selectedIssue.repository?.fullName && (
                <span className="badge badge-label badge-wrap">
                  {selectedIssue.repository.fullName}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 18, margin: 0, overflowWrap: "anywhere" }}>
              {selectedIssue.title}
            </h2>
          </div>

          <div className="row-wrap">
            <a
              href={selectedIssue.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              Open on GitHub <Icon name="external" size={14} />
            </a>
            {!plan && !isLoading && (
              <Button variant="primary" onClick={generatePlan}>
                <Icon name="sparkle" size={16} /> Generate plan now
              </Button>
            )}
          </div>
        </div>

        {selectedIssue.body && (
          <div
            className="code-block"
            style={{
              maxHeight: 120,
              overflowY: "auto",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
            }}
          >
            {selectedIssue.body}
          </div>
        )}
      </section>

      {isLoading && (
        <LoadingState
          message="Analyzing repository context & synthesizing contribution roadmap..."
          subtext="Executing structured LLM prompt with XML prompt injection defenses"
        />
      )}

      {error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ErrorState
            title="Failed to generate contribution plan"
            message={error.message}
            code={error.code}
            onRetry={generatePlan}
          />
          {error.code === "AI_PROVIDER_UNCONFIGURED" && (
            <div className="callout callout-info" role="note">
              <Icon name="info" size={18} />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <strong style={{ color: "var(--text-primary)" }}>
                  Set up your AI provider
                </strong>
                <span style={{ color: "var(--text-secondary)" }}>
                  OpenOrbit supports Google Gemini (cloud) and Ollama (local
                  model). You can review the provider configuration in Settings.
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={onNavigateToSettings}
                >
                  Open Settings & AI configuration →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {plan && !isLoading && (
        <>
          {aiMeta && (
            <div
              className="row-wrap"
              style={{
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <span>
                Generated via provider:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {aiMeta.provider?.toUpperCase()}
                </strong>
              </span>
              <span>Inference duration: {aiMeta.durationMs}ms</span>
            </div>
          )}
          <ContributionPlan
            plan={plan}
            prDescription={prDescription}
            onRegenerate={generatePlan}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
