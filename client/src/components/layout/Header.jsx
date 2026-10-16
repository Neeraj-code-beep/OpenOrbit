import { Icon } from "../common/Icon.jsx";
import { Button } from "../common/Button.jsx";
import { useAuth } from "../../lib/useAuth.js";

export function Header({
  title,
  subtitle,
  section,
  selectedIssue,
  onClearSelectedIssue,
}) {
  const {
    user,
    loading,
    authError,
    authNotice,
    clearAuthError,
    clearAuthNotice,
    openAuthModal,
    logout,
  } = useAuth();

  const issueLabel = `#${selectedIssue?.number} in ${selectedIssue?.repository?.fullName || "repo"}`;

  return (
    <header className="app-header">
      <div className="app-header-left">
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
      </div>

      <div className="app-header-right">
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

        <div className="app-header-auth">
          {loading ? (
            <div className="auth-loading-placeholder" aria-label="Loading authentication">
              <span className="spinner" style={{ width: 14, height: 14 }} />
            </div>
          ) : user ? (
            <div className="user-profile-badge">
              <div className="user-avatar" title={user.name || user.email}>
                {user.githubAvatarUrl ? (
                  <img
                    src={user.githubAvatarUrl}
                    alt={user.name || "User avatar"}
                    className="avatar-img"
                  />
                ) : (
                  <span className="avatar-initial">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="user-details">
                <span className="user-name">
                  {user.name || user.githubUsername || user.email}
                </span>
                {user.githubConnected && (
                  <span
                    className="user-github-indicator"
                    title={`Connected to GitHub (${user.githubUsername || "linked"})`}
                  >
                    <Icon name="github" size={12} />
                    <span>{user.githubUsername ? `@${user.githubUsername}` : "GitHub"}</span>
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="btn-logout"
                title="Sign out"
                aria-label="Sign out"
              >
                <Icon name="logout" size={14} />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <div className="auth-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuthModal("login")}
              >
                Sign in
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openAuthModal("register")}
              >
                Sign up
              </Button>
            </div>
          )}
        </div>
      </div>

      {(authNotice || authError) && (
        <div className="app-header-banners">
          {authNotice && (
            <div className="header-banner banner-success" role="status">
              <Icon name="check" size={16} />
              <span>{authNotice}</span>
              <button
                type="button"
                className="icon-btn banner-close"
                onClick={clearAuthNotice}
                aria-label="Dismiss notice"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          )}
          {authError && (
            <div className="header-banner banner-danger" role="alert">
              <Icon name="alert" size={16} />
              <span>{authError}</span>
              <button
                type="button"
                className="icon-btn banner-close"
                onClick={clearAuthError}
                aria-label="Dismiss alert"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
