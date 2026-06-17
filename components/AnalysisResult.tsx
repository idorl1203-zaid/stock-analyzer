'use client';
import { useState } from 'react';
import { Language, AnalysisResult, StockData, NewsItem, JournalEntry } from '@/lib/types';
import { translations } from '@/lib/translations';
import { saveJournalEntry, generateId } from '@/lib/storage';
import { base64ToDataUrl } from '@/lib/imageUtils';
import PriceLevelChart from './PriceLevelChart';
import Icon from './Icon';

interface Props {
  language: Language;
  result: AnalysisResult;
  stockData: StockData | null;
  news: NewsItem[];
  stockName: string;
  imageBase64: string;
  onBack: () => void;
}

export default function AnalysisResultView({ language, result, stockData, news, stockName, imageBase64, onBack }: Props) {
  const t = translations[language];
  const [saved, setSaved] = useState(false);

  const recClass = result.recommendation === 'BUY' ? 'badge-buy' : result.recommendation === 'SELL' ? 'badge-sell' : result.recommendation === 'HOLD' ? 'badge-hold' : 'badge-avoid';
  const trendClass = result.trend === 'BULLISH' ? 'badge-bullish' : result.trend === 'BEARISH' ? 'badge-bearish' : 'badge-sideways';

  const handleSaveToJournal = () => {
    const entry: JournalEntry = {
      id: generateId(),
      timestamp: Date.now(),
      stockName: stockName,
      stockSymbol: stockData?.symbol || stockName,
      status: 'watching',
      recommendation: result.recommendation,
      notes: result.summary,
      stopLoss: result.stopLoss?.level,
      takeProfit: result.takeProfit?.[0]?.target,
    };
    saveJournalEntry(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatNumber = (n: number | null) => {
    if (n === null || n === undefined) return '—';
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return n.toLocaleString();
  };

  return (
    <div className="result-container">
      <div style={{ marginBottom: '16px' }}>
        <button className="btn-secondary" onClick={onBack}><Icon name="arrow-left" size={15} /> {t.nav.analyze}</button>
      </div>

      {imageBase64 && (
        <div style={{ marginBottom: '24px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
          <img src={base64ToDataUrl(imageBase64)} alt="Analyzed Chart" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
        </div>
      )}

      <div className="result-header">
        <div>
          <span className="result-stock-name">{stockName}</span>
          {stockData?.price && (
            <span style={{ marginLeft: '12px', fontSize: '20px', color: 'var(--text-secondary)' }}>
              ${stockData.price.toFixed(2)}
              <span className={stockData.change && stockData.change >= 0 ? 'positive' : 'negative'} style={{ marginLeft: '8px', fontSize: '14px' }}>
                {stockData.change && stockData.change >= 0 ? '+' : ''}{stockData.change?.toFixed(2)} ({stockData.changePercent?.toFixed(2)}%)
              </span>
            </span>
          )}
        </div>
        <div className="result-badges">
          <span className={`badge ${recClass}`}>{t.recommendations[result.recommendation]}</span>
          <span className={`badge ${trendClass}`}>{t.trends[result.trend]}</span>
          <span className="badge" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)', textShadow: '0 0 8px var(--accent-glow)' }}>
            {t.result.confidence}: {result.confidenceScore}%
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="card" style={{ marginBottom: '20px', borderLeft: '3px solid var(--accent)' }}>
        <p className="result-text" style={{ fontSize: '15px' }}>{result.summary}</p>
      </div>

      {/* Market Data */}
      {stockData?.price && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header"><div className="card-icon"><Icon name="market" /></div><h2>{t.result.marketData}</h2></div>
          <div className="market-data-grid">
            <div className="market-data-item"><div className="market-data-label">{t.result.price}</div><div className="market-data-value">${stockData.price?.toFixed(2)}</div></div>
            <div className="market-data-item"><div className="market-data-label">{t.result.change}</div><div className={`market-data-value ${stockData.change && stockData.change >= 0 ? 'positive' : 'negative'}`}>{stockData.change?.toFixed(2)}</div></div>
            <div className="market-data-item"><div className="market-data-label">{t.result.volume}</div><div className="market-data-value">{formatNumber(stockData.volume)}</div></div>
            <div className="market-data-item"><div className="market-data-label">{t.result.marketCap}</div><div className="market-data-value">{formatNumber(stockData.marketCap)}</div></div>
            <div className="market-data-item"><div className="market-data-label">{t.result.high52w}</div><div className="market-data-value">${stockData.high52w?.toFixed(2) || '—'}</div></div>
            <div className="market-data-item"><div className="market-data-label">{t.result.low52w}</div><div className="market-data-value">${stockData.low52w?.toFixed(2) || '—'}</div></div>
          </div>
        </div>
      )}

      {/* Price Level Map */}
      {stockData?.price && <PriceLevelChart result={result} stockData={stockData} language={language} />}

      <div className="result-grid">
        {/* Chart Analysis */}
        <div className="card">
          <div className="card-header"><div className="card-icon"><Icon name="chart" /></div><h2>{t.result.chartAnalysis}</h2></div>
          <p className="result-text">{result.chartAnalysis}</p>
          {result.patterns && result.patterns.length > 0 && (
            <div className="result-section" style={{ marginTop: '16px' }}>
              <h3><Icon name="patterns" size={14} /> {t.result.patterns}</h3>
              <div className="chip-group">
                {result.patterns.map((p, i) => <span key={i} className="chip active">{p}</span>)}
              </div>
            </div>
          )}
          {result.indicators && (
            <div className="result-section" style={{ marginTop: '16px' }}>
              <h3><Icon name="indicators" size={14} /> {t.result.indicators}</h3>
              <p className="result-text">{result.indicators}</p>
            </div>
          )}
        </div>

        {/* Key Levels + SL/TP */}
        <div className="card">
          <div className="card-header"><div className="card-icon"><Icon name="target" /></div><h2>{t.result.keyLevels}</h2></div>
          <div className="result-section">
            <h3 style={{ color: 'var(--green)' }}><Icon name="support" size={14} /> {t.result.support}</h3>
            <div className="level-pills">
              {result.keyLevels?.support?.map((s, i) => <span key={i} className="level-pill support">{s}</span>)}
            </div>
          </div>
          <div className="result-section">
            <h3 style={{ color: 'var(--red)' }}><Icon name="resistance" size={14} /> {t.result.resistance}</h3>
            <div className="level-pills">
              {result.keyLevels?.resistance?.map((r, i) => <span key={i} className="level-pill resistance">{r}</span>)}
            </div>
          </div>
          <div className="result-section" style={{ marginTop: '16px' }}>
            <h3 style={{ color: 'var(--red)' }}><Icon name="shield" size={14} /> {t.result.stopLoss}</h3>
            <div className="sl-tp-card sl-card">
              <div className="sl-tp-level" style={{ color: 'var(--red)' }}>{result.stopLoss?.level}</div>
              <div className="sl-tp-reason">{result.stopLoss?.reasoning}</div>
            </div>
          </div>
          <div className="result-section" style={{ marginTop: '12px' }}>
            <h3 style={{ color: 'var(--green)' }}><Icon name="check" size={14} /> {t.result.takeProfit}</h3>
            {result.takeProfit?.map((tp, i) => (
              <div key={i} className="sl-tp-card tp-card" style={{ marginBottom: '8px' }}>
                <div className="sl-tp-level" style={{ color: 'var(--green)' }}>{tp.target} <span style={{ fontSize: '13px', opacity: 0.7 }}>({tp.percentage})</span></div>
                <div className="sl-tp-reason">{tp.reasoning}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News */}
      {news.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header"><div className="card-icon"><Icon name="news" /></div><h2>{t.result.latestNews}</h2></div>
          {result.newsImpact && <p className="result-text" style={{ marginBottom: '16px' }}><strong>{t.result.newsImpact}:</strong> {result.newsImpact}</p>}
          <div className="news-list">
            {news.map((n, i) => (
              <div key={i} className="news-item">
                <a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a>
                <p>{n.description?.slice(0, 150)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Analysis */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header"><div className="card-icon"><Icon name="brain" /></div><h2>{t.result.reasoning}</h2></div>
        <p className="result-text">{result.reasoning}</p>
      </div>

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="warning-box" style={{ marginTop: '20px' }}>
          <h3 style={{ color: 'var(--yellow)', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}><Icon name="warning" size={15} /> {t.result.warnings}</h3>
          {result.warnings.map((w, i) => <div key={i} className="warning-item">• {w}</div>)}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button className="btn-primary" onClick={handleSaveToJournal} disabled={saved}>
          {saved ? <><Icon name="check" size={16} /> {t.result.savedToJournal}</> : <><Icon name="bookmark" size={16} /> {t.result.saveToJournal}</>}
        </button>
      </div>

      <div className="disclaimer">{t.disclaimer}</div>
    </div>
  );
}
