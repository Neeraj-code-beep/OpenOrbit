import { useState } from 'react';
import { Button } from '../common/Button.jsx';

export function ContributionPlan({ plan, prDescription, onRegenerate, isLoading }) {
  const [copied, setCopied] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);

  if (!plan) return null;

  const handleCopyPR = () => {
    if (prDescription?.body) {
      navigator.clipboard.writeText(prDescription.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner / Meta */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08))',
          borderColor: 'var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="badge badge-primary">AI Contribution Plan</span>
            <span className="badge badge-suggested">Assistant Guidance — Human in Control</span>
          </div>
          <h2 style={{ fontSize: 18, margin: 0 }}>
            {plan.issueSummary}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => setShowPRModal(!showPRModal)}>
            {showPRModal ? 'Hide PR Description' : 'View PR Template 📝'}
          </Button>
          <Button variant="primary" onClick={onRegenerate} isLoading={isLoading}>
            Regenerate Plan 🔄
          </Button>
        </div>
      </div>

      {/* PR Description Drawer / Section */}
      {showPRModal && prDescription && (
        <div className="card" style={{ borderColor: 'var(--accent-primary)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Suggested Pull Request Description</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>Title: <code>{prDescription.title}</code></p>
            </div>
            <Button size="sm" variant={copied ? 'secondary' : 'primary'} onClick={handleCopyPR}>
              {copied ? 'Copied to Clipboard! ✓' : 'Copy Markdown 📋'}
            </Button>
          </div>
          <pre
            style={{
              background: 'var(--bg-input)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              maxHeight: 280,
            }}
          >
            {prDescription.body}
          </pre>
        </div>
      )}

      {/* Grid: Problem Interpretation & Relevant Files */}
      <div className="grid-2">
        {/* Technical Root Cause */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔍</span> Problem Interpretation & Root Cause
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {plan.problemInterpretation}
          </p>
        </div>

        {/* Relevant Files */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📁</span> Relevant Files & Target Areas
          </h3>
          {plan.relevantFiles && plan.relevantFiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.relevantFiles.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.filePath}</code>
                    <span className={`badge ${f.isVerified ? 'badge-verified' : 'badge-suggested'}`}>
                      {f.isVerified ? 'Verified File' : 'Suggested Area'}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.reason}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No specific files isolated yet.</p>
          )}
        </div>
      </div>

      {/* Step by Step Implementation Strategy */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🛠️</span> Step-by-Step Implementation Roadmap
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {plan.implementationSteps?.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 16,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {step.stepNumber || idx + 1}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h4 style={{ fontSize: 14, margin: 0, color: 'var(--text-primary)' }}>{step.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{step.description}</p>
                {step.safetyNotes && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--accent-amber)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>⚠️</span>
                    <span>Safety: {step.safetyNotes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Acceptance Criteria & Test Plan */}
      <div className="grid-2">
        {/* Acceptance Criteria */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✅</span> Acceptance Criteria
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.acceptanceCriteria?.map((crit, idx) => (
              <li key={idx} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>✓</span>
                <span>{crit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Test Plan */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🧪</span> Test Plan & Regressions
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.testPlan?.map((test, idx) => (
              <li key={idx} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>•</span>
                <span>{test}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dependencies & Risks */}
      {plan.dependenciesAndRisks && plan.dependenciesAndRisks.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <h3 style={{ fontSize: 15, marginBottom: 8, color: 'var(--accent-amber)' }}>
            ⚠️ Dependencies & Technical Risks
          </h3>
          <ul style={{ listStyle: 'disc', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {plan.dependenciesAndRisks.map((risk, idx) => (
              <li key={idx} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{risk}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
