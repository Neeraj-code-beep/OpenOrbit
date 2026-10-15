# OpenOrbit Design System & Aesthetics

OpenOrbit follows modern, high-contrast dark mode aesthetics with glassmorphism to maximize developer focus and visual clarity.

## Visual Design Tokens

- **Background Palette:**
  - Base Deep Space: `#0a0e17`
  - Secondary Panel: `#111827`
  - Elevated Surface: `#1e293b`
  - Glass Card: `rgba(17, 24, 39, 0.75)` with `backdrop-filter: blur(12px)`
- **Accent & Status Colors:**
  - Brand Violet: `#6366f1` (`--accent-primary`)
  - Cyan Accent: `#06b6d4` (`--accent-cyan`)
  - Verified Facts Emerald: `#10b981` (`--accent-emerald`)
  - AI Suggestions Amber: `#f59e0b` (`--accent-amber`)
  - Danger / Error Rose: `#f43f5e` (`--accent-rose`)
- **Typography:**
  - Modern sans-serif system stack for UI reading.
  - Monospace font stack (`ui-monospace`, `Menlo`, `Consolas`) for repository paths, code snippets, and PR templates.

## Reusable Components

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| `Button` | `client/src/components/common/Button.jsx` | Polymorphic button with primary, secondary, and loading spinner states. |
| `Input` | `client/src/components/common/Input.jsx` | Accessible labeled input with error styling. |
| `LoadingState` | `client/src/components/common/LoadingState.jsx` | Spinner with contextual progress subtext. |
| `ErrorState` | `client/src/components/common/ErrorState.jsx` | Clean card with error code and retry button. |
| `EmptyState` | `client/src/components/common/EmptyState.jsx` | Informative empty screen with call-to-action. |
| `IssueCard` | `client/src/components/issues/IssueCard.jsx` | Detailed card with tags, comments, date, and select trigger. |
| `IssueFilters`| `client/src/components/issues/IssueFilters.jsx` | Keyword search, language filter, and quick label tags. |
| `ContributionPlan`| `client/src/components/contribution/ContributionPlan.jsx` | Full roadmap breakdown, verified badges, and PR markdown drawer. |
| `AppLayout` | `client/src/components/layout/AppLayout.jsx` | Sticky header with active issue indicator, responsive sidebar, and main page container. |
