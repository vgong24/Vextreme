import React from 'react';

/** @type {import('./Card').CardProps} */
export function Card({ eyebrow, title, children, footer, raised = false, style }) {
  return (
    <div
      style={{
        background: raised ? 'var(--bg-surface-raised)' : 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      {eyebrow && (
        <div style={{ font: 'var(--text-mono-xs)', letterSpacing: 'var(--tracking-mono)', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          {eyebrow}
        </div>
      )}
      {title && <div style={{ font: 'var(--text-h3)', color: 'var(--text-primary)' }}>{title}</div>}
      {children && <div style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>{children}</div>}
      {footer && (
        <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
