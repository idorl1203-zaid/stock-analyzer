'use client';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { Language, JournalEntry, AnalysisRecord } from '@/lib/types';
import { translations } from '@/lib/translations';
import Icon from './Icon';

interface Props {
  language: Language;
  entries: JournalEntry[];
  analyses: AnalysisRecord[];
}

const RECOMMENDATION_COLORS = {
  BUY: '#4caf80',
  SELL: '#d4646e',
  HOLD: '#e0b94e',
  AVOID: '#c77d8a',
};

const CHART_COLORS = ['#d4af37', '#4caf80', '#d4646e', '#e0b94e', '#6ea8c4', '#b8902a'];

export default function PerformanceChart({ language, entries, analyses }: Props) {
  const t = translations[language];

  // P&L over time (cumulative)
  const closedWithPnl = entries
    .filter(e => e.pnl !== undefined && e.exitPrice !== undefined)
    .sort((a, b) => a.timestamp - b.timestamp);

  let cumulative = 0;
  const pnlData = closedWithPnl.map(e => {
    cumulative += e.pnl || 0;
    return {
      name: e.stockSymbol,
      date: new Date(e.timestamp).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' }),
      pnl: parseFloat((e.pnl || 0).toFixed(2)),
      cumulative: parseFloat(cumulative.toFixed(2)),
    };
  });

  // Recommendation distribution
  const recCounts = analyses.reduce((acc, a) => {
    acc[a.result.recommendation] = (acc[a.result.recommendation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(recCounts).map(([key, value]) => ({
    name: t.recommendations[key as keyof typeof t.recommendations],
    value,
    color: RECOMMENDATION_COLORS[key as keyof typeof RECOMMENDATION_COLORS],
  }));

  // Monthly analysis count
  const monthlyData: Record<string, number> = {};
  analyses.forEach(a => {
    const month = new Date(a.timestamp).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'short' });
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });
  const barData = Object.entries(monthlyData).slice(-6).map(([month, count]) => ({ month, count }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
        }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.value >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              {typeof p.value === 'number' && p.value >= 0 ? '+' : ''}{p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (analyses.length === 0 && entries.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>

      {/* P&L Cumulative Line Chart */}
      {pnlData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ color: 'var(--green)' }}><Icon name="trend-up" /></div>
            <h2>{language === 'he' ? 'P&L מצטבר' : 'Cumulative P&L'}</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={pnlData}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf80" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#4caf80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#4caf80"
                strokeWidth={2}
                fill="url(#pnlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendation Pie Chart */}
      {pieData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon"><Icon name="pie" /></div>
            <h2>{language === 'he' ? 'חלוקת המלצות' : 'Recommendations'}</h2>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={74}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value} ${language === 'he' ? 'ניתוחים' : 'Analyses'}`, '']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* custom legend below — avoids the overlap recharts' built-in legend caused on mobile */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: '12px' }}>
            {pieData.map((d, i) => {
              const total = pieData.reduce((s, x) => s + x.value, 0) || 1;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color || CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{d.value} · {Math.round((d.value / total) * 100)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Analysis Bar Chart */}
      {barData.length > 1 && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon"><Icon name="bar" /></div>
            <h2>{language === 'he' ? 'ניתוחים חודשיים' : 'Monthly Analyses'}</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
              />
              <Bar dataKey="count" fill="#d4af37" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
