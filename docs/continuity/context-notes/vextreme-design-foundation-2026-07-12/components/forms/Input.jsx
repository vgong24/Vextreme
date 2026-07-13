import React from 'react';

/** @type {import('./Input').InputProps} */
export function Input({ label, hint, error, mono = false, style, ...rest }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)' }}>
      {label && (
        <span style={{ font: 'var(--text-label)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
      <input
        style={{
          font: mono ? 'var(--text-mono-md)' : 'var(--text-body)',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: `1px solid ${error ? 'var(--status-critical)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '9px 12px',
          outline: 'none',
          transition: 'border-color var(--duration-fast) var(--ease-standard)',
          ...style,
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
        onBlur={(e) => (e.target.style.borderColor = error ? 'var(--status-critical)' : 'var(--border-default)')}
        {...rest}
      />
      {(hint || error) && (
        <span style={{ font: 'var(--text-caption)', color: error ? 'var(--status-critical)' : 'var(--text-tertiary)' }}>
          {error || hint}
        </span>
      )}
    </label>
  );
}
