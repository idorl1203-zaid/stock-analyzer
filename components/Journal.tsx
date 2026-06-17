'use client';
import { useState, useEffect } from 'react';
import { Language, JournalEntry, Recommendation } from '@/lib/types';
import { translations } from '@/lib/translations';
import { getJournalEntries, saveJournalEntry, deleteJournalEntry, generateId } from '@/lib/storage';
import Icon from './Icon';

interface Props {
  language: Language;
  refreshKey: number;
}

export default function Journal({ language, refreshKey }: Props) {
  const t = translations[language];
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState({
    stockName: '', stockSymbol: '', status: 'watching' as JournalEntry['status'],
    entryPrice: '', exitPrice: '', notes: '', recommendation: 'HOLD' as Recommendation,
    stopLoss: '', takeProfit: '',
  });

  useEffect(() => { setEntries(getJournalEntries()); }, [refreshKey]);

  const reload = () => setEntries(getJournalEntries());

  const openNew = () => {
    setEditEntry(null);
    setForm({ stockName: '', stockSymbol: '', status: 'watching', entryPrice: '', exitPrice: '', notes: '', recommendation: 'HOLD', stopLoss: '', takeProfit: '' });
    setShowModal(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditEntry(entry);
    setForm({
      stockName: entry.stockName, stockSymbol: entry.stockSymbol, status: entry.status,
      entryPrice: entry.entryPrice?.toString() || '', exitPrice: entry.exitPrice?.toString() || '',
      notes: entry.notes, recommendation: entry.recommendation,
      stopLoss: entry.stopLoss || '', takeProfit: entry.takeProfit || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const entryPrice = form.entryPrice ? parseFloat(form.entryPrice) : undefined;
    const exitPrice = form.exitPrice ? parseFloat(form.exitPrice) : undefined;
    let pnl: number | undefined;
    let pnlPercent: number | undefined;
    if (entryPrice && exitPrice) {
      pnl = exitPrice - entryPrice;
      pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    }

    const entry: JournalEntry = {
      id: editEntry?.id || generateId(),
      timestamp: editEntry?.timestamp || Date.now(),
      stockName: form.stockName, stockSymbol: form.stockSymbol,
      status: form.status, entryPrice, exitPrice,
      notes: form.notes, recommendation: form.recommendation,
      stopLoss: form.stopLoss, takeProfit: form.takeProfit,
      pnl, pnlPercent,
      analysisId: editEntry?.analysisId,
    };
    saveJournalEntry(entry);
    reload();
    setShowModal(false);
  };

  const handleDelete = (id: string) => { deleteJournalEntry(id); reload(); };

  const stats = {
    total: entries.length,
    active: entries.filter(e => e.status === 'active').length,
    watching: entries.filter(e => e.status === 'watching').length,
    closed: entries.filter(e => e.status === 'closed').length,
    totalPnl: entries.filter(e => e.pnl !== undefined).reduce((sum, e) => sum + (e.pnl || 0), 0),
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t.journal.title}</h1>
        <p>{t.journal.subtitle}</p>
      </div>

      <div className="journal-header">
        <div />
        <button className="btn-primary" onClick={openNew}><Icon name="plus" size={16} /> {t.journal.addEntry}</button>
      </div>

      <div className="journal-stats">
        <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--blue)' }}>{stats.watching}</div><div className="stat-label">{t.journal.status.watching}</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--green)' }}>{stats.active}</div><div className="stat-label">{t.journal.status.active}</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--text-muted)' }}>{stats.closed}</div><div className="stat-label">{t.journal.status.closed}</div></div>
        <div className="stat-card">
          <div className={`stat-value ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`}>
            {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}
          </div>
          <div className="stat-label">{t.journal.pnl}</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><Icon name="journal" size={52} strokeWidth={1.5} /></div><p>{t.journal.empty}</p></div>
      ) : (
        <div className="journal-list">
          {entries.map(entry => (
            <div key={entry.id} className="journal-item">
              <div className="journal-item-header">
                <div className="journal-item-title">{entry.stockName} ({entry.stockSymbol})</div>
                <div className="result-badges">
                  <span className={`badge status-${entry.status}`}>{t.journal.status[entry.status]}</span>
                  <span className={`badge badge-${entry.recommendation.toLowerCase()}`}>{t.recommendations[entry.recommendation]}</span>
                </div>
              </div>
              <div className="journal-item-details">
                {entry.entryPrice && <div className="journal-detail"><strong>{t.journal.entryPrice}:</strong> ${entry.entryPrice}</div>}
                {entry.exitPrice && <div className="journal-detail"><strong>{t.journal.exitPrice}:</strong> ${entry.exitPrice}</div>}
                {entry.stopLoss && <div className="journal-detail"><strong>{t.journal.stopLoss}:</strong> {entry.stopLoss}</div>}
                {entry.takeProfit && <div className="journal-detail"><strong>{t.journal.takeProfit}:</strong> {entry.takeProfit}</div>}
                {entry.pnl !== undefined && (
                  <div className="journal-detail">
                    <strong>{t.journal.pnl}:</strong>{' '}
                    <span className={entry.pnl >= 0 ? 'positive' : 'negative'}>
                      {entry.pnl >= 0 ? '+' : ''}{entry.pnl.toFixed(2)} ({entry.pnlPercent?.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
              {entry.notes && <div className="journal-notes">"{entry.notes}"</div>}
              <div className="journal-item-actions">
                <button className="btn-secondary" onClick={() => openEdit(entry)}><Icon name="edit" size={14} /> {t.journal.edit}</button>
                <button className="btn-danger" onClick={() => handleDelete(entry.id)}><Icon name="trash" size={14} /> {t.journal.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editEntry ? t.journal.edit : t.journal.addEntry}</h2>
            <div className="form-group">
              <label>{t.journal.stockName}</label>
              <input className="form-input" value={form.stockName} onChange={e => setForm({ ...form, stockName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t.journal.stockSymbol}</label>
              <input className="form-input" value={form.stockSymbol} onChange={e => setForm({ ...form, stockSymbol: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <div className="chip-group">
                {(['watching', 'active', 'closed'] as const).map(s => (
                  <button key={s} className={`chip ${form.status === s ? 'active' : ''}`} onClick={() => setForm({ ...form, status: s })}>
                    {t.journal.status[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>{t.result.recommendation}</label>
              <div className="chip-group">
                {(['BUY', 'SELL', 'HOLD', 'AVOID'] as const).map(r => (
                  <button key={r} className={`chip ${form.recommendation === r ? 'active' : ''}`} onClick={() => setForm({ ...form, recommendation: r })}>
                    {t.recommendations[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>{t.journal.entryPrice}</label>
              <input className="form-input" type="number" value={form.entryPrice} onChange={e => setForm({ ...form, entryPrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t.journal.exitPrice}</label>
              <input className="form-input" type="number" value={form.exitPrice} onChange={e => setForm({ ...form, exitPrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t.journal.stopLoss}</label>
              <input className="form-input" value={form.stopLoss} onChange={e => setForm({ ...form, stopLoss: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t.journal.takeProfit}</label>
              <input className="form-input" value={form.takeProfit} onChange={e => setForm({ ...form, takeProfit: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t.journal.notes}</label>
              <textarea className="form-input" rows={3} value={form.notes} placeholder={t.journal.addNote} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>{t.journal.cancel}</button>
              <button className="btn-primary" onClick={handleSave}>{t.journal.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
