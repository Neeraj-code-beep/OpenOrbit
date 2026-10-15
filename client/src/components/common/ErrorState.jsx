import { Button } from './Button.jsx';

export function ErrorState({ title = 'Something went wrong', message, code, onRetry }) {
  return (
    <div className="card" style={{ borderLeft: '4px solid var(--accent-rose)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <h3 style={{ color: 'var(--accent-rose)', margin: 0 }}>{title}</h3>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{message}</p>
      {code && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
          Code: {code}
        </span>
      )}
      {onRetry && (
        <div style={{ marginTop: 8 }}>
          <Button variant="secondary" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
