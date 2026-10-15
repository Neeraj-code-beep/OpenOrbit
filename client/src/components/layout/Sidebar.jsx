export function Sidebar({ currentTab, onSelectTab, health }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
    { id: 'issues', label: 'Discover Issues', icon: '🎯' },
    { id: 'repository', label: 'Repository View', icon: '📦' },
    { id: 'contribution', label: 'Contribution Plan', icon: '🛠️' },
    { id: 'settings', label: 'Settings & Status', icon: '⚙️' },
  ];

  const aiStatus = health?.checks?.ai;
  const isHealthy = health?.status === 'HEALTHY';

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: 18, boxShadow: 'var(--shadow-glow)' }}>
          O
        </div>
        <div>
          <h2 style={{ fontSize: 17, margin: 0, fontWeight: 700, letterSpacing: '-0.03em' }}>OpenOrbit</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Contribution Assistant</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all var(--transition-fast)',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status Footprint */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            System Status
          </span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isHealthy ? 'var(--accent-emerald)' : 'var(--accent-amber)',
              boxShadow: isHealthy ? '0 0 8px var(--accent-emerald)' : '0 0 8px var(--accent-amber)',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Provider:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {aiStatus?.activeProvider || 'None'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>GitHub Rate:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {health?.checks?.github?.rateLimit?.remaining ?? '—'}/60
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
