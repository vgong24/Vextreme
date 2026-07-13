import React from 'react';

/** @type {import('./Badge').BadgeProps} */
export function Badge({ tone = 'neutral', variant = 'soft', children }) {
  const tones = {
    neutral: { fg: 'var(--text-secondary)', dot: 'var(--gray-6)' },
    success: { fg: 'var(--status-success)', dot: 'var(--status-success)' },
    caution: { fg: 'var(--status-caution)', dot: 'var(--status-caution)' },
    critical: { fg: 'var(--status-critical)', dot: 'var(--status-critical)' },
    info: { fg: 'var(--status-info)', dot: 'var(--status-info)' },
  };
  const t = tones[tone];

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    font: 'var(--text-mono-xs)',
    letterSpacing: 'var(--tracking-mono)',
    textTransform: 'uppercase',
  };

  const variants = {
    soft: { background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', color: t.fg },
    outline: { background: 'transparent', border: '1px solid var(--border-default)', color: t.fg },
  };

  return (
    <span style={{ ...base, ...variants[variant] }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
      {children}
    </span>
  );
}
