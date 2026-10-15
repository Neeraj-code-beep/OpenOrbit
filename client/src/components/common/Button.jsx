export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      onClick={onClick}
      {...props}
    >
      {isLoading && (
        <span
          className="spinner"
          aria-hidden="true"
          style={{ width: 14, height: 14 }}
        />
      )}
      {children}
    </button>
  );
}
