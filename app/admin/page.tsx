'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';

interface AdminUser {
  id: string; email: string; name: string; plan: string; planName: string;
  price: number; analyses: number; createdAt: number; lastActiveAt: number | null;
}
interface PlanRow { id: string; name: string; price: number; count: number; revenue: number; }
interface AdminData {
  configured: boolean; totalUsers: number; mrr: number;
  planSummary: PlanRow[]; users: AdminUser[];
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PLAN_COLOR: Record<string, string> = { starter: 'var(--text-secondary)', trader: 'var(--accent)', pro: 'var(--accent-2)', elite: 'var(--green)' };

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [status, setStatus] = useState<'loading' | 'forbidden' | 'error' | 'ok'>('loading');

  useEffect(() => {
    fetch('/api/admin')
      .then(async (r) => {
        if (r.status === 403) { setStatus('forbidden'); return; }
        if (!r.ok) { setStatus('error'); return; }
        setData(await r.json());
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, []);

  const wrap = (children: ReactNode) => (
    <div dir="rtl" style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.04em' }}>ADMIN · STOCKAI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>לוח בקרה — משתמשים, מסלולים והכנסות</p>
        </div>
        <Link href="/app" className="btn-secondary" style={{ textDecoration: 'none' }}>← חזרה לאפליקציה</Link>
      </div>
      {children}
    </div>
  );

  if (status === 'loading') return wrap(<div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px' }}>טוען…</div>);
  if (status === 'forbidden') return wrap(<div className="card" style={{ textAlign: 'center', padding: '50px', color: 'var(--red)' }}>⛔ אין לך הרשאת אדמין.</div>);
  if (status === 'error' || !data) return wrap(<div className="card" style={{ textAlign: 'center', padding: '50px', color: 'var(--red)' }}>שגיאה בטעינת הנתונים.</div>);

  return wrap(
    <>
      {/* KPI cards */}
      <div className="journal-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '8px' }}>
        <div className="stat-card">
          <div className="stat-value mono" style={{ color: 'var(--accent)' }}>{data.totalUsers}</div>
          <div className="stat-label">סה״כ משתמשים</div>
        </div>
        <div className="stat-card">
          <div className="stat-value mono" style={{ color: 'var(--green)' }}>{money(data.mrr)}</div>
          <div className="stat-label">הכנסה חודשית (MRR)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value mono">{money(data.mrr * 12)}</div>
          <div className="stat-label">הכנסה שנתית צפויה</div>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '24px' }}>* החיוב עדיין לא פעיל — ההכנסה מחושבת לפי המסלולים שנבחרו.</p>

      {/* Plan breakdown */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header"><h2>חלוקה לפי מסלול</h2></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'right' }}>
                <th style={{ padding: '8px 10px' }}>מסלול</th>
                <th style={{ padding: '8px 10px' }}>מחיר</th>
                <th style={{ padding: '8px 10px' }}>משתמשים</th>
                <th style={{ padding: '8px 10px' }}>הכנסה חודשית</th>
              </tr>
            </thead>
            <tbody>
              {data.planSummary.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 700, color: PLAN_COLOR[p.id] || 'var(--text-primary)' }}>{p.name}</td>
                  <td style={{ padding: '10px' }} className="mono">{money(p.price)}</td>
                  <td style={{ padding: '10px' }} className="mono">{p.count}</td>
                  <td style={{ padding: '10px' }} className="mono" >{money(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users */}
      <div className="card">
        <div className="card-header"><h2>משתמשים · {data.users.length}</h2></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'right' }}>
                <th style={{ padding: '8px 10px' }}>שם</th>
                <th style={{ padding: '8px 10px' }}>אימייל</th>
                <th style={{ padding: '8px 10px' }}>מסלול</th>
                <th style={{ padding: '8px 10px' }}>ניתוחים החודש</th>
                <th style={{ padding: '8px 10px' }}>נרשם</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '10px' }}>
                    <span className="mono" style={{ fontWeight: 700, color: PLAN_COLOR[u.plan] || 'var(--text-primary)' }}>{u.planName}</span>
                  </td>
                  <td style={{ padding: '10px' }} className="mono">{u.analyses}</td>
                  <td style={{ padding: '10px', color: 'var(--text-muted)' }} className="mono">{new Date(u.createdAt).toLocaleDateString('he-IL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
