// Single source of truth for the app's top-level screens.
export const NAV_GROUPS = [
  {
    label: 'Menu',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'issues', label: 'Discover Issues', icon: 'issues' },
      { id: 'repository', label: 'Repository View', icon: 'repository' },
      { id: 'contribution', label: 'Contribution Plan', icon: 'contribution' },
    ],
  },
  {
    label: 'General',
    items: [{ id: 'settings', label: 'Settings & Status', icon: 'settings' }],
  },
];

export function getNavLabel(id) {
  for (const group of NAV_GROUPS) {
    const found = group.items.find((item) => item.id === id);
    if (found) return found.label;
  }
  return '';
}
