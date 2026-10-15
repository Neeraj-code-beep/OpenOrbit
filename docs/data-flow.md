# Data Flow & Lifecycle in OpenOrbit

This document traces the lifecycle of user actions through the application layers.

## 1. Issue Discovery Flow

```
[User clicks 'Search Issues']
           |
           v
[React Component: IssuesPage]
           |
    api.searchIssues({ query, label, language })
           v
[Vite Dev Server Proxy (/api/github/issues)]
           |
           v
[Express Route: /api/github/issues]
           |
[Validator: validateIssueSearchQuery]
           |
[GitHubService: searchIssues]
           |
[GitHubClient: HTTP GET https://api.github.com/search/issues]
           |
[GitHubMapper: mapGitHubIssue]  <-- Normalizes fields, filters out PRs
           |
[Express JSON Response: 200 OK]
           |
[React State: setIssues()]
           v
[Render: IssueCard list]
```

---

## 2. Contribution Planning Flow

```
[User selects Issue & clicks 'Generate Plan']
           |
           v
[React Component: ContributionPage]
           |
    api.generateContributionPlan({ issueTitle, issueBody, repoOwner, repoName })
           v
[Express Route: /api/ai/contribution-plan]
           |
[Validator: validateContributionPlanBody]
           |
[GitHubService: getRepositoryReadme(owner, repo)]  <-- Gathers real repo context
           |
[PromptBuilder: buildContributionPlanPrompt()]      <-- Wraps untrusted text in XML
           |
[AIRouter: generateText()]                          <-- Dispatches to Gemini or Ollama
           |
[PlanValidator: parseAndValidatePlan()]             <-- Strict JSON schema verification
           |
[PRDescriptionService: generatePRDescription()]     <-- Drafts Markdown PR template
           |
[Express JSON Response: 200 OK]
           |
[React Component: ContributionPlan]                 <-- Displays steps & badges
```
