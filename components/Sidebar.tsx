'use client';
import { Language, Theme } from '@/lib/types';
import { translations, THEMES } from '@/lib/translations';
import { useState } from 'react';
import Icon, { IconName } from './Icon';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  onToggleLang: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function Sidebar({ activeTab, setActiveTab, language, onToggleLang, theme, onThemeChange }: SidebarProps) {
  const t = translations[language];
  const [showThemePicker, setShowThemePicker] = useState(false);

  const tabs: { id: string; icon: IconName; label: string }[] = [
    { id: 'dashboard', icon: 'dashboard', label: t.nav.dashboard },
    { id: 'analyze', icon: 'analyze', label: t.nav.analyze },
    { id: 'watchlist', icon: 'watchlist', label: t.nav.watchlist },
    { id: 'portfolio', icon: 'briefcase', label: t.nav.portfolio },
    { id: 'history', icon: 'history', label: t.nav.history },
    { id: 'journal', icon: 'journal', label: t.nav.journal },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">SA</div>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <Icon name={tab.icon} />
          <span className="nav-tooltip">{tab.label}</span>
        </button>
      ))}
      <div className="sidebar-bottom">
        {/* Theme Picker */}
        <div style={{ position: 'relative' }}>
          <button
            className="nav-item"
            onClick={() => setShowThemePicker(p => !p)}
          >
            <Icon name="palette" />
            <span className="nav-tooltip">{t.theme.label}</span>
          </button>
          {showThemePicker && (
            <div style={{
              position: 'absolute',
              left: language === 'he' ? 'auto' : '64px',
              right: language === 'he' ? '64px' : 'auto',
              bottom: '0',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '8px',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '160px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px' }}>
                {t.theme.label}
              </div>
              {THEMES.map(th => (
                <button
                  key={th.id}
                  onClick={() => { onThemeChange(th.id as Theme); setShowThemePicker(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: theme === th.id ? '1px solid var(--accent)' : '1px solid transparent',
                    background: theme === th.id ? 'var(--accent-glow)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: language === 'he' ? 'right' : 'left',
                    width: '100%',
                    fontFamily: 'var(--font-ui)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{th.emoji}</span>
                  <span>{language === 'he' ? th.labelHe : th.label}</span>
                  {theme === th.id && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language toggle */}
        <button className="nav-item" onClick={onToggleLang} style={{ flexDirection: 'column', gap: '1px' }}>
          <Icon name="globe" size={17} />
          <span style={{ fontSize: '8px', fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            {language === 'en' ? 'HE' : 'EN'}
          </span>
          <span className="nav-tooltip">{language === 'en' ? 'עברית' : 'English'}</span>
        </button>
      </div>
    </nav>
  );
}
