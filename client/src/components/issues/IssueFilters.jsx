import { Button } from '../common/Button.jsx';
import { Input } from '../common/Input.jsx';

export function IssueFilters({ filters, onChange, onSearch, isLoading }) {
  const commonLabels = [
    'good-first-issue',
    'help wanted',
    'documentation',
    'bug',
    'enhancement',
  ];

  const commonLanguages = [
    '',
    'javascript',
    'typescript',
    'python',
    'go',
    'rust',
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
        style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
      >
        <div style={{ flex: 2, minWidth: 240 }}>
          <Input
            label="Search Keywords"
            placeholder="e.g. fix memory leak, dark mode, refactor..."
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
          />
        </div>

        <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Language
          </label>
          <select
            className="input-field"
            value={filters.language}
            onChange={(e) => onChange({ ...filters, language: e.target.value })}
          >
            <option value="">Any Language</option>
            {commonLanguages.filter(Boolean).map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Search Issues
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onChange({ query: '', label: 'good-first-issue', language: '' });
              onSearch({ query: '', label: 'good-first-issue', language: '' });
            }}
          >
            Reset
          </Button>
        </div>
      </form>

      {/* Label Quick-Tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quick Labels:</span>
        {commonLabels.map((l) => {
          const isSelected = filters.label === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => {
                const nextLabel = isSelected ? '' : l;
                onChange({ ...filters, label: nextLabel });
              }}
              className={`badge ${isSelected ? 'badge-primary' : 'badge-label'}`}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
            >
              {isSelected ? '✓ ' : ''}{l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
