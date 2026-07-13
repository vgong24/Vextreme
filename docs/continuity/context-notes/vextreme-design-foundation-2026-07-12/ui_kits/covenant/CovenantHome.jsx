import React from 'react';
import { Button } from '../../components/core/Button.jsx';
import { Badge } from '../../components/core/Badge.jsx';

export function CovenantHome({ theme, onToggleTheme }) {
  return (
    <div data-theme={theme} style={{ background: 'var(--bg-canvas)', minHeight: '100%', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 120 120" fill="none" style={{ color: 'var(--text-primary)' }}>
            <path d="M 51.89 109.32 A 50 50 0 1 1 68.11 109.32 L 39.73 35.68 L 60 65.41 L 80.27 35.68 Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span style={{ font: '500 1.125rem/1 var(--font-serif)' }}>Vextreme</span>
        </div>
        <nav style={{ display: 'flex', gap: 28, font: 'var(--text-label)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          <span>Covenant</span>
          <span>Map</span>
          <span>Workbench</span>
        </nav>
        <Button variant="outline" size="sm" onClick={onToggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'} Mode</Button>
      </header>

      <section style={{ padding: '96px 48px 72px', maxWidth: 900, margin: '0 auto', textAlign: 'left' }}>
        <div style={{ font: 'var(--text-mono-sm)', letterSpacing: 'var(--tracking-mono)', color: 'var(--text-tertiary)', marginBottom: 20, textTransform: 'uppercase' }}>
          The Vextreme Covenant
        </div>
        <h1 style={{ font: 'var(--text-display)', letterSpacing: 'var(--tracking-display)', margin: '0 0 24px', maxWidth: 780 }}>
          Hidden relationships, made perceivable.
        </h1>
        <p style={{ font: 'var(--text-body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--measure)', margin: '0 0 32px' }}>
          Vextreme turns the decisions, dependencies, and evidence behind complex work into interfaces
          people — and the AI working alongside them — can navigate, question, and continue safely.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="primary">Read the Covenant</Button>
          <Button variant="ghost">Explore the Map</Button>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border-subtle)', padding: '56px 48px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
        {[
          { eyebrow: 'Principle 01', title: 'Perceivable', body: 'What is true about a decision should be visible to the people it affects.' },
          { eyebrow: 'Principle 02', title: 'Accountable', body: 'Every claim traces to evidence. Provenance is never optional.' },
          { eyebrow: 'Principle 03', title: 'Continuable', body: 'Work should survive a handoff — between people, tools, or AI.' },
        ].map((p) => (
          <div key={p.title} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 24, background: 'var(--bg-surface)' }}>
            <div style={{ font: 'var(--text-mono-xs)', letterSpacing: 'var(--tracking-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 12 }}>{p.eyebrow}</div>
            <div style={{ font: '500 1.25rem/1.3 var(--font-serif)', marginBottom: 10 }}>{p.title}</div>
            <div style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>{p.body}</div>
          </div>
        ))}
      </section>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: 'var(--text-mono-xs)', letterSpacing: 'var(--tracking-mono)', color: 'var(--text-tertiary)' }}>© VEXTREME · GITHUB PAGES</span>
        <Badge tone="info">v1 Covenant</Badge>
      </footer>
    </div>
  );
}
