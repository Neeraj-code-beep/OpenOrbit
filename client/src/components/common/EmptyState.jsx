import { Button } from './Button.jsx';

export function EmptyState({ icon = '🔍', title = 'No results found', message, actionText, onAction }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 36, marginBottom: 4 }}>{icon}</span>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ maxWidth: 440, fontSize: 14 }}>{message}</p>
      {actionText && onAction && (
        <div style={{ marginTop: 8 }}>
          <Button variant="primary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
