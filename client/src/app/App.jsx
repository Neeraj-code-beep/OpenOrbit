import { useState, useEffect } from "react";
import { api } from "../lib/apiClient.js";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";
import { IssuesPage } from "../features/issues/IssuesPage.jsx";
import { RepositoryPage } from "../features/repositories/RepositoryPage.jsx";
import { ContributionPage } from "../features/contribution/ContributionPage.jsx";
import { SettingsPage } from "../features/settings/SettingsPage.jsx";

export function App() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [targetRepo, setTargetRepo] = useState(null);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [healthChecked, setHealthChecked] = useState(false);

  // 'pending' until the first attempt finishes, then 'ready' or 'unavailable'.
  let healthConnection = "pending";
  if (healthChecked) healthConnection = healthError ? "unavailable" : "ready";

  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
      setHealthError(null);
    } catch (err) {
      console.warn("Health check fetch failed:", err.message);
      // Drop stale data so an old "healthy" reading is never shown as current.
      setHealth(null);
      setHealthError(err);
    } finally {
      setHealthChecked(true);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Periodically update health every 60s
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue);
    setCurrentTab("contribution");
  };

  const handleOpenRepo = (owner, name) => {
    setTargetRepo({ owner, name });
    setCurrentTab("repository");
  };

  const handleSearchRepoIssues = () => {
    setCurrentTab("issues");
  };

  // Header Titles Mapping
  const titles = {
    dashboard: {
      title: "Dashboard",
      subtitle:
        "Overview of issues, contribution activity, and live integrations",
    },
    issues: {
      title: "Discover Issues",
      subtitle: "Explore real open-source issues with beginner-friendly labels",
    },
    repository: {
      title: "Repository Inspection",
      subtitle:
        "Review verified repository structure, stars, and README context",
    },
    contribution: {
      title: "Contribution Workspace",
      subtitle: "Step-by-step AI contribution plan & PR description generator",
    },
    settings: {
      title: "Settings & Status",
      subtitle: "Inspect active providers, rate limits, and MCP configuration",
    },
  };

  const currentMeta = titles[currentTab] || titles.dashboard;

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      headerTitle={currentMeta.title}
      headerSubtitle={currentMeta.subtitle}
      selectedIssue={selectedIssue}
      onClearSelectedIssue={() => setSelectedIssue(null)}
      health={health}
      healthConnection={healthConnection}
    >
      {currentTab === "dashboard" && (
        <DashboardPage
          health={health}
          healthConnection={healthConnection}
          healthError={healthError}
          onRetryHealth={fetchHealth}
          onNavigate={setCurrentTab}
          selectedIssue={selectedIssue}
        />
      )}

      {currentTab === "issues" && (
        <IssuesPage
          selectedIssue={selectedIssue}
          onSelectIssue={handleSelectIssue}
          onOpenRepo={handleOpenRepo}
        />
      )}

      {currentTab === "repository" && (
        <RepositoryPage
          targetRepo={targetRepo}
          onSearchRepoIssues={handleSearchRepoIssues}
        />
      )}

      {currentTab === "contribution" && (
        <ContributionPage
          selectedIssue={selectedIssue}
          onNavigateToIssues={() => setCurrentTab("issues")}
          onNavigateToSettings={() => setCurrentTab("settings")}
        />
      )}

      {currentTab === "settings" && (
        <SettingsPage
          health={health}
          healthConnection={healthConnection}
          healthError={healthError}
          onRefreshHealth={fetchHealth}
        />
      )}
    </AppLayout>
  );
}

export default App;
