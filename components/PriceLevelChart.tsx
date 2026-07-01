'use client';
import { useState } from 'react';
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

  const modelFn = modelYOf(result);
  const overlay = !!(imageDataUrl && modelFn);

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

      {overlay
        ? <Overlay lines={lines} result={result} modelFn={modelFn!} img={imageDataUrl!} fallback={<Abstract lines={lines} currentPrice={currentPrice!} />} />
        : <Abstract lines={lines} currentPrice={currentPrice!} />}
      {legend}
    </div>
  );
}

/* ── Thin lines drawn at calibrated positions over the actual chart image ── */
const clampPct = (v: number) => Math.max(0.5, Math.min(99.5, v));

// FALLBACK calibration from the model's (price,yPct) anchors via least-squares.
// The model reads gridline VALUES + relative SCALE well but has an absolute offset,
// so this is only used when programmatic axis detection fails.
function modelYOf(result: AnalysisResult): ((price: number) => number) | null {
  const pts = (result.calibration?.points || []).filter(
    p => typeof p.price === 'number' && typeof p.yPct === 'number' && isFinite(p.price) && isFinite(p.yPct)
  );
  const uniq = pts.filter((p, i) => pts.findIndex(q => Math.abs(q.price - p.price) < 1e-6) === i);
  if (uniq.length >= 2) {
    const n = uniq.length;
    const sx = uniq.reduce((s, p) => s + p.price, 0);
    const sy = uniq.reduce((s, p) => s + p.yPct, 0);
    const sxx = uniq.reduce((s, p) => s + p.price * p.price, 0);
    const sxy = uniq.reduce((s, p) => s + p.price * p.yPct, 0);
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) > 1e-9) {
      const m = (n * sxy - sx * sy) / denom;
      const c = (sy - m * sx) / n;
      if (m < 0) return (price: number) => clampPct(m * price + c);
    }
  }
  const pa = result.priceAxis, ca = result.chartArea;
  if (pa && ca && pa.top > pa.bottom && ca.bottomPct > ca.topPct) {
    return (price: number) => clampPct(ca.topPct + ((pa.top - price) / (pa.top - pa.bottom)) * (ca.bottomPct - ca.topPct));
  }
  return null;
}

// PROGRAMMATIC axis calibration: read the actual pixel rows of the evenly-spaced
// price gridlines from the image's right-axis label strip, then anchor the model's
// accurate gridline VALUES (extremes) to those true rows. Eliminates the model's
// absolute-position offset → pixel-accurate lines. Returns null if it can't detect.
function detectGridYOf(img: HTMLImageElement, result: AnalysisResult): { fn: (p: number) => number; info: string } | null {
  const pts = (result.calibration?.points || []).filter(p => isFinite(p.price) && isFinite(p.yPct));
  if (pts.length < 2) return null;
  const maxVal = Math.max(...pts.map(p => p.price));
  const minVal = Math.min(...pts.map(p => p.price));
  if (!(maxVal - minVal > 0)) return null;
  const W = img.naturalWidth, H = img.naturalHeight;
  if (!W || !H) return null;
  let data: Uint8ClampedArray;
  try {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    data = ctx.getImageData(0, 0, W, H).data;
  } catch { return null; }
  // Count bright (text/label) pixels per row in the right-axis strip.
  const x0 = Math.floor(W * 0.90), x1 = Math.max(x0 + 1, Math.floor(W * 0.995));
  const score = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    let c = 0;
    for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; if ((data[i] + data[i + 1] + data[i + 2]) / 3 > 90) c++; }
    score[y] = c;
  }
  const maxS = Math.max(...score);
  if (maxS < 3) return null;
  const thr = Math.max(3, maxS * 0.22);
  // Cluster contiguous bright rows into label bands; take each band's brightness-weighted center.
  const bands: number[] = [];
  for (let y = 0; y < H;) {
    if (score[y] >= thr) { let s = 0, w = 0, y2 = y; while (y2 < H && score[y2] >= thr) { s += y2 * score[y2]; w += score[y2]; y2++; } bands.push(s / w); y = y2; }
    else y++;
  }
  if (bands.length < 3) return null;
  bands.sort((a, b) => a - b);
  // Keep the largest evenly-spaced subset (the gridlines); drop stray labels (current
  // price / SL·TP boxes / volume label) that don't fit the grid spacing.
  const gaps = bands.slice(1).map((b, i) => b - bands[i]).sort((a, b) => a - b);
  const med = gaps[Math.floor(gaps.length / 2)];
  if (!(med > 2)) return null;
  let best: number[] = [];
  for (let start = 0; start < bands.length; start++) {
    const run = [bands[start]];
    for (let i = start + 1; i < bands.length; i++) {
      const d = bands[i] - run[run.length - 1];
      const k = Math.round(d / med);
      if (k >= 1 && Math.abs(d - k * med) <= med * 0.35) run.push(bands[i]);
    }
    if (run.length > best.length) best = run;
  }
  if (best.length < 3) return null;
  const topPct = (best[0] / H) * 100;
  const botPct = (best[best.length - 1] / H) * 100;
  if (!(botPct - topPct > 20)) return null; // must span a meaningful vertical range
  const fn = (price: number) => clampPct(topPct + ((maxVal - price) / (maxVal - minVal)) * (botPct - topPct));
  return { fn, info: `DETECT ${best.length} grid: $${maxVal}@${topPct.toFixed(1)}% $${minVal}@${botPct.toFixed(1)}%` };
}

function Overlay({ lines, result, modelFn, img, fallback }: { lines: M[]; result: AnalysisResult; modelFn: (price: number) => number; img: string; fallback: React.ReactNode }) {
  const [broken, setBroken] = useState(false);
  const [fn, setFn] = useState<((p: number) => number) | null>(null);
  const [info, setInfo] = useState('');
  // If the chart image can't render, never show lines on black — use the ladder.
  if (broken) return <>{fallback}</>;
  const yOf = fn || modelFn;
  return (
    <>
    <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt="chart"
        style={{ width: '100%', display: 'block' }}
        onError={() => setBroken(true)}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (!(el.naturalWidth > 0)) { setBroken(true); return; }
          const det = detectGridYOf(el, result);
          if (det) { setFn(() => det.fn); setInfo(det.info); }
          else { setFn(() => modelFn); setInfo('model-fit (axis not detected)'); }
        }}
      />
      {lines.map((m, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${yOf(m.price)}%`, height: m.emphasis ? 1.5 : 1, background: m.color, opacity: m.emphasis ? 0.85 : 0.65, boxShadow: `0 0 4px ${m.color}` }} />
      ))}
    </div>
    {info ? <div className="mono" style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', direction: 'ltr', textAlign: 'left', opacity: 0.65 }}>{info}</div> : null}
    </>
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
