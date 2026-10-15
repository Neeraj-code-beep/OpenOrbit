export function Input({
  label,
  error,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-field ${className}`}
        style={error ? { borderColor: 'var(--accent-rose)' } : {}}
        {...props}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--accent-rose)' }}>{error}</span>}
    </div>
  );
}
