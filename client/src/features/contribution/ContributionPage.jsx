import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient.js';
import { Button } from '../../components/common/Button.jsx';
import { LoadingState } from '../../components/common/LoadingState.jsx';
import { ErrorState } from '../../components/common/ErrorState.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { ContributionPlan } from '../../components/contribution/ContributionPlan.jsx';

export function ContributionPage({ selectedIssue, onNavigateToIssues, onNavigateToSettings }) {
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
        console.warn('Could not generate PR template:', prErr);
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
        icon="🛠️"
        title="No Issue Selected for Contribution"
        message="Select an issue from the 'Discover Issues' catalog or enter a repository to generate an AI-assisted contribution plan."
        actionText="Browse Issues →"
        onAction={onNavigateToIssues}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Selected Issue Context Box */}
      <div className="card" style={{ borderColor: 'var(--border-medium)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-primary">Active GitHub Issue</span>
              <span className="badge badge-label">#{selectedIssue.number}</span>
              <span className="badge badge-label">@{selectedIssue.repository?.fullName}</span>
            </div>
            <h2 style={{ fontSize: 19, margin: 0 }}>{selectedIssue.title}</h2>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={selectedIssue.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              Open on GitHub ↗
            </a>
            {!plan && !isLoading && (
              <Button variant="primary" onClick={generatePlan}>
                Generate Plan Now 🚀
              </Button>
            )}
          </div>
        </div>

        {selectedIssue.body && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {selectedIssue.body}
          </div>
        )}
      </div>

      {isLoading && (
        <LoadingState
          message="Analyzing repository context & synthesizing contribution roadmap..."
          subtext="Executing structured LLM prompt with XML prompt injection defenses"
        />
      )}

      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ErrorState
            title="Failed to Generate Contribution Plan"
            message={error.message}
            code={error.code}
            onRetry={generatePlan}
          />
          {error.code === 'AI_PROVIDER_UNCONFIGURED' && (
            <div className="card" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-cyan)' }}>
              <h4 style={{ margin: '0 0 6px 0' }}>💡 Setting up your AI Provider</h4>
              <p style={{ fontSize: 13, margin: '0 0 12px 0' }}>
                OpenOrbit supports Google Gemini (cloud) and Ollama (local model). You can configure your API key or local model in Settings.
              </p>
              <Button size="sm" variant="primary" onClick={onNavigateToSettings}>
                Open Settings & AI Configuration →
              </Button>
            </div>
          )}
        </div>
      )}

      {plan && !isLoading && (
        <>
          {aiMeta && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Generated via provider: <strong style={{ color: 'var(--text-primary)' }}>{aiMeta.provider?.toUpperCase()}</strong></span>
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
