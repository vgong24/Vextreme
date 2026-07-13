import React from 'react';

/** @type {import('./Tooltip').TooltipProps} */
export function Tooltip({ label, children }) {
  const [show, setShow] = React.useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-inverse)',
            color: 'var(--text-inverse)',
            font: 'var(--text-mono-xs)',
            letterSpacing: 'var(--tracking-mono)',
            padding: '5px 9px',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-1)',
            zIndex: 60,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
