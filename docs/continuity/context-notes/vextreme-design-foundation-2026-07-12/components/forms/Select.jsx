import React from 'react';

/** @type {import('./Select').SelectProps} */
export function Select({ label, options = [], style, ...rest }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)' }}>
      {label && (
        <span style={{ font: 'var(--text-label)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
      <select
        style={{
          font: 'var(--text-body)',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '9px 12px',
          outline: 'none',
          ...style,
        }}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
