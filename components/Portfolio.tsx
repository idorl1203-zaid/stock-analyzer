'use client';
import { useState, useEffect, useCallback } from 'react';
import { Language, Portfolio as PF, PaperPosition } from '@/lib/types';
import { translations } from '@/lib/translations';
import { getPortfolio, closePosition, resetPortfolio } from '@/lib/storage';
import Icon from './Icon';

interface Props { language: Language; refreshKey: number; }

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Portfolio({ language, refreshKey }: Props) {
  const t = translations[language];
  const isHe = language === 'he';
  const [pf, setPf] = useState<PF>({ cash: 0, startingCash: 100000, positions: [], trades: [] });
  const [prices, setPrices] = useState<Record<string, number>>({});

  const reload = useCallback(() => setPf(getPortfolio()), []);
  useEffect(() => { reload(); }, [reload, refreshKey]);

  const fetchPrices = useCallback(async (positions: PaperPosition[]) => {
    const syms = Array.from(new Set(positions.map(p => p.symbol)));
    if (!syms.length) return;
    try {
      const res = await fetch(`/api/ticker?symbols=${encodeURIComponent(syms.join(','))}`);
      const data = await res.json();
      const map: Record<string, number> = {};
      (data.ticks || []).forEach((tk: { symbol: string; price: number | null }) => { if (tk.price != null) map[tk.symbol] = tk.price; });
      setPrices(prev => ({ ...prev, ...map }));
    } catch { /* keep last */ }
  }, []);

  useEffect(() => {
    fetchPrices(pf.positions);
    const id = setInterval(() => fetchPrices(getPortfolio().positions), 30000);
    return () => clearInterval(id);
  }, [pf.positions, fetchPrices]);

  const cur = (p: PaperPosition) => prices[p.symbol] ?? p.entryPrice;
  const unreal = (p: PaperPosition) => (p.side === 'long' ? (cur(p) - p.entryPrice) : (p.entryPrice - cur(p))) * p.qty;
  const posValue = (p: PaperPosition) => p.entryPrice * p.qty + unreal(p);

  const openValue = pf.positions.reduce((s, p) => s + posValue(p), 0);
  const totalValue = pf.cash + openValue;
  const totalReturn = pf.startingCash ? ((totalValue - pf.startingCash) / pf.startingCash) * 100 : 0;
  const realized = pf.trades.reduce((s, tr) => s + tr.pnl, 0);
  const unrealized = pf.positions.reduce((s, p) => s + unreal(p), 0);
  const wins = pf.trades.filter(tr => tr.pnl > 0).length;
  const winRate = pf.trades.length ? Math.round((wins / pf.trades.length) * 100) : 0;

  const handleClose = (p: PaperPosition) => {
    if (closePosition(p.id, cur(p))) reload();
  };
  const handleReset = () => {
    if (confirm(isHe ? 'לאפס את התיק ל-$100,000?' : 'Reset portfolio to $100,000?')) { resetPortfolio(); reload(); }
  };

  return (
    <div className="result-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>{t.portfolio.title}</h1>
          <p>{t.portfolio.subtitle}</p>
        </div>
        <button className="btn-secondary" onClick={handleReset}><Icon name="refresh" size={14} /> {t.portfolio.reset}</button>
      </div>

      {/* vitals */}
      <div className="journal-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-value mono" style={{ color: 'var(--accent)' }}>{money(totalValue)}</div>
          <div className="stat-label">{t.portfolio.totalValue}</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value mono ${totalReturn >= 0 ? 'positive' : 'negative'}`}>{totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%</div>
          <div className="stat-label">{t.portfolio.totalReturn}</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value mono ${realized >= 0 ? 'positive' : 'negative'}`}>{realized >= 0 ? '+' : ''}{money(realized).slice(1)}</div>
          <div className="stat-label">{t.portfolio.realized}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value mono" style={{ color: 'var(--yellow)' }}>{winRate}%</div>
          <div className="stat-label">{t.portfolio.winRate} · {pf.trades.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value mono">{money(pf.cash).slice(0)}</div>
          <div className="stat-label">{t.portfolio.cash}</div>
        </div>
      </div>

      {/* open positions */}
      <div style={{ marginTop: '28px' }}>
        <div className="card-header" style={{ border: 'none', marginBottom: '12px', paddingBottom: 0 }}>
          <div className="card-icon"><Icon name="briefcase" /></div>
          <h2>{t.portfolio.openPositions} · {pf.positions.length}</h2>
          {pf.positions.length > 0 && <span className={`mono ${unrealized >= 0 ? 'positive' : 'negative'}`} style={{ marginInlineStart: 'auto', fontSize: '13px', fontWeight: 700 }}>{unrealized >= 0 ? '+' : ''}{money(unrealized).slice(1)}</span>}
        </div>
        {pf.positions.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"><Icon name="briefcase" size={52} strokeWidth={1.5} /></div><p>{t.portfolio.emptyOpen}</p></div>
        ) : (
          <div className="history-list">
            {pf.positions.map(p => {
              const u = unreal(p), up = u >= 0;
              return (
                <div key={p.id} className="history-item" style={{ cursor: 'default' }}>
                  <span className={`badge ${p.side === 'long' ? 'badge-buy' : 'badge-sell'}`}>{p.side === 'long' ? (isHe ? 'לונג' : 'LONG') : (isHe ? 'שורט' : 'SHORT')}</span>
                  <div className="history-info">
                    <div className="history-name">{p.symbol} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '12px' }}>×{p.qty}</span></div>
                    <div className="history-meta">{isHe ? 'כניסה' : 'entry'} {money(p.entryPrice)} → {money(cur(p))}</div>
                  </div>
                  <div style={{ textAlign: isHe ? 'left' : 'right' }}>
                    <div className={`mono ${up ? 'positive' : 'negative'}`} style={{ fontWeight: 700, fontSize: '14px' }}>{up ? '+' : ''}{money(u).slice(1)}</div>
                    <div className={`mono ${up ? 'positive' : 'negative'}`} style={{ fontSize: '11px' }}>{up ? '+' : ''}{(u / (p.entryPrice * p.qty) * 100).toFixed(2)}%</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={() => handleClose(p)}>{t.portfolio.close}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* closed trades */}
      {pf.trades.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <div className="card-header" style={{ border: 'none', marginBottom: '12px', paddingBottom: 0 }}>
            <div className="card-icon"><Icon name="history" /></div>
            <h2>{t.portfolio.closedTrades}</h2>
          </div>
          <div className="history-list">
            {pf.trades.map(tr => {
              const up = tr.pnl >= 0;
              return (
                <div key={tr.id + tr.closedAt} className="history-item" style={{ cursor: 'default' }}>
                  <span className={`badge ${tr.side === 'long' ? 'badge-buy' : 'badge-sell'}`}>{tr.side === 'long' ? 'L' : 'S'}</span>
                  <div className="history-info">
                    <div className="history-name">{tr.symbol} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '12px' }}>×{tr.qty}</span></div>
                    <div className="history-meta">{money(tr.entryPrice)} → {money(tr.exitPrice)} · {new Date(tr.closedAt).toLocaleDateString(isHe ? 'he-IL' : 'en-US')}</div>
                  </div>
                  <div style={{ textAlign: isHe ? 'left' : 'right' }}>
                    <div className={`mono ${up ? 'positive' : 'negative'}`} style={{ fontWeight: 700, fontSize: '14px' }}>{up ? '+' : ''}{money(tr.pnl).slice(1)}</div>
                    <div className={`mono ${up ? 'positive' : 'negative'}`} style={{ fontSize: '11px' }}>{up ? '+' : ''}{tr.pnlPercent.toFixed(2)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="disclaimer">{t.portfolio.disclaimer}</div>
    </div>
  );
}
