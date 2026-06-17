'use client';
import { Language, AnalysisResult, StockData } from '@/lib/types';
import Icon from './Icon';

interface Props {
  result: AnalysisResult;
  stockData: StockData | null;
  language: Language;
}

export default function PriceLevelChart({ result, stockData, language }: Props) {
  const currentPrice = stockData?.price;
  if (!currentPrice) return null;

  const slLevel = parseFloat(result.stopLoss?.level?.replace(/[^0-9.]/g, '') || '0');
  const tpLevels = result.takeProfit?.map(tp => parseFloat(tp.target?.replace(/[^0-9.]/g, '') || '0')).filter(v => v > 0) || [];
  const supports = result.keyLevels?.support?.map(s => parseFloat(s.replace(/[^0-9.]/g, ''))).filter(v => v > 0) || [];
  const resistances = result.keyLevels?.resistance?.map(r => parseFloat(r.replace(/[^0-9.]/g, ''))).filter(v => v > 0) || [];

  const allPrices = [currentPrice, slLevel, ...tpLevels, ...supports, ...resistances].filter(v => v > 0);
  if (allPrices.length < 2) return null;

  const minPrice = Math.min(...allPrices) * 0.97;
  const maxPrice = Math.max(...allPrices) * 1.03;
  const range = maxPrice - minPrice;

  const toPercent = (price: number) => ((price - minPrice) / range) * 100;

  const PriceMarker = ({
    price,
    label,
    color,
    isCurrent = false,
    side = 'right',
  }: {
    price: number;
    label: string;
    color: string;
    isCurrent?: boolean;
    side?: 'left' | 'right';
  }) => {
    const pct = toPercent(price);
    return (
      <div style={{
        position: 'absolute',
        bottom: `${pct}%`,
        left: 0,
        right: 0,
        transform: 'translateY(50%)',
      }}>
        {/* Line */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: isCurrent ? '2px' : '1px',
          background: isCurrent ? color : color,
          opacity: isCurrent ? 1 : 0.7,
          boxShadow: isCurrent ? `0 0 6px ${color}` : 'none',
        }} />
        {/* Label */}
        <div style={{
          position: 'absolute',
          [side === 'right' ? 'right' : 'left']: '0',
          transform: 'translateY(-50%)',
          background: 'var(--bg-card)',
          border: `1px solid ${color}`,
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 700,
          color,
          whiteSpace: 'nowrap',
          zIndex: 10,
          fontFamily: 'var(--font-mono)',
          boxShadow: isCurrent ? `0 0 8px ${color}40` : 'none',
        }}>
          {label} ${price.toFixed(2)}
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div className="card-header">
        <div className="card-icon"><Icon name="ruler" /></div>
        <h2>{language === 'he' ? 'מפת רמות מחיר' : 'Price Level Map'}</h2>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Chart */}
        <div style={{
          flex: 1,
          position: 'relative',
          height: '280px',
          background: 'var(--bg-input)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          overflow: 'visible',
          margin: '0 60px',
        }}>
          {/* Background zones */}
          {slLevel > 0 && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${toPercent(currentPrice)}%`,
              background: 'rgba(239,68,68,0.03)',
              borderTop: '1px dashed rgba(239,68,68,0.2)',
            }} />
          )}

          {tpLevels.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: `${toPercent(currentPrice)}%`,
              left: 0,
              right: 0,
              top: 0,
              background: 'rgba(16,185,129,0.03)',
            }} />
          )}

          {/* Price markers */}
          {slLevel > 0 && (
            <PriceMarker price={slLevel} label="SL" color="#ff3864" side="left" />
          )}
          {supports.map((s, i) => (
            <PriceMarker key={`s-${i}`} price={s} label="SUP" color="#b14eff" side="left" />
          ))}
          {resistances.map((r, i) => (
            <PriceMarker key={`r-${i}`} price={r} label="RES" color="#ffe600" side="right" />
          ))}
          {tpLevels.map((tp, i) => (
            <PriceMarker key={`tp-${i}`} price={tp} label={`TP${i + 1}`} color="#00ff9f" side="right" />
          ))}
          <PriceMarker price={currentPrice} label="NOW" color="#00f0ff" isCurrent side="right" />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '120px', fontSize: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
            {language === 'he' ? 'מקרא' : 'Legend'}
          </div>
          {[
            { color: '#00f0ff', label: language === 'he' ? 'מחיר נוכחי' : 'Current Price' },
            { color: '#00ff9f', label: language === 'he' ? 'יעדי טייק פרופיט' : 'Take Profit' },
            { color: '#ff3864', label: language === 'he' ? 'סטופ לוס' : 'Stop Loss' },
            { color: '#b14eff', label: language === 'he' ? 'תמיכה' : 'Support' },
            { color: '#ffe600', label: language === 'he' ? 'התנגדות' : 'Resistance' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '2px', background: item.color, borderRadius: '1px', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
