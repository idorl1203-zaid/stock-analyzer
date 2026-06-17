'use client';
import { useState, useEffect } from 'react';
import { Language, AnalysisRecord, JournalEntry } from '@/lib/types';
import { translations } from '@/lib/translations';
import { getAnalyses, getJournalEntries } from '@/lib/storage';
import PerformanceChart from './PerformanceChart';
import Icon from './Icon';

interface Props {
  language: Language;
  onNavigate: (tab: string) => void;
  onViewAnalysis: (record: AnalysisRecord) => void;
  refreshKey: number;
}

export default function Dashboard({ language, onNavigate, onViewAnalysis, refreshKey }: Props) {
  const t = translations[language];
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    setAnalyses(getAnalyses());
    setEntries(getJournalEntries());
  }, [refreshKey]);

  const recentAnalyses = analyses.slice(0, 3);
  
  const activeEntries = entries.filter(e => e.status === 'active');
  const closedEntries = entries.filter(e => e.status === 'closed' && e.pnl !== undefined);
  const totalPnl = entries.filter(e => e.pnl !== undefined).reduce((sum, e) => sum + (e.pnl || 0), 0);
  
  const winningTrades = closedEntries.filter(e => (e.pnl || 0) > 0).length;
  const winRate = closedEntries.length > 0 ? Math.round((winningTrades / closedEntries.length) * 100) : 0;

  return (
    <div className="result-container" style={{ animation: 'slideUp 0.4s ease-out' }}>
      <div className="page-header">
        <h1>{t.dashboard.title}</h1>
        <p>{t.dashboard.subtitle}</p>
      </div>

      {/* ===== BENTO COMMAND CENTER ===== */}
      <div className="bento">
        {/* P01–P04 — vitals */}
        <div className="card span-3">
          <span className="panel-tag">P01 // ANALYSES</span>
          <div className="mini-tile">
            <div className="mini-val" style={{ color: 'var(--accent)' }}>{analyses.length}</div>
            <div className="mini-label">{t.dashboard.totalAnalyses}</div>
          </div>
        </div>
        <div className="card span-3">
          <span className="panel-tag">P02 // P&amp;L</span>
          <div className="mini-tile">
            <div className={`mini-val ${totalPnl >= 0 ? 'positive' : 'negative'}`}>{totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}</div>
            <div className="mini-label">{t.dashboard.journalPerformance}</div>
          </div>
        </div>
        <div className="card span-3">
          <span className="panel-tag">P03 // ACTIVE</span>
          <div className="mini-tile">
            <div className="mini-val" style={{ color: 'var(--blue)' }}>{activeEntries.length}</div>
            <div className="mini-label">{t.dashboard.activePositions}</div>
          </div>
        </div>
        <div className="card span-3">
          <span className="panel-tag">P04 // WIN RATE</span>
          <div className="mini-tile">
            <div className="mini-val" style={{ color: 'var(--yellow)' }}>{winRate}%</div>
            <div className="mini-label">{t.dashboard.winRate}</div>
          </div>
        </div>

        {/* P05 — recent feed */}
        <div className="card span-7">
          <span className="panel-tag">P05 // RECENT FEED</span>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <div className="card-icon"><Icon name="chart" /></div>
              <h2>{t.dashboard.recentAnalyses}</h2>
            </div>
            <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => onNavigate('history')}>
              {t.dashboard.viewAll}
            </button>
          </div>
          <div className="history-list">
            {recentAnalyses.length === 0 ? (
              <p className="result-text">{t.history.empty}</p>
            ) : (
              recentAnalyses.map(record => (
                <div key={record.id} className="history-item" onClick={() => onViewAnalysis(record)}>
                  <img src={`data:image/jpeg;base64,${record.imageBase64}`} alt="" className="history-thumb" loading="lazy" />
                  <div className="history-info">
                    <div className="history-name">{record.stockName}</div>
                    <div className="history-meta">
                      {new Date(record.timestamp).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                    </div>
                  </div>
                  <span className={`badge badge-${record.result.recommendation.toLowerCase()}`}>
                    {t.recommendations[record.result.recommendation]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* P06 — launch */}
        <div className="card span-5" style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="panel-tag">P06 // NEW ANALYSIS</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '13px', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '18px 4px' }}>
            <div style={{ color: 'var(--accent)', opacity: 0.9, display: 'flex', filter: 'drop-shadow(0 0 12px var(--accent-glow))' }}><Icon name="rocket" size={50} strokeWidth={1.5} /></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.form.title}</h2>
            <p className="result-text" style={{ fontSize: '13px' }}>{t.tagline}</p>
            <button className="btn-primary" onClick={() => onNavigate('analyze')} style={{ marginTop: '6px', width: '100%' }}>
              <Icon name="analyze" size={16} /> {t.form.analyze}
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('watchlist')} style={{ width: '100%', justifyContent: 'center' }}>
              <Icon name="watchlist" size={15} /> {t.nav.watchlist}
            </button>
          </div>
        </div>
      </div>

      {/* P07 — performance telemetry */}
      {(analyses.length > 0 || entries.length > 0) && (
        <div style={{ marginTop: '18px' }}>
          <div className="panel-tag" style={{ fontSize: '11px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="trend-up" size={14} /> P07 // {t.dashboard.performanceOverview}
          </div>
          <PerformanceChart language={language} entries={entries} analyses={analyses} />
        </div>
      )}
    </div>
  );
}
