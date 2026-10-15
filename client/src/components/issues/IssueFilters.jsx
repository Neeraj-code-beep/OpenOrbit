import { Button } from "../common/Button.jsx";
import { Icon } from "../common/Icon.jsx";
import { Input } from "../common/Input.jsx";

const COMMON_LABELS = [
  "good-first-issue",
  "help wanted",
  "documentation",
  "bug",
  "enhancement",
];
const COMMON_LANGUAGES = ["javascript", "typescript", "python", "go", "rust"];
const DEFAULT_FILTERS = { query: "", label: "good-first-issue", language: "" };

export function IssueFilters({ filters, onChange, onSearch, isLoading }) {
  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 20,
      }}
    >
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <div style={{ flex: "2 1 240px", minWidth: 0 }}>
          <Input
            label="Search keywords"
            placeholder="e.g. fix memory leak, dark mode, refactor…"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
          />
        </div>

        <div className="field" style={{ flex: "1 1 160px" }}>
          <label htmlFor="issue-language" className="field-label">
            Language
          </label>
          <select
            id="issue-language"
            className="input-field"
            value={filters.language}
            onChange={(e) => onChange({ ...filters, language: e.target.value })}
          >
            <option value="">Any language</option>
            {COMMON_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="row-wrap">
          <Button type="submit" variant="primary" isLoading={isLoading}>
            <Icon name="search" size={16} /> Search issues
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onChange({ ...DEFAULT_FILTERS });
              onSearch({ ...DEFAULT_FILTERS });
            }}
          >
            Reset
          </Button>
        </div>
      </form>

      <div className="row-wrap" role="group" aria-label="Quick label filters">
        <span
          style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}
        >
          Quick labels
        </span>
        {COMMON_LABELS.map((l) => {
          const isSelected = filters.label === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() =>
                onChange({ ...filters, label: isSelected ? "" : l })
              }
              aria-pressed={isSelected}
              className={`badge ${isSelected ? "badge-primary" : "badge-label"}`}
            >
              {isSelected && <Icon name="check" size={12} />}
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
