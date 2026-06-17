'use client';
import { useEffect, useState } from 'react';
import { Language, Theme } from '@/lib/types';
import { getWatchlist } from '@/lib/storage';

interface Props {
  language: Language;
  theme: Theme;
  refreshKey: number;
}

interface Tick { symbol: string; price?: number; changePercent?: number | null; }

const SEED: Tick[] = [
  { symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'NVDA' }, { symbol: 'TSLA' },
  { symbol: 'AMZN' }, { symbol: 'GOOGL' }, { symbol: 'META' }, { symbol: 'SPY' },
];

function useMarketStatus() {
  const [open, setOpen] = useState(false);
  const [etTime, setEtTime] = useState('--:--:--');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = et.getDay();
      const mins = et.getHours() * 60 + et.getMinutes();
      setOpen(day >= 1 && day <= 5 && mins >= 570 && mins < 960);
      setEtTime(et.toLocaleTimeString('en-GB', { hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { open, etTime };
}

export default function TopBar({ language, refreshKey }: Props) {
  const [ticks, setTicks] = useState<Tick[]>(SEED);
  const { open, etTime } = useMarketStatus();
  const isHe = language === 'he';

  useEffect(() => {
    let alive = true;
    const DEFAULTS = SEED.map(s => s.symbol);
    const load = async () => {
      const wl = getWatchlist().map(w => w.symbol);
      const syms = Array.from(new Set([...wl, ...DEFAULTS])).slice(0, 16);
      try {
        const res = await fetch(`/api/ticker?symbols=${encodeURIComponent(syms.join(','))}`);
        const data = await res.json();
        if (alive && Array.isArray(data.ticks) && data.ticks.length) {
          setTicks(data.ticks.map((t: { symbol: string; price: number | null; changePercent: number | null }) => ({
            symbol: t.symbol,
            price: t.price ?? undefined,
            changePercent: t.changePercent,
          })));
        }
      } catch { /* keep last good data */ }
    };
    load();
    const id = setInterval(load, 60000); // live feed refresh (rate-limit friendly)
    return () => { alive = false; clearInterval(id); };
  }, [refreshKey]);

  // duplicate for seamless marquee loop
  const stream = [...ticks, ...ticks, ...ticks];

  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <span className="top-bar-logo">◈</span>
        <span className="top-bar-name">STOCK<span className="accent">AI</span></span>
        <span className="top-bar-sub">// TERMINAL</span>
      </div>

      <div className="ticker" dir="ltr">
        <div className="ticker-track">
          {stream.map((t, i) => {
            const pct = t.changePercent;
            const up = (pct ?? 0) >= 0;
            const hasData = t.price != null && pct != null;
            return (
              <span className="tick" key={i}>
                <span className="tick-sym">{t.symbol}</span>
                {hasData ? (
                  <>
                    <span className="tick-price">{t.price!.toFixed(2)}</span>
                    <span className={`tick-chg ${up ? 'pos' : 'neg'}`}>{up ? '▲' : '▼'} {Math.abs(pct!).toFixed(2)}%</span>
                  </>
                ) : (
                  <span className="tick-idle">—</span>
                )}
                <span className="tick-div">·</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="top-bar-status">
        <button
          className="cmd-trigger"
          title={isHe ? 'לוח פקודות' : 'Command palette'}
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
          <kbd>⌘</kbd><kbd>K</kbd>
        </button>
        <span className={`mkt ${open ? 'open' : 'closed'}`}>
          <span className="live-dot" />
          {open ? (isHe ? 'שוק פתוח' : 'MARKET OPEN') : (isHe ? 'שוק סגור' : 'MARKET CLOSED')}
        </span>
        <span className="mkt-clock">{etTime} <span className="tz">ET</span></span>
      </div>
    </header>
  );
}
