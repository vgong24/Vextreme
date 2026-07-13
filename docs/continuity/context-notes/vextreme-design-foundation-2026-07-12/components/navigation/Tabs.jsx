import React from 'react';

/** @type {import('./Tabs').TabsProps} */
export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-sans)' }}>
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            onClick={() => onChange && onChange(tab.value)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--text-primary)' : 'transparent'}`,
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              font: 'var(--text-label)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              padding: '10px 2px',
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color var(--duration-fast) var(--ease-standard)',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
