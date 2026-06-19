'use client';
import { useState, useEffect } from 'react';
import { Language } from '@/lib/types';
import { translations } from '@/lib/translations';
import { PLANS, getPlanById, PlanId } from '@/lib/plans';
import { getPlanId, setPlanId, getUsage } from '@/lib/storage';
import Icon from './Icon';

interface Props { language: Language; onChanged?: () => void; }

export default function Plans({ language, onChanged }: Props) {
  const t = translations[language];
  const [current, setCurrent] = useState<PlanId>('starter');
  const [usage, setUsage] = useState(0);

  useEffect(() => {
    // Start from the local cache, then sync with the server source of truth if available.
    setCurrent(getPlanId());
    setUsage(getUsage().analyses);
    (async () => {
      try {
        const r = await fetch('/api/account');
        const d = await r.json();
        if (d.configured) {
          setCurrent(d.plan);
          setUsage(d.analyses);
          setPlanId(d.plan); // keep client-side limits aligned with the server plan
        }
      } catch { /* offline → use local cache */ }
    })();
  }, []);

  const limitLabel = (n: number) => (n === -1 ? t.plans.unlimited : String(n));
  const tpl = (s: string, n: number) => s.replace('{n}', limitLabel(n));

  const choose = async (id: PlanId) => {
    setPlanId(id);      // local cache (client-side limits + instant UI)
    setCurrent(id);
    onChanged?.();
    try { await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: id }) }); } catch { /* server sync best-effort */ }
  };

  const plan = getPlanById(current);
  const analysesLimit = plan.limits.analyses;
  const pct = analysesLimit === -1 ? 0 : Math.min(100, Math.round((usage / analysesLimit) * 100));

  return (
    <div className="result-container">
      <div className="page-header"><h1>{t.plans.title}</h1><p>{t.plans.subtitle}</p></div>

      {/* usage meter for the current plan */}
      <div className="card" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.plans.usageThisMonth}
          </span>
          <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            {usage} / {limitLabel(analysesLimit)}
          </span>
        </div>
        <div className="confidence-bar"><div className="confidence-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--red)' : undefined }} /></div>
      </div>

      <div className="plans-grid">
        {PLANS.map(p => {
          const isCurrent = p.id === current;
          return (
            <div key={p.id} className={`plan-card ${p.highlight ? 'plan-pop' : ''} ${isCurrent ? 'plan-current' : ''}`}>
              {p.highlight && <div className="plan-ribbon">{t.plans.mostPopular}</div>}
              <div className="plan-name">{p.name}</div>
              <div className="plan-price"><span className="mono">${p.price}</span><span className="plan-per">{t.plans.perMonth}</span></div>
              <ul className="plan-feats">
                <li><Icon name="check" size={14} /> {tpl(t.plans.analysesPerMonth, p.limits.analyses)}</li>
                <li><Icon name="check" size={14} /> {tpl(t.plans.watchlistSize, p.limits.watchlist)}</li>
                <li><Icon name="check" size={14} /> {tpl(t.plans.historyDepth, p.limits.history)}</li>
              </ul>
              <button
                className={isCurrent ? 'btn-secondary' : 'btn-primary'}
                style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                disabled={isCurrent}
                onClick={() => choose(p.id)}
              >
                {isCurrent ? <><Icon name="check" size={15} /> {t.plans.current}</> : t.plans.select}
              </button>
            </div>
          );
        })}
      </div>

      <div className="disclaimer">{t.plans.note}</div>
    </div>
  );
}
