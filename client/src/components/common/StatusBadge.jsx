import { TONE_BADGE } from '../../utils/status.js';

// Text label is always shown, so state never depends on color alone.
export function StatusBadge({ status, className = '' }) {
  return (
    <span className={`badge ${TONE_BADGE[status.tone] || TONE_BADGE.neutral} ${className}`}>
      <span className={`badge-dot${status.tone === 'info' ? ' pulsing' : ''}`} aria-hidden="true" />
      {status.label}
    </span>
  );
}
