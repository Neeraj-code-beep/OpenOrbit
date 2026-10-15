import { Button } from "./Button.jsx";
import { Icon } from "./Icon.jsx";

// The API client uses these generic codes when the response carried no
// structured backend error (network failure, or a proxy 502 with a non-JSON body).
const UNSTRUCTURED_CODES = ["NETWORK_ERROR", "API_ERROR"];

export function ErrorState({
  title = "Something went wrong",
  message,
  code,
  onRetry,
}) {
  const maybeUnreachable = UNSTRUCTURED_CODES.includes(code);

  return (
    <div
      className="card state-panel"
      role="alert"
      style={{
        borderColor: "var(--status-danger-border)",
        borderLeft: "4px solid var(--accent-rose)",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <span className="state-icon is-danger" aria-hidden="true">
        <Icon name="alert" size={22} />
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minWidth: 0,
          flex: 1,
        }}
      >
        <h3 style={{ color: "var(--status-danger)", margin: 0 }}>{title}</h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 14,
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </p>
        {maybeUnreachable && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            The OpenOrbit API returned no structured response. The backend may
            be offline or unreachable (it is expected on port 5000 during
            development).
          </p>
        )}
        {code && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-muted)",
              overflowWrap: "anywhere",
            }}
          >
            Code: {code}
          </span>
        )}
        {onRetry && (
          <div style={{ marginTop: 4 }}>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <Icon name="refresh" size={14} /> Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
