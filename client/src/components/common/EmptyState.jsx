import { Button } from "./Button.jsx";
import { Icon } from "./Icon.jsx";

// `icon` may be an Icon name (preferred) or any short text/emoji.
export function EmptyState({
  icon = "search",
  title = "No results found",
  message,
  actionText,
  onAction,
}) {
  return (
    <div
      className="card state-panel"
      style={{
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 10,
        padding: "48px 24px",
      }}
    >
      <span className="state-icon" aria-hidden="true">
        {/^[a-z]+$/.test(icon) ? (
          <Icon name={icon} size={22} />
        ) : (
          <span style={{ fontSize: 20 }}>{icon}</span>
        )}
      </span>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ maxWidth: 440, fontSize: 14 }}>{message}</p>
      {actionText && onAction && (
        <div style={{ marginTop: 8 }}>
          <Button variant="primary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
