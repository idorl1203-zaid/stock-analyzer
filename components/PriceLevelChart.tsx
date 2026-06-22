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

type M = { price: number; color: string; emphasis?: boolean };

export default function PriceLevelChart({ result, stockData, language, imageDataUrl }: Props) {
  const isHe = language === 'he';
  const currentPrice = stockData?.price;
  const slLevel = num(result.stopLoss?.level);
  const tpLevels = (result.takeProfit?.map(tp => num(tp.target)).filter((v): v is number => !!v)) || [];
  const supports = (result.keyLevels?.support?.map(num).filter((v): v is number => !!v)) || [];
  const resistances = (result.keyLevels?.resistance?.map(num).filter((v): v is number => !!v)) || [];

  // Thin lines drawn on the chart — no text, the legend below carries the meaning + values.
  const lines: M[] = [];
  if (currentPrice) lines.push({ price: currentPrice, color: C.now, emphasis: true });
  if (slLevel) lines.push({ price: slLevel, color: C.sl });
  tpLevels.forEach(tp => lines.push({ price: tp, color: C.tp }));
  supports.forEach(s => lines.push({ price: s, color: C.sup }));
  resistances.forEach(r => lines.push({ price: r, color: C.res }));
  if (lines.length < 2) return null;

  const pa = result.priceAxis, ca = result.chartArea;
  const overlay = !!(imageDataUrl && pa && ca && pa.top > pa.bottom && ca.bottomPct > ca.topPct);

  const fmt = (v: number) => `$${v.toFixed(2)}`;
  const legendItems = [
    { color: C.now, label: isHe ? 'מחיר נוכחי' : 'Current', values: currentPrice ? [currentPrice] : [] },
    { color: C.tp, label: isHe ? 'טייק פרופיט' : 'Take Profit', values: tpLevels },
    { color: C.sl, label: isHe ? 'סטופ לוס' : 'Stop Loss', values: slLevel ? [slLevel] : [] },
    { color: C.sup, label: isHe ? 'תמיכה' : 'Support', values: supports },
    { color: C.res, label: isHe ? 'התנגדות' : 'Resistance', values: resistances },
  ].filter(it => it.values.length);

  const legend = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', marginTop: '16px', justifyContent: 'center' }}>
      {legendItems.map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '2px', background: it.color, boxShadow: `0 0 6px ${it.color}`, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{it.label}</span>
          <span className="mono" style={{ color: it.color, fontSize: '11px', fontWeight: 700 }}>
            {it.values.map(fmt).join(' · ')}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="card" style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div className="card-header">
        <div className="card-icon"><Icon name="ruler" /></div>
        <h2>{isHe ? 'מפת רמות מחיר על הגרף' : 'Price Levels on Chart'}</h2>
      </div>

      {overlay ? <Overlay lines={lines} pa={pa!} ca={ca!} img={imageDataUrl!} /> : <Abstract lines={lines} currentPrice={currentPrice!} />}
      {legend}
    </div>
  );
}

/* ── Thin lines drawn at calibrated positions over the actual chart image ── */
function Overlay({ lines, pa, ca, img }: { lines: M[]; pa: NonNullable<AnalysisResult['priceAxis']>; ca: NonNullable<AnalysisResult['chartArea']>; img: string }) {
  const yOf = (price: number) => {
    const frac = (pa.top - price) / (pa.top - pa.bottom);
    return Math.max(0.5, Math.min(99.5, ca.topPct + frac * (ca.bottomPct - ca.topPct)));
  };
  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="chart" style={{ width: '100%', display: 'block' }} />
      {lines.map((m, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${yOf(m.price)}%`, height: m.emphasis ? 1.5 : 1, background: m.color, opacity: m.emphasis ? 0.85 : 0.65, boxShadow: `0 0 4px ${m.color}` }} />
      ))}
    </div>
  );
}

/* ── Fallback abstract map (older analyses without calibration) ── */
function Abstract({ lines, currentPrice }: { lines: M[]; currentPrice: number }) {
  const prices = lines.map(m => m.price);
  const minP = Math.min(...prices) * 0.97, maxP = Math.max(...prices) * 1.03;
  const range = maxP - minP || 1;
  const yOf = (p: number) => 100 - ((p - minP) / range) * 100;
  return (
    <div style={{ position: 'relative', height: '260px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${yOf(currentPrice)}%`, background: 'rgba(0,255,159,0.04)' }} />
      {lines.map((m, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${yOf(m.price)}%`, height: m.emphasis ? 1.5 : 1, background: m.color, opacity: m.emphasis ? 0.85 : 0.6, boxShadow: `0 0 4px ${m.color}` }} />
      ))}
    </div>
  );
}
