import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';

export function AppLayout({ currentTab, onSelectTab, headerTitle, headerSubtitle, selectedIssue, onClearSelectedIssue, health, children }) {
  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} health={health} />
      <div className="main-content">
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          selectedIssue={selectedIssue}
          onClearSelectedIssue={onClearSelectedIssue}
        />
        <main className="page-wrapper">{children}</main>
      </div>
    </div>
  );
}
