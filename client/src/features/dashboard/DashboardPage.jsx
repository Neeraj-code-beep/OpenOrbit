import { Button } from '../../components/common/Button.jsx';

export function DashboardPage({ health, onNavigate, selectedIssue }) {
  const gh = health?.checks?.github;
  const ai = health?.checks?.ai;
  const mcp = health?.checks?.mcp;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.2), transparent 70%), var(--bg-card)',
          borderColor: 'var(--border-medium)',
          padding: '36px 32px',
        }}
      >
        <div style={{ maxWidth: 720 }}>
          <span className="badge badge-primary" style={{ marginBottom: 12 }}>
            Open Source Contribution Assistant
          </span>
          <h2 style={{ fontSize: 26, margin: '8px 0 12px 0', fontWeight: 700 }}>
            Bridge the gap between discovering an issue and submitting a high-quality Pull Request.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            OpenOrbit uses real GitHub data and bounded AI planning to help you understand unfamiliar repositories,
            isolate target files, draft implementation strategies, and craft clean PR descriptions—keeping you in complete control.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => onNavigate('issues')}>
              🎯 Discover Real Issues
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('repository')}>
              📦 Inspect a Repository
            </Button>
            {selectedIssue && (
              <Button variant="secondary" onClick={() => onNavigate('contribution')}>
                🛠️ Active Plan (#{selectedIssue.number})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Live System Diagnostics Grid */}
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 14, color: 'var(--text-primary)' }}>
          System & Service Integrations (Live Telemetry)
        </h3>
        <div className="grid-3">
          {/* GitHub Status */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🐙</span>
              <span className={`badge ${gh?.status === 'HEALTHY' ? 'badge-verified' : 'badge-suggested'}`}>
                {gh?.status || 'UNKNOWN'}
              </span>
            </div>
            <h4 style={{ fontSize: 14, margin: '0 0 4px 0' }}>GitHub REST API</h4>
            <p style={{ fontSize: 12, margin: 0 }}>
              Remaining calls: <strong style={{ color: 'var(--text-primary)' }}>{gh?.rateLimit?.remaining ?? '—'}</strong> / {gh?.rateLimit?.limit ?? '60'}
            </p>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
              {gh?.authenticated ? 'Authenticated with GITHUB_TOKEN' : 'Public rate limits apply (60/hr)'}
            </span>
          </div>

          {/* AI Provider Status */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <span className={`badge ${ai?.providers?.[ai?.activeProvider]?.status === 'AVAILABLE' ? 'badge-verified' : 'badge-suggested'}`}>
                {ai?.providers?.[ai?.activeProvider]?.status || 'UNCONFIGURED'}
              </span>
            </div>
            <h4 style={{ fontSize: 14, margin: '0 0 4px 0' }}>AI Provider ({ai?.activeProvider?.toUpperCase() || 'NONE'})</h4>
            <p style={{ fontSize: 12, margin: 0 }}>
              Model: <code style={{ color: 'var(--text-link)' }}>{ai?.providers?.gemini?.model || ai?.providers?.ollama?.targetModel || 'None'}</code>
            </p>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
              {ai?.activeProvider === 'gemini'
                ? ai?.providers?.gemini?.configured ? 'Gemini API configured' : 'Add GEMINI_API_KEY in .env'
                : 'Ollama local engine'}
            </span>
          </div>

          {/* MCP Integration Status */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🔌</span>
              <span className={`badge ${mcp?.status === 'CONNECTED' ? 'badge-verified' : 'badge-label'}`}>
                {mcp?.status || 'PENDING'}
              </span>
            </div>
            <h4 style={{ fontSize: 14, margin: '0 0 4px 0' }}>MCP Client Layer</h4>
            <p style={{ fontSize: 12, margin: 0 }}>
              Tools registered: <strong style={{ color: 'var(--text-primary)' }}>{mcp?.registeredToolsCount ?? 3}</strong>
            </p>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
              {mcp?.configured ? 'Custom MCP server specified' : 'Standby. See docs/mcp-tools.md'}
            </span>
          </div>
        </div>
      </div>

      {/* Human in the Loop Principles */}
      <div className="card" style={{ background: 'var(--bg-secondary)' }}>
        <h3 style={{ fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🛡️</span> OpenOrbit Architecture & Core Principles
        </h3>
        <div className="grid-3" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>1. Real GitHub Facts</strong>
            All issue descriptions, repository stars, and branches come from verified GitHub REST endpoints.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>2. Contained Prompt Safety</strong>
            Untrusted issue descriptions are isolated inside XML boundaries to prevent prompt injections.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>3. Human Authority</strong>
            AI provides recommendations and draft plans. You make all file edits and retain full control over git commits.
          </div>
        </div>
      </div>
    </div>
  );
}
