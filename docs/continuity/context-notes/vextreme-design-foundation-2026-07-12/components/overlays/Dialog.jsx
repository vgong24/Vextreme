import React from 'react';

/** @type {import('./Dialog').DialogProps} */
export function Dialog({ open, title, children, footer, onClose }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'color-mix(in oklch, var(--black) 55%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          background: 'var(--bg-surface-raised)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-2)',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {title && <div style={{ font: 'var(--text-h3)', color: 'var(--text-primary)' }}>{title}</div>}
        <div style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>{footer}</div>}
      </div>
    </div>
  );
}
