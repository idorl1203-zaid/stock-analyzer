import { ImageResponse } from 'next/og';

export const alt = 'StockAI — AI-Powered Stock Analysis Terminal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Obsidian & Gold social card — generated at build/request time.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#0a0a0c',
          backgroundImage:
            'radial-gradient(900px 500px at 80% -10%, rgba(212,175,55,0.28), transparent), radial-gradient(800px 500px at 10% 120%, rgba(212,175,55,0.16), transparent), radial-gradient(700px 500px at 110% 110%, rgba(184,144,42,0.18), transparent), linear-gradient(rgba(212,175,55,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.05) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 48px 48px, 48px 48px',
        }}
      >
        {/* brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '92px',
              height: '92px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #e6c66e, #d4af37 55%, #b8902a)',
              color: '#1a1305',
              fontSize: '46px',
              fontWeight: 800,
              boxShadow: '0 0 50px rgba(212,175,55,0.5)',
            }}
          >
            SA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '34px', color: '#80785f', letterSpacing: '6px', fontWeight: 700 }}>
              // TERMINAL
            </div>
          </div>
        </div>

        {/* title */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '120px', fontWeight: 900, color: '#f5f0e6', letterSpacing: '-2px', lineHeight: 1 }}>
            STOCK
          </div>
          <div style={{ fontSize: '120px', fontWeight: 900, color: '#d4af37', letterSpacing: '-2px', lineHeight: 1 }}>
            AI
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: '40px', color: '#b8ad97', marginTop: '28px', fontWeight: 500 }}>
          AI-Powered Stock Chart Analysis · Live Market Feed
        </div>

        {/* faux ticker row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '34px', marginTop: '56px', fontSize: '30px', fontWeight: 700 }}>
          <div style={{ display: 'flex', gap: '10px', color: '#4caf80' }}>AAPL ▲ 1.2%</div>
          <div style={{ display: 'flex', color: '#80785f' }}>·</div>
          <div style={{ display: 'flex', gap: '10px', color: '#d4646e' }}>TSLA ▼ 0.4%</div>
          <div style={{ display: 'flex', color: '#80785f' }}>·</div>
          <div style={{ display: 'flex', gap: '10px', color: '#4caf80' }}>NVDA ▲ 2.1%</div>
          <div style={{ display: 'flex', color: '#80785f' }}>·</div>
          <div style={{ display: 'flex', gap: '10px', color: '#d4af37' }}>● LIVE</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
