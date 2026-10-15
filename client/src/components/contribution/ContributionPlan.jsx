import { useState } from "react";
import { Button } from "../common/Button.jsx";
import { Icon } from "../common/Icon.jsx";

export function ContributionPlan({
  plan,
  prDescription,
  onRegenerate,
  isLoading,
}) {
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
    <div className="page-stack">
      {/* Summary + actions */}
      <section className="card" aria-label="Plan summary">
        <div
          className="card-header"
          style={{ alignItems: "flex-start", marginBottom: 0 }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="row-wrap" style={{ marginBottom: 8 }}>
              <span className="badge badge-primary">AI contribution plan</span>
              <span className="badge badge-suggested">
                Assistant guidance · human in control
              </span>
            </div>
            <h2 style={{ fontSize: 18, margin: 0, overflowWrap: "anywhere" }}>
              {plan.issueSummary}
            </h2>
          </div>

          <div className="row-wrap">
            <Button
              variant="secondary"
              onClick={() => setShowPRModal(!showPRModal)}
              aria-expanded={showPRModal}
            >
              {showPRModal ? "Hide PR description" : "View PR template"}
            </Button>
            <Button
              variant="primary"
              onClick={onRegenerate}
              isLoading={isLoading}
            >
              <Icon name="refresh" size={16} /> Regenerate plan
            </Button>
          </div>
        </div>
      </section>

      {/* PR description */}
      {showPRModal && prDescription && (
        <section
          className="card"
          style={{ borderColor: "var(--accent-subtle-border)" }}
          aria-label="Pull request description"
        >
          <div className="card-header">
            <div style={{ minWidth: 0 }}>
              <h3 className="card-title">Suggested pull request description</h3>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: 12,
                  overflowWrap: "anywhere",
                }}
              >
                Title: <code>{prDescription.title}</code>
              </p>
            </div>
            <Button
              size="sm"
              variant={copied ? "secondary" : "primary"}
              onClick={handleCopyPR}
            >
              {copied ? (
                <>
                  <Icon name="check" size={14} /> Copied
                </>
              ) : (
                <>
                  <Icon name="copy" size={14} /> Copy markdown
                </>
              )}
            </Button>
          </div>
          <pre
            className="code-block"
            style={{ maxHeight: 280, overflowY: "auto" }}
          >
            {prDescription.body}
          </pre>
        </section>
      )}

      {/* Problem interpretation & relevant files */}
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            <Icon name="issues" size={16} /> Problem interpretation & root cause
          </h3>
          <p
            style={{ fontSize: 14, lineHeight: 1.6, overflowWrap: "anywhere" }}
          >
            {plan.problemInterpretation}
          </p>
        </section>

        <section className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            <Icon name="repository" size={16} /> Relevant files & target areas
          </h3>
          {plan.relevantFiles && plan.relevantFiles.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {plan.relevantFiles.map((f, i) => (
                <div key={i} className="file-row">
                  <div className="file-row-head">
                    <code style={{ fontWeight: 600 }}>{f.filePath}</code>
                    <span
                      className={`badge ${f.isVerified ? "badge-verified" : "badge-suggested"}`}
                    >
                      <Icon name={f.isVerified ? "check" : "info"} size={12} />
                      {f.isVerified ? "Verified file" : "Suggested area"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {f.reason}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              No specific files isolated yet.
            </p>
          )}
        </section>
      </div>

      {/* Implementation roadmap */}
      <section className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          <Icon name="contribution" size={16} /> Step-by-step implementation
          roadmap
        </h3>
        <ol className="steps">
          {plan.implementationSteps?.map((step, idx) => (
            <li key={idx} className="step">
              <span className="step-number" aria-hidden="true">
                {step.stepNumber || idx + 1}
              </span>
              <div className="step-body">
                <h4 className="step-title">
                  <span className="sr-only">
                    Step {step.stepNumber || idx + 1}:{" "}
                  </span>
                  {step.title}
                </h4>
                <p
                  style={{ fontSize: 13, margin: 0, overflowWrap: "anywhere" }}
                >
                  {step.description}
                </p>
                {step.safetyNotes && (
                  <div
                    className="callout callout-warning"
                    style={{ marginTop: 6, padding: "8px 10px", fontSize: 12 }}
                  >
                    <Icon name="alert" size={14} />
                    <span>Safety: {step.safetyNotes}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Acceptance criteria & test plan */}
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            <Icon name="check" size={16} /> Acceptance criteria
          </h3>
          <ul className="check-list is-success">
            {plan.acceptanceCriteria?.map((crit, idx) => (
              <li key={idx}>
                <Icon name="check" size={14} />
                <span style={{ overflowWrap: "anywhere" }}>{crit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            <Icon name="sparkle" size={16} /> Test plan & regressions
          </h3>
          <ul className="check-list is-info">
            {plan.testPlan?.map((test, idx) => (
              <li key={idx}>
                <Icon name="check" size={14} />
                <span style={{ overflowWrap: "anywhere" }}>{test}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Dependencies & risks */}
      {plan.dependenciesAndRisks && plan.dependenciesAndRisks.length > 0 && (
        <section
          className="callout callout-warning"
          style={{ flexDirection: "column", padding: "var(--space-lg)" }}
        >
          <h3 className="card-title" style={{ color: "var(--status-warning)" }}>
            <Icon name="alert" size={16} /> Dependencies & technical risks
          </h3>
          <ul
            style={{
              paddingLeft: 20,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {plan.dependenciesAndRisks.map((risk, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  overflowWrap: "anywhere",
                }}
              >
                {risk}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
