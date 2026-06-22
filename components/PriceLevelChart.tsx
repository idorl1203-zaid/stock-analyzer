'use client';
import { Language, AnalysisResult, StockData } from '@/lib/types';
import Icon from './Icon';

interface Props {
  result: AnalysisResult;
  stockData: StockData | null;
  language: Language;
  imageDataUrl?: string;
}

const C = { now: '#00f0ff', tp: '#00ff9f', sl: '#ff3864', sup: '#b14eff', res: '#ffe600' };
const num = (s?: string) => { const v = parseFloat((s || '').replace(/[^0-9.]/g, '')); return isFinite(v) && v > 0 ? v : undefined; };

type M = { price: number; label: string; color: string };

// Merge markers that sit on (nearly) the same price into one label so the
// overlay doesn't stack two boxes on top of each other (e.g. "TP1 · RES $440").
const PRIO = ['NOW', 'SL', 'TP', 'RES', 'SUP'];
const prio = (label: string) => { const i = PRIO.indexOf(label.replace(/[0-9.]/g, '')); return i < 0 ? 99 : i; };
const colorFor = (label: string): string => {
  const k = label.replace(/[0-9.]/g, '');
  return k === 'NOW' ? C.now : k === 'SL' ? C.sl : k === 'TP' ? C.tp : k === 'RES' ? C.res : C.sup;
};
function dedupe(markers: M[]): M[] {
  const groups: M[][] = [];
  [...markers].sort((a, b) => b.price - a.price).forEach(m => {
    const g = groups.find(g => Math.abs(g[0].price - m.price) / Math.max(g[0].price, 1) <= 0.006);
    if (g) g.push(m); else groups.push([m]);
  });
  return groups.map(g => {
    const labels = Array.from(new Set(g.map(x => x.label))).sort((a, b) => prio(a) - prio(b));
    const top = labels[0];
    const lead = g.find(x => x.label === top)!; // price of the highest-priority level in the group
    return { price: lead.price, label: labels.join(' · '), color: colorFor(top) };
  });
}

export default function PriceLevelChart({ result, stockData, language, imageDataUrl }: Props) {
  const currentPrice = stockData?.price;
  const slLevel = num(result.stopLoss?.level);
  const tpLevels = (result.takeProfit?.map(tp => num(tp.target)).filter((v): v is number => !!v)) || [];
  const supports = (result.keyLevels?.support?.map(num).filter((v): v is number => !!v)) || [];
  const resistances = (result.keyLevels?.resistance?.map(num).filter((v): v is number => !!v)) || [];

  const raw: M[] = [];
  if (currentPrice) raw.push({ price: currentPrice, label: 'NOW', color: C.now });
  if (slLevel) raw.push({ price: slLevel, label: 'SL', color: C.sl });
  tpLevels.forEach((tp, i) => raw.push({ price: tp, label: `TP${i + 1}`, color: C.tp }));
  supports.forEach(s => raw.push({ price: s, label: 'SUP', color: C.sup }));
  resistances.forEach(r => raw.push({ price: r, label: 'RES', color: C.res }));
  if (raw.length < 2) return null;
  const markers = dedupe(raw);

  const pa = result.priceAxis, ca = result.chartArea;
  const overlay = !!(imageDataUrl && pa && ca && pa.top > pa.bottom && ca.bottomPct > ca.topPct);

  const legend = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '14px', justifyContent: 'center' }}>
      {[
        { color: C.now, label: language === 'he' ? 'מחיר נוכחי' : 'Current' },
        { color: C.tp, label: language === 'he' ? 'טייק פרופיט' : 'Take Profit' },
        { color: C.sl, label: language === 'he' ? 'סטופ לוס' : 'Stop Loss' },
        { color: C.sup, label: language === 'he' ? 'תמיכה' : 'Support' },
        { color: C.res, label: language === 'he' ? 'התנגדות' : 'Resistance' },
      ].map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: '18px', height: '2px', background: it.color, boxShadow: `0 0 6px ${it.color}` }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{it.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="card" style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div className="card-header">
        <div className="card-icon"><Icon name="ruler" /></div>
        <h2>{language === 'he' ? 'מפת רמות מחיר על הגרף' : 'Price Levels on Chart'}</h2>
      </div>

      {overlay ? <Overlay markers={markers} pa={pa!} ca={ca!} img={imageDataUrl!} /> : <Abstract markers={markers} currentPrice={currentPrice!} />}
      {legend}
    </div>
  );
}

