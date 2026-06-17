'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Language, Theme } from '@/lib/types';
import { translations, THEMES } from '@/lib/translations';
import Icon, { IconName } from './Icon';

interface Props {
  language: Language;
  onNavigate: (tab: string) => void;
  onToggleLang: () => void;
  onThemeChange: (theme: Theme) => void;
}

interface Cmd { id: string; label: string; hint: string; icon: IconName; run: () => void; }

export default function CommandPalette({ language, onNavigate, onToggleLang, onThemeChange }: Props) {
  const t = translations[language];
  const isHe = language === 'he';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Cmd[] = useMemo(() => {
    const go = (tab: string) => () => { onNavigate(tab); setOpen(false); };
    const nav: Cmd[] = [
      { id: 'dashboard', label: t.nav.dashboard, hint: isHe ? 'מעבר' : 'GO', icon: 'dashboard', run: go('dashboard') },
      { id: 'analyze', label: t.form.title, hint: isHe ? 'פעולה' : 'RUN', icon: 'analyze', run: go('analyze') },
      { id: 'watchlist', label: t.nav.watchlist, hint: isHe ? 'מעבר' : 'GO', icon: 'watchlist', run: go('watchlist') },
      { id: 'history', label: t.nav.history, hint: isHe ? 'מעבר' : 'GO', icon: 'history', run: go('history') },
      { id: 'journal', label: t.nav.journal, hint: isHe ? 'מעבר' : 'GO', icon: 'journal', run: go('journal') },
      { id: 'lang', label: isHe ? 'החלף שפה (English)' : 'Switch Language (עברית)', hint: isHe ? 'הגדרה' : 'SET', icon: 'globe', run: () => { onToggleLang(); setOpen(false); } },
    ];
    const themes: Cmd[] = THEMES.map(th => ({
      id: `theme-${th.id}`,
      label: `${isHe ? 'ערכה' : 'Theme'}: ${isHe ? th.labelHe : th.label}`,
      hint: th.emoji,
      icon: 'palette' as IconName,
      run: () => { onThemeChange(th.id as Theme); setOpen(false); },
    }));
    return [...nav, ...themes];
  }, [t, isHe, onNavigate, onToggleLang, onThemeChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(c => c.label.toLowerCase().includes(q) || c.id.includes(q));
  }, [commands, query]);

  // global ⌘K / Ctrl+K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  useEffect(() => { setSel(0); }, [query]);

  if (!open) return null;

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[sel]?.run(); }
  };

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk" onClick={e => e.stopPropagation()} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="cmdk-search">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder={isHe ? 'הקלד פקודה או חפש…' : 'Type a command or search…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKey}
          />
          <kbd className="cmdk-esc">ESC</kbd>
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 ? (
            <div className="cmdk-empty">{isHe ? 'אין תוצאות' : 'No matches'}</div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.id}
                className={`cmdk-item ${i === sel ? 'active' : ''}`}
                onMouseEnter={() => setSel(i)}
                onClick={() => c.run()}
              >
                <span className="cmdk-icon"><Icon name={c.icon} size={16} /></span>
                <span className="cmdk-label">{c.label}</span>
                <span className="cmdk-hint">{c.hint}</span>
              </button>
            ))
          )}
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> {isHe ? 'ניווט' : 'navigate'}</span>
          <span><kbd>↵</kbd> {isHe ? 'בחר' : 'select'}</span>
          <span><kbd>⌘K</kbd> {isHe ? 'פתח/סגור' : 'toggle'}</span>
        </div>
      </div>
    </div>
  );
}
