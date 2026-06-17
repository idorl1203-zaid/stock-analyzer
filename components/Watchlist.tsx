'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Language, WatchlistItem } from '@/lib/types';
import { translations } from '@/lib/translations';
import { getWatchlist, saveWatchlistItem, deleteWatchlistItem, generateId } from '@/lib/storage';
import Icon from './Icon';

interface Props {
  language: Language;
  onAnalyze?: (symbol: string) => void;
}

// Mini sparkline using SVG
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 80, H = 30;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  const color = positive ? '#00ff9f' : '#ff3864';
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', filter: `drop-shadow(0 0 3px ${color})` }}>
      <defs>
        <linearGradient id={`sg-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${H} ${pts} ${W},${H}`}
        fill={`url(#sg-${positive})`}
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Watchlist({ language, onAnalyze }: Props) {
  const t = translations[language];
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reload = useCallback(() => setItems(getWatchlist()), []);

  useEffect(() => {
    reload();
  }, [reload]);

  const refreshPrices = useCallback(async (watchlist?: WatchlistItem[]) => {
    const list = watchlist || getWatchlist();
    if (list.length === 0) return;
    setRefreshing(true);
    try {
      await Promise.all(list.map(async (item) => {
        try {
          const res = await fetch(`/api/stock?symbol=${encodeURIComponent(item.symbol)}`);
          const data = await res.json();
          if (data.stockData) {
            const updated: WatchlistItem = {
              ...item,
              lastPrice: data.stockData.price,
              lastChange: data.stockData.change,
              lastChangePercent: data.stockData.changePercent,
              lastUpdated: Date.now(),
            };
            saveWatchlistItem(updated);
            // Simulate sparkline data with small random walk around price
            if (data.stockData.price) {
              const base = data.stockData.price;
              const pts = Array.from({ length: 12 }, (_, i) =>
                base + (Math.sin(i * 0.8 + base) * base * 0.015) + (Math.random() - 0.5) * base * 0.005
              );
              setSparklines(prev => ({ ...prev, [item.id]: pts }));
            }
          }
        } catch { /* skip failed items */ }
      }));
      reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  useEffect(() => {
    if (items.length > 0) {
      refreshPrices(items);
      intervalRef.current = setInterval(() => refreshPrices(), 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const handleAdd = async () => {
    if (!input.trim()) return;
    setError('');
    setLoading(true);
    const symbol = input.trim().toUpperCase();
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (!data.stockData?.price) {
        setError(language === 'he' ? 'לא נמצא סמל מניה' : 'Symbol not found');
        setLoading(false);
        return;
      }
      const item: WatchlistItem = {
        id: generateId(),
        symbol,
        name: data.stockData.name || symbol,
        addedAt: Date.now(),
        lastPrice: data.stockData.price,
        lastChange: data.stockData.change,
        lastChangePercent: data.stockData.changePercent,
        lastUpdated: Date.now(),
      };
      saveWatchlistItem(item);
      reload();
      setInput('');
      setShowAdd(false);
    } catch {
      setError(language === 'he' ? 'שגיאה בטעינה' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    deleteWatchlistItem(id);
    reload();
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return language === 'he' ? `לפני ${diff}ש` : `${diff}s ago`;
    if (diff < 3600) return language === 'he' ? `לפני ${Math.floor(diff / 60)}ד` : `${Math.floor(diff / 60)}m ago`;
    return language === 'he' ? `לפני ${Math.floor(diff / 3600)}ש` : `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div>
      <div className="page-header">
        <h1>{language === 'he' ? 'רשימת מעקב' : 'Watchlist'}</h1>
        <p>{language === 'he' ? 'עקוב אחרי מניות בזמן אמת' : 'Track your stocks in real-time'}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {refreshing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <div className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', margin: 0 }} />
              {language === 'he' ? 'מעדכן...' : 'Updating...'}
            </div>
          )}
          {!refreshing && items.length > 0 && (
            <button className="btn-secondary" style={{ padding: '7px 13px', fontSize: '12px' }} onClick={() => refreshPrices()}>
              <Icon name="refresh" size={14} /> {language === 'he' ? 'רענן' : 'Refresh'}
            </button>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <><Icon name="close" size={15} /> {language === 'he' ? 'סגור' : 'Close'}</> : <><Icon name="plus" size={16} /> {language === 'he' ? 'הוסף מניה' : 'Add Stock'}</>}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: '20px', animation: 'slideUp 0.3s ease' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                className="form-input"
                placeholder={language === 'he' ? 'הזן סמל מניה (AAPL, TSLA...)' : 'Enter stock symbol (AAPL, TSLA...)'}
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              {error && <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}><Icon name="warning" size={13} /> {error}</div>}
            </div>
            <button className="btn-primary" onClick={handleAdd} disabled={loading} style={{ padding: '12px 24px' }}>
              {loading ? '···' : language === 'he' ? 'הוסף' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="watchlist" size={52} strokeWidth={1.5} /></div>
          <p>{language === 'he' ? 'אין מניות ברשימת המעקב. הוסף מניה כדי להתחיל!' : 'No stocks in your watchlist yet. Add one to get started!'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map(item => {
            const isPositive = (item.lastChange || 0) >= 0;
            const sparkData = sparklines[item.id];
            return (
              <div
                key={item.id}
                className="watchlist-card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => onAnalyze?.(item.symbol)}
              >
                {/* Symbol badge */}
                <div style={{
                  width: '46px', height: '46px',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '11px', color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
                  flexShrink: 0,
                }}>
                  {item.symbol.slice(0, 4)}
                </div>

                {/* Name & meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{item.symbol}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  {item.lastUpdated && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)' }}>
                      <Icon name="clock" size={10} /> {formatTime(item.lastUpdated)}
                    </div>
                  )}
                </div>

                {/* Sparkline */}
                {sparkData && (
                  <div style={{ flexShrink: 0 }}>
                    <Sparkline data={sparkData} positive={isPositive} />
                  </div>
                )}

                {/* Price */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="ticker-price" style={{ fontWeight: 800, fontSize: '18px' }}>
                    {item.lastPrice != null ? `$${item.lastPrice.toFixed(2)}` : '—'}
                  </div>
                  {item.lastChange != null && (
                    <div style={{
                      fontSize: '13px', fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      color: isPositive ? 'var(--green)' : 'var(--red)',
                    }}>
                      {isPositive ? '+' : ''}{item.lastChange.toFixed(2)} ({item.lastChangePercent?.toFixed(2)}%)
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '8px 10px' }}
                    title={language === 'he' ? 'נתח' : 'Analyze'}
                    onClick={() => onAnalyze?.(item.symbol)}
                  >
                    <Icon name="analyze" size={15} />
                  </button>
                  <button
                    className="btn-danger"
                    style={{ padding: '8px 10px' }}
                    title={language === 'he' ? 'מחק' : 'Delete'}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'var(--font-mono)' }}>
        <Icon name="refresh" size={12} /> {language === 'he' ? 'מחירים מתעדכנים אוטומטית כל 30 שניות' : 'Prices auto-refresh every 30 seconds'}
      </div>
    </div>
  );
}
