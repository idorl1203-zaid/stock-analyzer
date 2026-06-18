'use client';
import { Language, AnalysisResult, StockData } from '@/lib/types';
import Icon from './Icon';

interface Props {
  result: AnalysisResult;
  stockData: StockData | null;
  language: Language;
}

const C = { now: '#00f0ff', tp: '#00ff9f', sl: '#ff3864', sup: '#b14eff', res: '#ffe600' };

export default function PriceLevelChart({ result, stockData, language }: Props) {
  const currentPrice = stockData?.price;
  if (!currentPrice) return null;

  const num = (s?: string) => parseFloat((s || '').replace(/[^0-9.]/g, ''));
  const slLevel = num(result.stopLoss?.level);
  const tpLevels = (result.takeProfit?.map(tp => num(tp.target)).filter(v => v > 0)) || [];
  const supports = (result.keyLevels?.support?.map(num).filter(v => v > 0)) || [];
  const resistances = (result.keyLevels?.resistance?.map(num).filter(v => v > 0)) || [];

  const allPrices = [currentPrice, slLevel, ...tpLevels, ...supports, ...resistances].filter(v => v > 0);
  if (allPrices.length < 2) return null;

  const minPrice = Math.min(...allPrices) * 0.97;
  const maxPrice = Math.max(...allPrices) * 1.03;
  const range = maxPrice - minPrice || 1;
  const toPct = (price: number) => ((price - minPrice) / range) * 100;

  type M = { price: number; label: string; color: string; side: 'left' | 'right'; isCurrent?: boolean; pct: number; lp: number };
  const markers: M[] = [];
  if (slLevel > 0) markers.push({ price: slLevel, label: 'SL', color: C.sl, side: 'left', pct: toPct(slLevel), lp: 0 });
  supports.forEach(s => markers.push({ price: s, label: 'SUP', color: C.sup, side: 'left', pct: toPct(s), lp: 0 }));
  markers.push({ price: currentPrice, label: 'NOW', color: C.now, side: 'right', isCurrent: true, pct: toPct(currentPrice), lp: 0 });
  tpLevels.forEach((tp, i) => markers.push({ price: tp, label: `TP${i + 1}`, color: C.tp, side: 'right', pct: toPct(tp), lp: 0 }));
  resistances.forEach(r => markers.push({ price: r, label: 'RES', color: C.res, side: 'right', pct: toPct(r), lp: 0 }));

  // Anti-collision: push labels apart vertically per side while keeping the line at its true price.
  const GAP = 9; // % between label centers
  const spread = (side: 'left' | 'right') => {
    const items = markers.filter(m => m.side === side).sort((a, b) => a.pct - b.pct);
    items.forEach((it, i) => { it.lp = i === 0 ? Math.max(it.pct, 4) : Math.max(it.pct, items[i - 1].lp + GAP); });
    if (items.length && items[items.length - 1].lp > 96) {
      items[items.length - 1].lp = 96;
      for (let i = items.length - 2; i >= 0; i--) items[i].lp = Math.min(items[i].lp, items[i + 1].lp - GAP);
    }
    return items;
  };
  const positioned = [...spread('left'), ...spread('right')];

  return (
    <div className="card" style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div className="card-header">
        <div className="card-icon"><Icon name="ruler" /></div>
        <h2>{language === 'he' ? 'מפת רמות מחיר' : 'Price Level Map'}</h2>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '280px', position: 'relative', height: '300px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* zones */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${toPct(currentPrice)}%`, background: 'rgba(255,56,100,0.04)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${100 - toPct(currentPrice)}%`, background: 'rgba(0,255,159,0.04)' }} />

          {positioned.map((m, i) => {
            const dir = m.side === 'right' ? 'right' : 'left';
            const lo = Math.min(m.pct, m.lp);
            const hi = Math.max(m.pct, m.lp);
            return (
              <div key={i}>
                {/* level line (true price) */}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${m.pct}%`, height: m.isCurrent ? 2 : 1, background: m.color, opacity: m.isCurrent ? 1 : 0.55, boxShadow: m.isCurrent ? `0 0 8px ${m.color}` : 'none' }} />
                {/* connector from label to line */}
                {hi - lo > 0.5 && (
                  <div style={{ position: 'absolute', [dir]: '8px', bottom: `${lo}%`, height: `${hi - lo}%`, width: 1, background: m.color, opacity: 0.5 }} />
                )}
                {/* label */}
                <div style={{ position: 'absolute', [dir]: '6px', bottom: `${m.lp}%`, transform: 'translateY(50%)', background: 'var(--bg-card-solid, #120a26)', border: `1px solid ${m.color}`, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, color: m.color, whiteSpace: 'nowrap', zIndex: 5, fontFamily: 'var(--font-mono)', boxShadow: m.isCurrent ? `0 0 10px ${m.color}55` : 'none' }}>
                  {m.label} ${m.price.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '120px' }}>
          <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', fontFamily: 'var(--font-display)' }}>
            {language === 'he' ? 'מקרא' : 'Legend'}
          </div>
          {[
            { color: C.now, label: language === 'he' ? 'מחיר נוכחי' : 'Current Price' },
            { color: C.tp, label: language === 'he' ? 'יעדי טייק פרופיט' : 'Take Profit' },
            { color: C.sl, label: language === 'he' ? 'סטופ לוס' : 'Stop Loss' },
            { color: C.sup, label: language === 'he' ? 'תמיכה' : 'Support' },
            { color: C.res, label: language === 'he' ? 'התנגדות' : 'Resistance' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '2px', background: item.color, borderRadius: '1px', flexShrink: 0, boxShadow: `0 0 6px ${item.color}` }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
