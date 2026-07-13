import React from 'react';

/** @type {import('./Button').ButtonProps} */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: { padding: '6px 12px', font: 'var(--text-body-sm)' },
    md: { padding: '9px 16px', font: 'var(--text-body-sm)' },
    lg: { padding: '12px 20px', font: 'var(--text-body)' },
  };

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    letterSpacing: '0.01em',
    ...sizes[size],
  };

  const variants = {
    primary: {
      background: 'var(--accent-bg)',
      color: 'var(--accent-text-on)',
      borderColor: 'var(--accent-bg)',
    },
    secondary: {
      background: 'var(--bg-surface-raised)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-default)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-primary)',
      borderColor: 'transparent',
    },
    outline: {
      background: 'transparent',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-strong)',
    },
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
