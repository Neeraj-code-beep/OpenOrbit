import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/apiClient.js";
import { useAuth } from "../lib/useAuth.js";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { HomePage } from "../features/marketing/HomePage.jsx";
import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";
import { IssuesPage } from "../features/issues/IssuesPage.jsx";
import { SavedIssuesPage } from "../features/saved/SavedIssuesPage.jsx";
import { RepositoryPage } from "../features/repositories/RepositoryPage.jsx";
import { ContributionPage } from "../features/contribution/ContributionPage.jsx";
import { AIAssistantPage } from "../features/assistant/AIAssistantPage.jsx";
import { SettingsPage } from "../features/settings/SettingsPage.jsx";
import { AuthModal } from "../components/auth/AuthModal.jsx";
import { Icon } from "../components/common/Icon.jsx";

const VALID_TABS = ["dashboard", "issues", "saved", "repository", "contribution", "assistant", "settings"];

function getInitialTab() {
  if (typeof window !== "undefined") {
    const cleanPath = window.location.pathname.replace(/^\/+/, "");
    if (VALID_TABS.includes(cleanPath)) {
      return cleanPath;
    }
  }
  return "dashboard";
}

export function App() {
  const { user, loading, openAuthModal } = useAuth();
  const [currentTab, setCurrentTab] = useState(getInitialTab);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [targetRepo, setTargetRepo] = useState(null);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [healthChecked, setHealthChecked] = useState(false);

  // Synchronize tab state with browser URL path
  const handleSelectTab = useCallback((tabId) => {
    setCurrentTab(tabId);
    if (typeof window !== "undefined") {
      const targetPath = tabId === "dashboard" ? "/" : `/${tabId}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, "", targetPath);
      }
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, "");
      if (VALID_TABS.includes(path)) {
        setCurrentTab(path);
      } else {
        setCurrentTab("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Operational health probe
  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
      setHealthError(null);
    } catch (err) {
      console.warn("Health check fetch failed:", err.message);
      setHealth(null);
      setHealthError(err);
    } finally {
      setHealthChecked(true);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  let healthConnection = "pending";
  if (healthChecked) healthConnection = healthError ? "unavailable" : "ready";

  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue);
    handleSelectTab("contribution");
  };

  const handleOpenRepo = (owner, name) => {
    setTargetRepo({ owner, name });
    handleSelectTab("repository");
  };

  const handleSearchRepoIssues = () => {
    handleSelectTab("issues");
  };

  // Header Titles Mapping
  const titles = {
    dashboard: {
      title: "Workspace Overview",
      subtitle: "Personalized backlog metrics, active contribution plans, and recommendations",
    },
    issues: {
      title: "Discover Issues",
      subtitle: "Explore real open-source issues with beginner-friendly labels",
    },
    saved: {
      title: "Saved Issues",
      subtitle: "Manage your private contribution backlog and track implementation notes",
    },
    repository: {
      title: "Repository Inspection",
      subtitle: "Review verified repository structure, stars, commits, and README context",
    },
    contribution: {
      title: "Contribution Planner",
      subtitle: "Step-by-step AI contribution plan & PR description generator",
    },
    assistant: {
      title: "AI Contribution Assistant",
      subtitle: "Interactive advice on repository architecture and pull request guidelines",
    },
    settings: {
      title: "Settings & Connections",
      subtitle: "GitHub account connection, authorization tickets, and runtime status",
    },
  };

  const currentMeta = titles[currentTab] || titles.dashboard;

  // 1. Loading screen during session restoration (zero content flash)
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            boxShadow: "var(--shadow-md)",
          }}
          className="pulsing"
        >
          <Icon name="sparkle" size={24} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
          Initializing OpenOrbit...
        </p>
      </div>
    );
  }

  // 2. Public Marketing Homepage for unauthenticated visitors
  if (!user) {
    return (
      <>
        <HomePage onExploreClick={() => openAuthModal("register")} />
        <AuthModal />
      </>
    );
  }

  // 3. Authenticated SaaS Workspace
  return (
    <>
      <AppLayout
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        headerTitle={currentMeta.title}
        headerSubtitle={currentMeta.subtitle}
        selectedIssue={selectedIssue}
        onClearSelectedIssue={() => setSelectedIssue(null)}
        health={health}
        healthConnection={healthConnection}
      >
        {currentTab === "dashboard" && (
          <DashboardPage
            onNavigate={handleSelectTab}
            selectedIssue={selectedIssue}
            onSelectIssue={handleSelectIssue}
          />
        )}

        {currentTab === "issues" && (
          <IssuesPage
            selectedIssue={selectedIssue}
            onSelectIssue={handleSelectIssue}
            onOpenRepo={handleOpenRepo}
          />
        )}

        {currentTab === "saved" && (
          <SavedIssuesPage
            onSelectIssueForPlan={handleSelectIssue}
            onDiscoverMore={() => handleSelectTab("issues")}
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
            onNavigateToIssues={() => handleSelectTab("issues")}
            onNavigateToSettings={() => handleSelectTab("settings")}
          />
        )}

        {currentTab === "assistant" && (
          <AIAssistantPage
            onNavigateToPlan={() => handleSelectTab("contribution")}
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
      <AuthModal />
    </>
  );
}

export default App;
