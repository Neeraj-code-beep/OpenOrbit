import { Sidebar } from "./Sidebar.jsx";
import { Header } from "./Header.jsx";
import { getNavLabel } from "./navigation.js";

export function AppLayout({
  currentTab,
  onSelectTab,
  headerTitle,
  headerSubtitle,
  selectedIssue,
  onClearSelectedIssue,
  health,
  healthConnection,
  children,
}) {
  return (
    <div className="app-container">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        health={health}
        healthConnection={healthConnection}
      />
      <div className="main-content">
        <Header
          title={headerTitle}
          section={getNavLabel(currentTab)}
          subtitle={headerSubtitle}
          selectedIssue={selectedIssue}
          onClearSelectedIssue={onClearSelectedIssue}
        />
        <main id="main-content" className="page-wrapper" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
