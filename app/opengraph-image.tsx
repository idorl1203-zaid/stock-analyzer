import { ImageResponse } from 'next/og';

export const alt = 'StockAI — AI-Powered Stock Analysis Terminal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Neon Cyber Grid social card — generated at build/request time.
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
          backgroundColor: '#06030f',
          backgroundImage:
            'radial-gradient(900px 500px at 80% -10%, rgba(177,78,255,0.45), transparent), radial-gradient(800px 500px at 10% 120%, rgba(0,240,255,0.32), transparent), radial-gradient(700px 500px at 110% 110%, rgba(255,46,151,0.30), transparent), linear-gradient(rgba(0,240,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.07) 1px, transparent 1px)',
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
              background: 'linear-gradient(135deg, #ff2e97, #b14eff 55%, #00f0ff)',
              color: '#ffffff',
              fontSize: '46px',
              fontWeight: 800,
              boxShadow: '0 0 50px rgba(0,240,255,0.6)',
            }}
          >
            SA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '34px', color: '#586577', letterSpacing: '6px', fontWeight: 700 }}>
              // TERMINAL
            </div>
          </div>
        </div>

        {/* title */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '120px', fontWeight: 900, color: '#eafcff', letterSpacing: '-2px', lineHeight: 1 }}>
            STOCK
          </div>
          <div style={{ fontSize: '120px', fontWeight: 900, color: '#00f0ff', letterSpacing: '-2px', lineHeight: 1 }}>
            AI
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: '40px', color: '#a98fd6', marginTop: '28px', fontWeight: 500 }}>
          AI-Powered Stock Chart Analysis · Live Market Feed
        </div>

        {/* faux ticker row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '34px', marginTop: '56px', fontSize: '30px', fontWeight: 700 }}>
          <div style={{ display: 'flex', gap: '10px', color: '#00ff9f' }}>AAPL ▲ 1.2%</div>
          <div style={{ display: 'flex', color: '#586577' }}>·</div>
          <div style={{ display: 'flex', gap: '10px', color: '#ff3864' }}>TSLA ▼ 0.4%</div>
          <div style={{ display: 'flex', color: '#586577' }}>·</div>
          <div style={{ display: 'flex', gap: '10px', color: '#00ff9f' }}>NVDA ▲ 2.1%</div>
          <div style={{ display: 'flex', color: '#586577' }}>·</div>
          <div style={{ display: 'flex', gap: '10px', color: '#00f0ff' }}>● LIVE</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
