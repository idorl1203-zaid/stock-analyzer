'use client';
import { useEffect, useState } from 'react';
import { Language, Theme } from '@/lib/types';
import { THEMES } from '@/lib/translations';

interface Props {
  language: Language;
  theme: Theme;
  activeTab: string;
}

export default function StatusBar({ language, theme, activeTab }: Props) {
  const isHe = language === 'he';
  const [latency, setLatency] = useState(12);
  const [clock, setClock] = useState('--:--:--');

  useEffect(() => {
    const id = setInterval(() => {
      setLatency(8 + Math.floor(Math.random() * 16));
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1500);
    setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    return () => clearInterval(id);
  }, []);

  const themeName = THEMES.find(t => t.id === theme);
  const tabName = activeTab.toUpperCase();

  return (
    <footer className="status-bar" dir="ltr">
      <div className="status-left">
        <span className="status-seg status-online"><span className="live-dot" /> SYS ONLINE</span>
        <span className="status-seg">LATENCY <b>{latency}ms</b></span>
        <span className="status-seg status-hide-sm">FEED <b className="ok">SECURE</b></span>
      </div>
      <div className="status-right">
        <span className="status-seg status-hide-sm">VIEW <b>{tabName}</b></span>
        <span className="status-seg">{themeName?.emoji} <b>{(themeName?.label || theme).toUpperCase()}</b></span>
        <span className="status-seg">LANG <b>{isHe ? 'HE' : 'EN'}</b></span>
        <span className="status-seg status-clock">{clock}</span>
      </div>
    </footer>
  );
}
