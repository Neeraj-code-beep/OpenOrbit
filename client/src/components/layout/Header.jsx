import { Icon } from "../common/Icon.jsx";

export function Header({
  title,
  subtitle,
  section,
  selectedIssue,
  onClearSelectedIssue,
}) {
  const issueLabel = `#${selectedIssue?.number} in ${selectedIssue?.repository?.fullName || "repo"}`;

  return (
    <header className="app-header">
      <div className="app-header-text">
        {section && (
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>OpenOrbit</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{section}</span>
          </nav>
        )}
        <h1 className="app-header-title">{title}</h1>
        {subtitle && <p className="app-header-subtitle">{subtitle}</p>}
      </div>

      {selectedIssue && (
        <div className="app-header-issue">
          <span className="issue-chip" title={`Active issue ${issueLabel}`}>
            <span className="issue-chip-label">Active issue</span>
            <span className="issue-chip-value">{issueLabel}</span>
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={onClearSelectedIssue}
            aria-label="Deselect active issue"
            title="Deselect issue"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
