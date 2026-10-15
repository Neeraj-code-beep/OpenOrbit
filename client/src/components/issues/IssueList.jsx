import { IssueCard } from "./IssueCard.jsx";
import { LoadingState } from "../common/LoadingState.jsx";
import { ErrorState } from "../common/ErrorState.jsx";
import { EmptyState } from "../common/EmptyState.jsx";

export function IssueList({
  issues,
  isLoading,
  error,
  selectedIssue,
  onSelectIssue,
  onOpenRepo,
  onRetry,
}) {
  if (isLoading) {
    return (
      <LoadingState
        message="Discovering GitHub issues..."
        subtext="Fetching real issues from GitHub REST API"
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load GitHub issues"
        message={error.message || "Error occurred while contacting GitHub"}
        code={error.code}
        onRetry={onRetry}
      />
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <EmptyState
        icon="issues"
        title="No matching issues found"
        message="Try adjusting your keywords, language filter, or selecting a different label."
        actionText="Reset Filters"
        onAction={onRetry}
      />
    );
  }

  return (
    <div className="issue-list">
      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          isSelected={selectedIssue?.id === issue.id}
          onSelect={onSelectIssue}
          onOpenRepo={onOpenRepo}
        />
      ))}
    </div>
  );
}
