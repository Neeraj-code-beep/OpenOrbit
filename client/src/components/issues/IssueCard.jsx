import { formatDate, truncateText } from '../../utils/formatters.js';
import { Button } from '../common/Button.jsx';

export function IssueCard({ issue, isSelected, onSelect, onOpenRepo }) {
  if (!issue) return null;

  return (
    <div
      className={`card ${isSelected ? 'card-selected' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderLeft: isSelected ? '4px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
        background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
      }}
    >
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <button
            onClick={() => onOpenRepo?.(issue.repository?.owner, issue.repository?.name)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            📦 {issue.repository?.fullName || 'Repository'}
          </button>
          <h3 style={{ fontSize: 16, marginTop: 4, lineHeight: 1.35 }}>
            <a href={issue.htmlUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)' }}>
              #{issue.number} {issue.title}
            </a>
          </h3>
        </div>

        <a
          href={issue.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="badge badge-label"
          style={{ textDecoration: 'none' }}
          title="Open in GitHub"
        >
          GitHub ↗
        </a>
      </div>

      {/* Snippet */}
      {issue.body && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {truncateText(issue.body, 160)}
        </p>
      )}

      {/* Labels */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {issue.labels?.map((label) => (
          <span
            key={label.name}
            className="badge badge-label"
            style={{
              borderColor: label.color ? `#${label.color}40` : 'var(--border-subtle)',
              backgroundColor: label.color ? `#${label.color}15` : 'rgba(255,255,255,0.05)',
              color: 'var(--text-primary)',
            }}
          >
            {label.name}
          </span>
        ))}
      </div>

      {/* Footer & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 12,
          marginTop: 4,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>Opened {formatDate(issue.createdAt)} by @{issue.author}</span>
          {issue.commentsCount > 0 && <span>💬 {issue.commentsCount} comments</span>}
        </div>

        <Button
          size="sm"
          variant={isSelected ? 'secondary' : 'primary'}
          onClick={() => onSelect(issue)}
        >
          {isSelected ? 'Selected ✓' : 'Analyze & Plan →'}
        </Button>
      </div>
    </div>
  );
}
