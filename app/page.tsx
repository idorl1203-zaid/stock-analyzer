import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import Icon from "@/components/Icon";

const TICKS = [
  { s: "AAPL", c: "+1.24%", up: true },
  { s: "NVDA", c: "+2.10%", up: true },
  { s: "TSLA", c: "-0.42%", up: false },
  { s: "MSFT", c: "+0.31%", up: true },
  { s: "AMZN", c: "-0.88%", up: false },
  { s: "SPY", c: "+0.46%", up: true },
];

export default async function Landing() {
  const { userId } = await auth();
  const signedIn = !!userId;

  const primaryCta = signedIn ? (
    <Link href="/app" className="btn-primary lp-cta-lg">
      <Icon name="analyze" size={18} /> Launch the Terminal
    </Link>
  ) : (
    <>
      <Link href="/sign-up" className="btn-primary lp-cta-lg">
        <Icon name="rocket" size={18} /> Get started — it&apos;s free
      </Link>
      <Link href="/sign-in" className="lp-ghost lp-ghost-lg">Sign in</Link>
    </>
  );

  return (
    <div className="landing">
      <div className="landing-grid" />

      {/* NAV */}
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-logo">◈</span>
          <span>STOCK<span className="accent">AI</span></span>
          <span className="lp-brand-sub">// TERMINAL</span>
        </div>
        <nav className="lp-nav-actions">
          {signedIn ? (
            <Link href="/app" className="btn-primary lp-nav-cta">
              <Icon name="analyze" size={16} /> Open Terminal
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="lp-ghost">Sign in</Link>
              <Link href="/sign-up" className="btn-primary lp-nav-cta">Get started</Link>
            </>
          )}
        </nav>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-eyebrow"><span className="live-dot" /> AI TRADING TERMINAL · LIVE MARKET FEED</div>
        <h1 className="lp-title">
          Read any stock chart<br />like a <span className="accent">20-year veteran.</span>
        </h1>
        <p className="lp-sub">
          Drop in a screenshot of any chart and StockAI returns a complete technical
          breakdown — trend, momentum, key levels, and exact stop-loss &amp; take-profit
          targets — fused with live market data and the latest news. In seconds.
        </p>

        <div className="lp-cta-row">{primaryCta}</div>
        <p className="lp-micro">Runs in your browser · Installable on any device · Educational use only</p>

        {/* live ticker strip */}
        <div className="lp-ticker">
          {TICKS.concat(TICKS).map((t, i) => (
            <span className="lp-tick" key={i}>
              <span className="lp-tick-sym">{t.s}</span>
              <span className={t.up ? "positive" : "negative"}>{t.up ? "▲" : "▼"} {t.c}</span>
            </span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section">
        <h2 className="lp-h2">Your entire trading desk, in one screen</h2>
        <div className="lp-features">
          {[
            { icon: "chart" as const, title: "AI Chart Analysis", body: "Drop in any chart image. StockAI reads candles, patterns, momentum and indicators, then hands you a clear BUY / SELL / HOLD with a confidence score." },
            { icon: "market" as const, title: "Live Market Feed", body: "A real-time ticker streams your watchlist and the majors, while fresh news is folded into every analysis — so your read reflects right now." },
            { icon: "shield" as const, title: "Risk-Managed Plays", body: "Every call ships with a stop-loss and layered take-profit targets, tuned to your style — conservative, balanced, or aggressive." },
            { icon: "dashboard" as const, title: "A True Command Center", body: "Watchlist, trading journal, performance charts and a ⌘K command palette — wrapped in a neon trading-floor UI, in English or Hebrew." },
          ].map((f) => (
            <div className="lp-feature" key={f.title}>
              <div className="lp-feature-icon"><Icon name={f.icon} size={22} /></div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section">
        <h2 className="lp-h2">From screenshot to plan in three moves</h2>
        <div className="lp-steps">
          {[
            { n: "01", t: "Upload", b: "Paste or drop a screenshot of the chart you're watching." },
            { n: "02", t: "Analyze", b: "StockAI pulls live price + news and runs a deep technical read." },
            { n: "03", t: "Execute", b: "Get an actionable plan — direction, levels, risk — ready to journal." },
          ].map((s) => (
            <div className="lp-step" key={s.n}>
              <div className="lp-step-n">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="lp-cta-band">
        <h2>Your AI trading desk is one chart away.</h2>
        {signedIn ? (
          <Link href="/app" className="btn-primary lp-cta-lg">
            <Icon name="analyze" size={18} /> Open the Terminal
          </Link>
        ) : (
          <Link href="/sign-up" className="btn-primary lp-cta-lg">
            <Icon name="rocket" size={18} /> Create your free account
          </Link>
        )}
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-brand">
          <span className="lp-brand-logo">◈</span>
          <span>STOCK<span className="accent">AI</span></span>
        </div>
        <p className="lp-disclaimer">
          For educational purposes only. Not financial advice. Always do your own research.
        </p>
        <div className="lp-footer-links">
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Get started</Link>
        </div>
      </footer>
    </div>
  );
}
