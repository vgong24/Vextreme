import React from 'react';

/** @type {import('./Switch').SwitchProps} */
export function Switch({ label, checked, onChange }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      <span
        onClick={() => onChange && onChange(!checked)}
        style={{
          width: 34,
          height: 19,
          borderRadius: 'var(--radius-full)',
          background: checked ? 'var(--accent-bg)' : 'var(--gray-4)',
          border: '1px solid var(--border-default)',
          position: 'relative',
          transition: 'background var(--duration-base) var(--ease-standard)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 1,
            left: checked ? 16 : 1,
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: checked ? 'var(--accent-text-on)' : 'var(--gray-9)',
            transition: 'left var(--duration-base) var(--ease-standard)',
          }}
        />
      </span>
      {label && <span style={{ font: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
