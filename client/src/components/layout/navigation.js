// Single source of truth for the app's top-level workspace screens.
export const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
      { id: 'issues', label: 'Discover Issues', icon: 'issues' },
      { id: 'saved', label: 'Saved Issues', icon: 'bookmark' },
      { id: 'repository', label: 'Repositories', icon: 'repository' },
      { id: 'contribution', label: 'Contribution Planner', icon: 'contribution' },
      { id: 'assistant', label: 'AI Assistant', icon: 'bot' },
    ],
  },
  {
    label: 'Account & System',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export function getNavLabel(id) {
  for (const group of NAV_GROUPS) {
    const found = group.items.find((item) => item.id === id);
    if (found) return found.label;
  }
  return '';
}
