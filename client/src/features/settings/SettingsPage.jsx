import { useState } from 'react';
import { Button } from '../../components/common/Button.jsx';

export function SettingsPage({ health, onRefreshHealth }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshHealth?.();
    setIsRefreshing(false);
  };

  const gh = health?.checks?.github;
  const ai = health?.checks?.ai;
  const mcp = health?.checks?.mcp;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0 }}>System Settings & Provider Configuration</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Check runtime connectivity, verify active providers, and review setup instructions.
          </p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} isLoading={isRefreshing}>
          Refresh Health Status 🔄
        </Button>
      </div>

      {/* Grid: Providers */}
      <div className="grid-2">
        {/* GitHub REST Configuration */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>🐙 GitHub API Integration</h3>
            <span className={`badge ${gh?.status === 'HEALTHY' ? 'badge-verified' : 'badge-suggested'}`}>
              {gh?.status || 'UNKNOWN'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auth Token Status:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {gh?.authenticated ? 'Authenticated (5,000 req/hr)' : 'Unauthenticated (60 req/hr)'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Remaining Calls:</span>
              <span>{gh?.rateLimit?.remaining ?? '—'} / {gh?.rateLimit?.limit ?? '60'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Resets At:</span>
              <span>{gh?.rateLimit?.resetsAt ? new Date(gh.rateLimit.resetsAt).toLocaleTimeString() : 'N/A'}</span>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
            To increase rate limits, add <code>GITHUB_TOKEN=ghp_...</code> to your <code>.env</code> file.
          </div>
        </div>

        {/* AI Engine Configuration */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>🤖 AI Provider Configuration</h3>
            <span className="badge badge-primary">
              Active: {ai?.activeProvider?.toUpperCase() || 'NONE'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>Google Gemini / Gemma:</strong>
                <span className={`badge ${ai?.providers?.gemini?.configured ? 'badge-verified' : 'badge-suggested'}`}>
                  {ai?.providers?.gemini?.configured ? 'Ready' : 'Missing Key'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Model: <code>{ai?.providers?.gemini?.model || 'gemini-2.5-flash'}</code>
              </span>
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>Ollama (Local Offline):</strong>
                <span className={`badge ${ai?.providers?.ollama?.status === 'AVAILABLE' ? 'badge-verified' : 'badge-label'}`}>
                  {ai?.providers?.ollama?.status || 'OFFLINE'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Host: <code>{ai?.providers?.ollama?.host || 'http://127.0.0.1:11434'}</code> | Model: <code>{ai?.providers?.ollama?.targetModel || 'llama3:latest'}</code>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Context Protocol Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔌</span> Model Context Protocol (MCP) Client Integration
          </h3>
          <span className={`badge ${mcp?.status === 'CONNECTED' ? 'badge-verified' : 'badge-label'}`}>
            {mcp?.status || 'PENDING_CONFIG'}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          PRPath implements the official <code>@modelcontextprotocol/sdk</code> client with lifecycle management,
          registered tool definitions (<code>github_search_issues</code>, <code>github_get_issue_details</code>, <code>github_get_repo_readme</code>),
          and argument schema validation.
        </p>

        <div style={{ background: 'var(--bg-input)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
            Connecting a Live MCP Server:
          </strong>
          <code style={{ color: 'var(--accent-cyan)' }}>
            # In your .env file:<br />
            MCP_ENABLED=true<br />
            MCP_SERVER_COMMAND=npx<br />
            MCP_SERVER_ARGS='["-y", "@modelcontextprotocol/server-github"]'
          </code>
        </div>
      </div>

      {/* Security Guarantee */}
      <div className="card" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-emerald)' }}>
        <h4 style={{ margin: '0 0 6px 0', color: 'var(--accent-emerald)' }}>🔒 Security & Privacy Boundary</h4>
        <p style={{ fontSize: 13, margin: 0, color: 'var(--text-secondary)' }}>
          Environment secrets (e.g. <code>GEMINI_API_KEY</code>, <code>GITHUB_TOKEN</code>) are strictly isolated on the backend server.
          The client browser receives only non-sensitive telemetry and sanitized API responses.
        </p>
      </div>
    </div>
  );
}
