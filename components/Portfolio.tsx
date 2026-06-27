'use client';
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Language, Portfolio as PF, PaperPosition, PaperTrade } from '@/lib/types';
import { translations } from '@/lib/translations';
import { getPortfolio, closePosition, resetPortfolio, updatePosition, openPosition, generateId } from '@/lib/storage';
import Icon from './Icon';
import ModalPortal from './ModalPortal';

interface Props { language: Language; refreshKey: number; }

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Portfolio({ language, refreshKey }: Props) {
  const t = translations[language];
  const isHe = language === 'he';
  const [pf, setPf] = useState<PF>({ cash: 0, startingCash: 100000, positions: [], trades: [] });
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [eSL, setESL] = useState(''); const [eTP, setETP] = useState('');

  // Manual "open position" modal
  const [showOpen, setShowOpen] = useState(false);
  const [oSym, setOSym] = useState('');
  const [oSide, setOSide] = useState<'long' | 'short'>('long');
  const [oAmount, setOAmount] = useState('1000');
  const [oSL, setOSL] = useState(''); const [oTP, setOTP] = useState('');
  const [oPrice, setOPrice] = useState<number | null>(null);
  const [oFetching, setOFetching] = useState(false);
  const [oErr, setOErr] = useState('');

  // Closed-trade detail modal
  const [detail, setDetail] = useState<PaperTrade | null>(null);

  const reload = useCallback(() => setPf(getPortfolio()), []);
  useEffect(() => { reload(); }, [reload, refreshKey]);

  // Auto-close positions whose stop-loss / take-profit was reached.
  useEffect(() => {
    let changed = false;
    getPortfolio().positions.forEach(p => {
      const px = prices[p.symbol];
      if (px == null) return;
      let exit: number | null = null;
      let reason: 'sl' | 'tp' = 'sl';
      if (p.side === 'long') {
        if (p.stopLoss && px <= p.stopLoss) { exit = p.stopLoss; reason = 'sl'; }
        else if (p.takeProfit && px >= p.takeProfit) { exit = p.takeProfit; reason = 'tp'; }
      } else {
        if (p.stopLoss && px >= p.stopLoss) { exit = p.stopLoss; reason = 'sl'; }
        else if (p.takeProfit && px <= p.takeProfit) { exit = p.takeProfit; reason = 'tp'; }
      }
      if (exit != null) { closePosition(p.id, exit, reason); changed = true; }
    });
    if (changed) reload();
  }, [prices, reload]);

  const openEdit = (id: string, sl?: number, tp?: number) => { setEditId(id); setESL(sl ? String(sl) : ''); setETP(tp ? String(tp) : ''); };
  const saveEdit = () => {
    if (!editId) return;
    const sl = parseFloat(eSL), tp = parseFloat(eTP);
    updatePosition(editId, { stopLoss: isFinite(sl) && sl > 0 ? sl : undefined, takeProfit: isFinite(tp) && tp > 0 ? tp : undefined });
    setEditId(null); reload();
  };

  // Live price lookup for the manual open-position modal (debounced on symbol change).
  useEffect(() => {
    if (!showOpen) return;
    const sym = oSym.trim().toUpperCase();
    setOErr('');
    if (!sym) { setOPrice(null); return; }
    let cancelled = false;
    setOFetching(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ticker?symbols=${encodeURIComponent(sym)}`);
        const data = await res.json();
        const px = (data.ticks || [])[0]?.price ?? null;
        if (cancelled) return;
        setOPrice(typeof px === 'number' ? px : null);
        if (px == null) setOErr(t.portfolio.symbolNotFound);
      } catch {
        if (!cancelled) { setOPrice(null); setOErr(t.portfolio.symbolNotFound); }
      } finally {
        if (!cancelled) setOFetching(false);
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(id); };
  }, [oSym, showOpen, t.portfolio.symbolNotFound]);

  const openModal = () => {
    setOSym(''); setOSide('long'); setOAmount('1000'); setOSL(''); setOTP('');
    setOPrice(null); setOErr(''); setOFetching(false); setShowOpen(true);
  };

  const submitOpen = () => {
    const sym = oSym.trim().toUpperCase();
    const amount = parseFloat(oAmount);
    if (!sym || !oPrice || oPrice <= 0) { setOErr(t.portfolio.symbolNotFound); return; }
    if (!isFinite(amount) || amount <= 0) return;
    const sl = parseFloat(oSL), tp = parseFloat(oTP);
    const ok = openPosition({
      id: generateId(),
      symbol: sym,
      name: sym,
      side: oSide,
      qty: amount / oPrice,
      entryPrice: oPrice,
      openedAt: Date.now(),
      stopLoss: isFinite(sl) && sl > 0 ? sl : undefined,
      takeProfit: isFinite(tp) && tp > 0 ? tp : undefined,
    });
    if (ok) { setShowOpen(false); reload(); }
    else setOErr(t.portfolio.noCash);
  };

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
          <button className="btn-primary" style={{ marginInlineStart: pf.positions.length > 0 ? '12px' : 'auto', padding: '8px 14px' }} onClick={openModal}><Icon name="plus" size={14} /> {t.portfolio.addPosition}</button>
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
                    <div className="history-meta" style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                      <span style={{ color: p.stopLoss ? 'var(--red)' : 'var(--text-muted)' }}>SL {p.stopLoss ? money(p.stopLoss) : '—'}</span>
                      <span style={{ color: p.takeProfit ? 'var(--green)' : 'var(--text-muted)' }}>TP {p.takeProfit ? money(p.takeProfit) : '—'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: isHe ? 'left' : 'right' }}>
                    <div className={`mono ${up ? 'positive' : 'negative'}`} style={{ fontWeight: 700, fontSize: '14px' }}>{up ? '+' : ''}{money(u).slice(1)}</div>
                    <div className={`mono ${up ? 'positive' : 'negative'}`} style={{ fontSize: '11px' }}>{up ? '+' : ''}{(u / (p.entryPrice * p.qty) * 100).toFixed(2)}%</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '8px 10px' }} title={t.portfolio.editLevels} onClick={() => openEdit(p.id, p.stopLoss, p.takeProfit)}><Icon name="edit" size={14} /></button>
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
              const tag = tr.closeReason === 'sl' ? 'SL' : tr.closeReason === 'tp' ? 'TP' : null;
              return (
                <div key={tr.id + tr.closedAt} className="history-item" style={{ cursor: 'pointer' }} onClick={() => setDetail(tr)}>
                  <span className={`badge ${tr.side === 'long' ? 'badge-buy' : 'badge-sell'}`}>{tr.side === 'long' ? 'L' : 'S'}</span>
                  <div className="history-info">
                    <div className="history-name">{tr.symbol} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '12px' }}>×{tr.qty}</span>
                      {tag && <span className="mono" style={{ marginInlineStart: '8px', fontSize: '10px', fontWeight: 700, color: tag === 'TP' ? 'var(--green)' : 'var(--red)', border: `1px solid ${tag === 'TP' ? 'var(--green)' : 'var(--red)'}`, borderRadius: '3px', padding: '0 4px' }}>{tag}</span>}
                    </div>
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

      {detail && (() => {
        const up = detail.pnl >= 0;
        const reasonText = detail.closeReason === 'sl' ? t.portfolio.reasonSl : detail.closeReason === 'tp' ? t.portfolio.reasonTp : t.portfolio.reasonManual;
        const row = (label: string, value: ReactNode, color?: string) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{label}</span>
            <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
          </div>
        );
        return (
          <ModalPortal>
          <div className="modal-overlay" onClick={() => setDetail(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
              <h2>
                <Icon name="history" size={16} /> {t.portfolio.tradeDetails} — {detail.symbol}
                <span className={`badge ${detail.side === 'long' ? 'badge-buy' : 'badge-sell'}`} style={{ marginInlineStart: '8px' }}>
                  {detail.side === 'long' ? (isHe ? 'לונג' : 'LONG') : (isHe ? 'שורט' : 'SHORT')}
                </span>
              </h2>
              <div style={{ margin: '8px 0 4px' }}>
                {row(t.portfolio.qty, detail.qty.toFixed(3))}
                {row(t.portfolio.entry, money(detail.entryPrice))}
                {row(t.portfolio.exit, money(detail.exitPrice))}
                {row(t.portfolio.pnl, `${up ? '+' : ''}${money(detail.pnl).slice(1)} (${up ? '+' : ''}${detail.pnlPercent.toFixed(2)}%)`, up ? 'var(--green)' : 'var(--red)')}
                {row(t.portfolio.openedOn, new Date(detail.openedAt).toLocaleString(isHe ? 'he-IL' : 'en-US'))}
                {row(t.portfolio.closedOn, new Date(detail.closedAt).toLocaleString(isHe ? 'he-IL' : 'en-US'))}
                {detail.recommendation && row(t.portfolio.basedOn, detail.recommendation)}
              </div>
              <div style={{ marginTop: '12px', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--bg-input)', border: `1px solid ${detail.closeReason === 'tp' ? 'var(--green)' : detail.closeReason === 'sl' ? 'var(--red)' : 'var(--border-strong)'}` }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{t.portfolio.whyClosed}</div>
                <div style={{ fontSize: '13px' }}>{reasonText}</div>
              </div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={() => setDetail(null)}>{t.portfolio.close}</button>
              </div>
            </div>
          </div>
          </ModalPortal>
        );
      })()}

      {showOpen && (
        <ModalPortal>
        <div className="modal-overlay" onClick={() => setShowOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2><Icon name="briefcase" size={16} /> {t.portfolio.manualTitle}</h2>
            <div className="form-group">
              <label>{t.portfolio.symbol}</label>
              <input className="form-input" placeholder={t.portfolio.symbolPlaceholder} value={oSym}
                onChange={e => setOSym(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }} autoFocus />
              <div className="mono" style={{ fontSize: '12px', marginTop: '6px', minHeight: '16px', color: oPrice ? 'var(--accent)' : 'var(--text-muted)' }}>
                {oFetching ? t.portfolio.fetchingPrice : oPrice ? `${money(oPrice)} ${language === 'he' ? 'מחיר חי' : 'live'}` : ''}
              </div>
            </div>
            <div className="form-group">
              <label>{language === 'he' ? 'כיוון' : 'Side'}</label>
              <div className="chip-group">
                <button className={`chip ${oSide === 'long' ? 'active' : ''}`} onClick={() => setOSide('long')}>{t.portfolio.openLong}</button>
                <button className={`chip ${oSide === 'short' ? 'active' : ''}`} onClick={() => setOSide('short')}>{t.portfolio.openShort}</button>
              </div>
            </div>
            <div className="form-group">
              <label>{t.portfolio.amount}</label>
              <input className="form-input" type="number" value={oAmount} onChange={e => setOAmount(e.target.value)} />
              {oPrice && parseFloat(oAmount) > 0 && <div className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>≈ {(parseFloat(oAmount) / oPrice).toFixed(3)} {language === 'he' ? 'מניות' : 'shares'}</div>}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ color: 'var(--red)' }}>{t.result.stopLoss}</label>
                <input className="form-input" type="number" placeholder="—" value={oSL} onChange={e => setOSL(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ color: 'var(--green)' }}>{t.result.takeProfit}</label>
                <input className="form-input" type="number" placeholder="—" value={oTP} onChange={e => setOTP(e.target.value)} />
              </div>
            </div>
            {oErr && <div style={{ color: 'var(--red)', fontSize: '13px', marginTop: '4px' }}>{oErr}</div>}
            <p className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>{t.portfolio.slTpNote}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowOpen(false)}>{t.journal.cancel}</button>
              <button className="btn-primary" onClick={submitOpen} disabled={!oPrice || oFetching}>{t.portfolio.confirm}</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {editId && (
        <ModalPortal>
        <div className="modal-overlay" onClick={() => setEditId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <h2><Icon name="edit" size={16} /> {t.portfolio.editLevels}</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ color: 'var(--red)' }}>{t.result.stopLoss}</label>
                <input className="form-input" type="number" placeholder="—" value={eSL} onChange={e => setESL(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ color: 'var(--green)' }}>{t.result.takeProfit}</label>
                <input className="form-input" type="number" placeholder="—" value={eTP} onChange={e => setETP(e.target.value)} />
              </div>
            </div>
            <p className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>{t.portfolio.slTpNote}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditId(null)}>{t.journal.cancel}</button>
              <button className="btn-primary" onClick={saveEdit}>{t.portfolio.save}</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      <div className="disclaimer">{t.portfolio.disclaimer}</div>
    </div>
  );
}
