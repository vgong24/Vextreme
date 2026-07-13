import React from 'react';

/** @type {import('./Checkbox').CheckboxProps} */
export function Checkbox({ label, checked, onChange, ...rest }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      <span
        onClick={() => onChange && onChange(!checked)}
        style={{
          width: 16,
          height: 16,
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${checked ? 'var(--accent-bg)' : 'var(--border-strong)'}`,
          background: checked ? 'var(--accent-bg)' : 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background var(--duration-fast) var(--ease-standard)',
        }}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="var(--accent-text-on)" strokeWidth="1.6" strokeLinecap="square" />
          </svg>
        )}
      </span>
      <span style={{ font: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>{label}</span>
    </label>
  );
}