/* ── Lines drawn at calibrated positions over the actual chart image ── */
function Overlay({ markers, pa, ca, img }: { markers: M[]; pa: NonNullable<AnalysisResult['priceAxis']>; ca: NonNullable<AnalysisResult['chartArea']>; img: string }) {
  const yOf = (price: number) => {
    const frac = (pa.top - price) / (pa.top - pa.bottom);
    return Math.max(1.5, Math.min(98.5, ca.topPct + frac * (ca.bottomPct - ca.topPct)));
  };
  // declutter labels (min vertical gap in %)
  const GAP = 6.5;
  const items = markers.map(m => ({ ...m, y: yOf(m.price) })).sort((a, b) => a.y - b.y);
  const lp: number[] = [];
  items.forEach((it, i) => { lp[i] = i === 0 ? Math.max(it.y, 3) : Math.max(it.y, lp[i - 1] + GAP); });
  if (lp.length && lp[lp.length - 1] > 97) { lp[lp.length - 1] = 97; for (let i = lp.length - 2; i >= 0; i--) lp[i] = Math.min(lp[i], lp[i + 1] - GAP); }

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="chart" style={{ width: '100%', display: 'block' }} />
      {items.map((m, i) => (
        <div key={i}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: `${m.y}%`, height: m.label === 'NOW' ? 2 : 1.5, background: m.color, opacity: 0.9, boxShadow: `0 0 6px ${m.color}` }} />
          {Math.abs(lp[i] - m.y) > 0.5 && (
            <div style={{ position: 'absolute', right: '4px', top: `${Math.min(m.y, lp[i])}%`, height: `${Math.abs(lp[i] - m.y)}%`, width: 1, background: m.color, opacity: 0.5 }} />
          )}
          <div className="plc-mark-label" style={{ position: 'absolute', right: '6px', top: `${lp[i]}%`, transform: 'translateY(-50%)', background: 'rgba(6,3,15,0.82)', border: `1px solid ${m.color}`, color: m.color, boxShadow: `0 0 8px -2px ${m.color}` }}>
            {m.label} ${m.price.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Fallback abstract map (older analyses without calibration) ── */
function Abstract({ markers, currentPrice }: { markers: M[]; currentPrice: number }) {
  const prices = markers.map(m => m.price);
  const minP = Math.min(...prices) * 0.97, maxP = Math.max(...prices) * 1.03;
  const range = maxP - minP || 1;
  const yOf = (p: number) => 100 - ((p - minP) / range) * 100;
  const GAP = 7;
  const items = markers.map(m => ({ ...m, y: yOf(m.price) })).sort((a, b) => a.y - b.y);
  const lp: number[] = [];
  items.forEach((it, i) => { lp[i] = i === 0 ? Math.max(it.y, 4) : Math.max(it.y, lp[i - 1] + GAP); });
  if (lp.length && lp[lp.length - 1] > 96) { lp[lp.length - 1] = 96; for (let i = lp.length - 2; i >= 0; i--) lp[i] = Math.min(lp[i], lp[i + 1] - GAP); }
  return (
    <div style={{ position: 'relative', height: '300px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${yOf(currentPrice)}%`, background: 'rgba(0,255,159,0.04)' }} />
      {items.map((m, i) => (
        <div key={i}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: `${m.y}%`, height: m.label === 'NOW' ? 2 : 1.5, background: m.color, opacity: 0.8, boxShadow: `0 0 6px ${m.color}` }} />
          <div className="plc-mark-label" style={{ position: 'absolute', right: '6px', top: `${lp[i]}%`, transform: 'translateY(-50%)', background: 'var(--bg-card-solid, #120a26)', border: `1px solid ${m.color}`, color: m.color }}>
            {m.label} ${m.price.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
