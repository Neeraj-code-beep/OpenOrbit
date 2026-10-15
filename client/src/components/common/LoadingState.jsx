export function LoadingState({ message = "Loading data...", subtext = "" }) {
  return (
    <div
      className="card state-panel"
      role="status"
      aria-live="polite"
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 14,
        padding: "48px 24px",
      }}
    >
      <div
        className="spinner"
        aria-hidden="true"
        style={{ width: 28, height: 28, borderWidth: 3 }}
      />
      <div>
        <p
          style={{
            fontWeight: 600,
            color: "var(--text-primary)",
            fontSize: 15,
          }}
        >
          {message}
        </p>
        {subtext && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
