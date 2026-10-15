export function LoadingState({ message = 'Loading data...', subtext = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 16 }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'rgba(99,102,241,0.2)', borderTopColor: 'var(--accent-primary)' }} />
      <div>
        <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 16 }}>{message}</p>
        {subtext && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{subtext}</p>}
      </div>
    </div>
  );
}
