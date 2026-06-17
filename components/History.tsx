'use client';
import { useState, useEffect } from 'react';
import { Language, AnalysisRecord } from '@/lib/types';
import { translations } from '@/lib/translations';
import { getAnalyses, deleteAnalysis } from '@/lib/storage';
import Icon from './Icon';

interface Props {
  language: Language;
  onViewAnalysis: (record: AnalysisRecord) => void;
  refreshKey: number;
}

export default function History({ language, onViewAnalysis, refreshKey }: Props) {
  const t = translations[language];
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setAnalyses(getAnalyses());
  }, [refreshKey]);

  const filtered = analyses.filter(a => {
    const matchesSearch = a.stockName.toLowerCase().includes(search.toLowerCase()) || a.stockSymbol?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || a.result.recommendation === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAnalysis(id);
    setAnalyses(getAnalyses());
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t.history.title}</h1>
        <p>{t.history.subtitle}</p>
      </div>

      <div className="history-controls">
        <input
          className="search-input"
          placeholder={t.history.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="chip-group">
          {['all', 'BUY', 'SELL', 'HOLD', 'AVOID'].map(f => (
            <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? t.history.all : t.recommendations[f as keyof typeof t.recommendations]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="chart" size={52} strokeWidth={1.5} /></div>
          <p>{t.history.empty}</p>
        </div>
      ) : (
        <div className="history-list">
          {filtered.map(record => (
            <div key={record.id} className="history-item" onClick={() => onViewAnalysis(record)}>
              <img src={`data:image/jpeg;base64,${record.imageBase64}`} alt="" className="history-thumb" loading="lazy" />
              <div className="history-info">
                <div className="history-name">{record.stockName}</div>
                <div className="history-meta">
                  {new Date(record.timestamp).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} • {t.form.timeframes[record.timeframe]}
                </div>
              </div>
              <span className={`badge badge-${record.result.recommendation.toLowerCase()}`}>
                {t.recommendations[record.result.recommendation]}
              </span>
              <div className="history-actions">
                <button className="btn-danger" style={{ padding: '8px 10px' }} onClick={(e) => handleDelete(record.id, e)}><Icon name="trash" size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
