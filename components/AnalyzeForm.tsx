'use client';
import { useState, useRef, useEffect } from 'react';
import { Language, RiskProfile, Timeframe, AnalysisResult, StockData, NewsItem } from '@/lib/types';
import { translations } from '@/lib/translations';
import { canRunAnalysis, incrementAnalysisUsage } from '@/lib/storage';
import Icon from './Icon';

interface Props {
  language: Language;
  onResult: (result: AnalysisResult, stockData: StockData | null, news: NewsItem[], imageBase64: string, imageMime: string, stockName: string, timeframe: Timeframe, riskProfile: RiskProfile) => void;
  prefillSymbol?: string;
  onClearPrefill?: () => void;
  onLimitReached?: () => void;
}

export default function AnalyzeForm({ language, onResult, prefillSymbol, onClearPrefill, onLimitReached }: Props) {
  const t = translations[language];
  const [stockName, setStockName] = useState(prefillSymbol || '');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('balanced');
  const [loading, setLoading] = useState(false);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [error, setError] = useState('');

  // Rotate the loading subtitle while analyzing so it feels alive (not a static wait).
  useEffect(() => {
    if (!loading) { setCycleIdx(0); return; }
    const cycle = t.form.analysisCycle;
    const id = setInterval(() => setCycleIdx(i => (i + 1) % cycle.length), 5000);
    return () => clearInterval(id);
  }, [loading, t.form.analysisCycle]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    setError('');
    if (!imageBase64) { setError(t.errors.noImage); return; }
    if (!stockName.trim()) { setError(t.errors.noStock); return; }
    if (!canRunAnalysis()) { setError(t.plans.limitReached); onLimitReached?.(); return; }

    setLoading(true);

    try {
      // Fetch news
      const newsRes = await fetch(`/api/news?q=${encodeURIComponent(stockName)}`);
      const newsData = await newsRes.json();
      const news: NewsItem[] = newsData.news || [];

      // Fetch stock data
      const symbol = stockName.match(/\(([^)]+)\)/)?.[1] || stockName.split(' ').pop() || stockName;
      const stockRes = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
      const stockJson = await stockRes.json();
      const stockData: StockData | null = stockJson.stockData;

      // Build context strings
      const newsContext = news.map((n: NewsItem) => `- ${n.title}: ${n.description}`).join('\n');
      const marketData = stockData
        ? `Price: ${stockData.price} ${stockData.currency}\nChange: ${stockData.change} (${stockData.changePercent?.toFixed(2)}%)\nVolume: ${stockData.volume}\nMarket Cap: ${stockData.marketCap}\n52W High: ${stockData.high52w}\n52W Low: ${stockData.low52w}`
        : '';

      // Analyze
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: imageMime, stockName, symbol, timeframe, riskProfile, newsContext, marketData, language }),
      });

      if (analyzeRes.status === 429) {
        setError(t.plans.limitReached);
        onLimitReached?.();
        setLoading(false);
        return;
      }
      const analyzeData = await analyzeRes.json();
      if (analyzeData.error) throw new Error(analyzeData.error);

      incrementAnalysisUsage();
      onResult(analyzeData.result, stockData, news, imageBase64, imageMime, stockName, timeframe, riskProfile);
    } catch (err) {
      console.error(err);
      setError(t.errors.analysisFailed);
    } finally {
      setLoading(false);
    }
  };

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1mo'];
  const riskProfiles: RiskProfile[] = ['conservative', 'balanced', 'aggressive'];

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-spinner" />
            <div className="loading-text loading-text-cycle" key={cycleIdx}>{t.form.analysisCycle[cycleIdx]}</div>
          </div>
        </div>
      )}
      <div className="page-header">
        <h1>{t.form.title}</h1>
        <p>{t.tagline}</p>
      </div>
      <div className="analysis-form">
        <div className="form-group">
          <label>{t.form.stockName}</label>
          <input
            className="form-input"
            placeholder={t.form.stockPlaceholder}
            value={stockName}
            onChange={(e) => setStockName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>{t.form.uploadChart}</label>
          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''} ${imagePreview ? 'has-image' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Chart" className="upload-preview" />
            ) : (
              <>
                <div className="upload-icon"><Icon name="upload" size={42} strokeWidth={1.5} /></div>
                <div className="upload-text">{t.form.dragDrop} <strong>{t.form.or} {t.form.browse}</strong></div>
                <div className="upload-formats">{t.form.supportedFormats}</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </div>

        <div className="form-group">
          <label>{t.form.timeframe}</label>
          <div className="chip-group">
            {timeframes.map(tf => (
              <button key={tf} className={`chip ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>
                {t.form.timeframes[tf]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{t.form.riskProfile}</label>
          <div className="chip-group">
            {riskProfiles.map(rp => (
              <button key={rp} className={`chip ${riskProfile === rp ? 'active' : ''}`} onClick={() => setRiskProfile(rp)}>
                {t.form.riskProfiles[rp]}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="warning" size={15} /> {error}</div>}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? t.form.analyzing : <><Icon name="search" size={16} /> {t.form.analyze}</>}
        </button>

        <div className="disclaimer">{t.disclaimer}</div>
      </div>
    </>
  );
}
