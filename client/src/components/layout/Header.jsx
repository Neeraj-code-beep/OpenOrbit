export function Header({ title, subtitle, selectedIssue, onClearSelectedIssue }) {
  return (
    <header
      style={{
        padding: '18px 32px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 14, 23, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, margin: '2px 0 0 0', color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      {selectedIssue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="badge badge-primary" style={{ padding: '6px 12px', fontSize: 13 }}>
            <span>Active Issue: #{selectedIssue.number} in {selectedIssue.repository?.fullName || 'repo'}</span>
          </div>
          <button
            onClick={onClearSelectedIssue}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 16,
              padding: 4,
            }}
            title="Deselect issue"
          >
            ✕
          </button>
        </div>
      )}
    </header>
  );
}
