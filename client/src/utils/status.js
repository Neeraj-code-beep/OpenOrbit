/**
 * Maps data the frontend actually receives from `GET /api/health` to a
 * display state. Nothing here invents values: if the backend did not report
 * something, the result is "Unknown"; if the request itself failed, it is
 * "Unavailable"; while the first request is in flight, it is "Pending".
 *
 * `connection` describes the health request itself:
 *   'pending'     - no response received yet
 *   'ready'       - a response was received
 *   'unavailable' - the request failed (network error, 502, non-JSON, ...)
 */

export const TONE_BADGE = {
  success: 'badge-verified',
  warning: 'badge-suggested',
  danger: 'badge-danger',
  info: 'badge-primary',
  neutral: 'badge-label',
  unconfigured: 'badge-unconfigured',
};

const PENDING = { label: 'Pending', tone: 'info' };
const UNAVAILABLE = { label: 'Unavailable', tone: 'danger' };
const UNKNOWN = { label: 'Unknown', tone: 'neutral' };
const UNCONFIGURED = { label: 'Unconfigured', tone: 'unconfigured' };

// Returns a state when the section cannot be interpreted, otherwise null.
function guard(section, connection) {
  if (connection === 'pending') return PENDING;
  if (connection === 'unavailable') return UNAVAILABLE;
  if (!section) return UNKNOWN;
  return null;
}

export function overallStatus(health, connection) {
  const blocked = guard(health?.status ? health : null, connection);
  if (blocked) return blocked;
  if (health.status === 'HEALTHY') return { label: 'Healthy', tone: 'success' };
  if (String(health.status).startsWith('DEGRADED')) return { label: 'Degraded', tone: 'warning' };
  return UNKNOWN;
}

export function githubStatus(gh, connection) {
  const blocked = guard(gh, connection);
  if (blocked) return blocked;
  switch (gh.status) {
    case 'HEALTHY': return { label: 'Healthy', tone: 'success' };
    case 'RATE_LIMITED': return { label: 'Rate limited', tone: 'warning' };
    case 'ERROR': return { label: 'Error', tone: 'danger' };
    default: return UNKNOWN;
  }
}

// A single AI provider entry (`checks.ai.gemini` / `checks.ai.ollama`).
export function providerStatus(provider, connection) {
  const blocked = guard(provider, connection);
  if (blocked) return blocked;
  switch (provider.status) {
    case 'AVAILABLE': return { label: 'Available', tone: 'success' };
    case 'UNCONFIGURED': return UNCONFIGURED;
    case 'MODEL_MISSING': return { label: 'Model missing', tone: 'warning' };
    case 'OFFLINE': return { label: 'Offline', tone: 'danger' };
    case 'UNREACHABLE': return { label: 'Unreachable', tone: 'danger' };
    default: return UNKNOWN;
  }
}

// The provider currently selected by the backend (`checks.ai.activeProvider`).
export function activeProviderEntry(ai) {
  const name = ai?.activeProvider;
  return name ? ai?.[name] : undefined;
}

export function mcpStatus(mcp, connection) {
  const blocked = guard(mcp, connection);
  if (blocked) return blocked;
  switch (mcp.status) {
    case 'TOOLS_AVAILABLE': return { label: 'Connected', tone: 'success' };
    case 'CONNECTED': return { label: 'Connected', tone: 'success' };
    case 'CONNECTING': return PENDING;
    case 'PENDING_SERVER_CONFIG': return UNCONFIGURED;
    case 'DISCONNECTED': return { label: 'Disconnected', tone: 'neutral' };
    case 'ERROR': return { label: 'Error', tone: 'danger' };
    default: return UNKNOWN;
  }
}

// Rate-limit numbers are only real when GitHub was actually reached. On a
// failed check the backend fills in placeholder values, so they are hidden.
export function githubRate(gh) {
  if (!gh || gh.status === 'ERROR' || !gh.rateLimit) return null;
  const { remaining, limit } = gh.rateLimit;
  if (remaining == null) return null;
  return { remaining, limit: limit ?? null };
}

// Text for the "health endpoint did not respond" notice.
export function describeHealthError(error) {
  if (!error) return { message: 'The health endpoint did not respond.', code: undefined };
  const code = error.status ? `HTTP ${error.status} · ${error.code}` : error.code;
  return { message: error.message, code };
}
