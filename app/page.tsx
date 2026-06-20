'use client';
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import Icon, { IconName } from "@/components/Icon";
import { getSettings, saveSettings } from "@/lib/storage";
import type { Language } from "@/lib/types";

const TICKS = [
  { s: "AAPL", c: "+1.24%", up: true },
  { s: "NVDA", c: "+2.10%", up: true },
  { s: "TSLA", c: "-0.42%", up: false },
  { s: "MSFT", c: "+0.31%", up: true },
  { s: "AMZN", c: "-0.88%", up: false },
  { s: "SPY", c: "+0.46%", up: true },
];

const COPY = {
  en: {
    signIn: "Sign in", getStarted: "Get started", openTerminal: "Open Terminal",
    eyebrow: "AI TRADING TERMINAL · LIVE MARKET FEED",
    titleA: "Read any stock chart", titleB: "like a", titleAccent: "20-year veteran.",
    sub: "Drop in a screenshot of any chart and StockAI returns a complete technical breakdown — trend, momentum, key levels, and exact stop-loss & take-profit targets — fused with live market data and the latest news. In seconds.",
    ctaFree: "Get started — it's free", launch: "Launch the Terminal",
    micro: "Runs in your browser · Installable on any device · Educational use only",
    featuresH: "Your entire trading desk, in one screen",
    features: [
      { icon: "chart" as IconName, t: "AI Chart Analysis", b: "Drop in any chart image. StockAI reads candles, patterns, momentum and indicators, then hands you a clear BUY / SELL / HOLD with a confidence score." },
      { icon: "market" as IconName, t: "Live Market Feed", b: "A real-time ticker streams your watchlist and the majors, while fresh news is folded into every analysis — so your read reflects right now." },
      { icon: "shield" as IconName, t: "Risk-Managed Plays", b: "Every call ships with a stop-loss and layered take-profit targets, tuned to your style — conservative, balanced, or aggressive." },
      { icon: "dashboard" as IconName, t: "A True Command Center", b: "Watchlist, trading journal, performance charts and a ⌘K command palette — wrapped in a neon trading-floor UI, in English or Hebrew." },
    ],
    stepsH: "From screenshot to plan in three moves",
    steps: [
      { n: "01", t: "Upload", b: "Paste or drop a screenshot of the chart you're watching." },
      { n: "02", t: "Analyze", b: "StockAI pulls live price + news and runs a deep technical read." },
      { n: "03", t: "Execute", b: "Get an actionable plan — direction, levels, risk — ready to journal." },
    ],
    bandH: "Your AI trading desk is one chart away.",
    bandCta: "Create your free account", bandOpen: "Open the Terminal",
    disclaimer: "For educational purposes only. Not financial advice. Always do your own research.",
    terms: "Terms of Service", privacy: "Privacy Policy",
  },
  he: {
    signIn: "התחברות", getStarted: "מתחילים בחינם", openTerminal: "לטרמינל",
    eyebrow: "טרמינל מסחר מבוסס AI · נתוני שוק בזמן אמת",
    titleA: "תקרא כל גרף מניה", titleB: "כמו", titleAccent: "אנליסט עם 20 שנות ניסיון.",
    sub: "מעלים צילום מסך של כל גרף, ו-StockAI מחזיר ניתוח טכני שלם — מגמה, מומנטום, רמות מפתח ונקודות סטופ-לוס וטייק-פרופיט מדויקות. הכול משולב עם נתוני שוק בזמן אמת והחדשות הכי טריות. תוך שניות.",
    ctaFree: "מתחילים בחינם", launch: "כניסה לטרמינל",
    micro: "עובד בדפדפן · ניתן להתקנה בכל מכשיר · למטרות לימוד בלבד",
    featuresH: "כל חדר המסחר שלך, במסך אחד",
    features: [
      { icon: "chart" as IconName, t: "ניתוח גרף עם AI", b: "מעלים תמונה של כל גרף, ו-StockAI קורא נרות, תבניות, מומנטום ואינדיקטורים — ומחזיר המלצה ברורה: קנייה, מכירה או החזקה, עם ציון ביטחון." },
      { icon: "market" as IconName, t: "נתוני שוק חיים", b: "טיקר בזמן אמת עם רשימת המעקב שלך והמניות הגדולות, וחדשות טריות שנכנסות לכל ניתוח — כדי שהתמונה תהיה של עכשיו, לא של אתמול." },
      { icon: "shield" as IconName, t: "ניהול סיכונים חכם", b: "לכל המלצה מצורפים סטופ-לוס ויעדי רווח מדורגים, מותאמים לסגנון שלך — שמרני, מאוזן או אגרסיבי." },
      { icon: "dashboard" as IconName, t: "חדר שליטה אמיתי", b: "רשימת מעקב, יומן מסחר, גרפי ביצועים ולוח פקודות מהיר (⌘K) — הכול בממשק ניאון של רצפת מסחר, בעברית או באנגלית." },
    ],
    stepsH: "מצילום מסך לתוכנית פעולה — בשלושה צעדים",
    steps: [
      { n: "01", t: "מעלים", b: "מדביקים או גוררים צילום מסך של הגרף שמעניין אתכם." },
      { n: "02", t: "מנתחים", b: "StockAI מושך מחיר וחדשות בזמן אמת ומריץ ניתוח טכני לעומק." },
      { n: "03", t: "מבצעים", b: "מקבלים תוכנית ברורה — כיוון, רמות וסיכון — מוכנה ליומן המסחר." },
    ],
    bandH: "חדר המסחר החכם שלך נמצא במרחק גרף אחד.",
    bandCta: "פותחים חשבון חינם", bandOpen: "כניסה לטרמינל",
    disclaimer: "המידע באתר מיועד ללימוד בלבד ואינו מהווה ייעוץ או המלצה להשקעה. כל החלטת מסחר היא באחריותכם — בצעו בדיקה עצמאית.",
    terms: "תנאי שימוש", privacy: "מדיניות פרטיות",
  },
};

export default function Landing() {
  const { isSignedIn } = useAuth();
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    setLang(getSettings().language);
  }, []);

  const toggleLang = () => {
    const next: Language = lang === "en" ? "he" : "en";
    setLang(next);
    saveSettings({ ...getSettings(), language: next });
  };

  const t = COPY[lang];
  const isHe = lang === "he";

  return (
    <div className="landing" dir={isHe ? "rtl" : "ltr"}>
      <div className="landing-grid" />

      {/* NAV */}
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-logo">◈</span>
          <span>STOCK<span className="accent">AI</span></span>
          <span className="lp-brand-sub">// TERMINAL</span>
        </div>
        <nav className="lp-nav-actions">
          <button className="lp-lang" onClick={toggleLang} title="Language">
            <Icon name="globe" size={15} /> {isHe ? "EN" : "עב"}
          </button>
          {isSignedIn ? (
            <Link href="/app" className="btn-primary lp-nav-cta">
              <Icon name="analyze" size={16} /> {t.openTerminal}
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="lp-ghost">{t.signIn}</Link>
              <Link href="/sign-up" className="btn-primary lp-nav-cta">{t.getStarted}</Link>
            </>
          )}
        </nav>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-eyebrow"><span className="live-dot" /> {t.eyebrow}</div>
        <h1 className="lp-title">
          {t.titleA}<br />{t.titleB} <span className="accent">{t.titleAccent}</span>
        </h1>
        <p className="lp-sub">{t.sub}</p>

        <div className="lp-cta-row">
          {isSignedIn ? (
            <Link href="/app" className="btn-primary lp-cta-lg">
              <Icon name="analyze" size={18} /> {t.launch}
            </Link>
          ) : (
            <>
              <Link href="/sign-up" className="btn-primary lp-cta-lg">
                <Icon name="rocket" size={18} /> {t.ctaFree}
              </Link>
              <Link href="/sign-in" className="lp-ghost lp-ghost-lg">{t.signIn}</Link>
            </>
          )}
        </div>
        <p className="lp-micro">{t.micro}</p>

        <div className="lp-ticker" dir="ltr">
          {TICKS.concat(TICKS).map((tk, i) => (
            <span className="lp-tick" key={i}>
              <span className="lp-tick-sym">{tk.s}</span>
              <span className={tk.up ? "positive" : "negative"}>{tk.up ? "▲" : "▼"} {tk.c}</span>
            </span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section">
        <h2 className="lp-h2">{t.featuresH}</h2>
        <div className="lp-features">
          {t.features.map((f) => (
            <div className="lp-feature" key={f.t}>
              <div className="lp-feature-icon"><Icon name={f.icon} size={22} /></div>
              <h3>{f.t}</h3>
              <p>{f.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section">
        <h2 className="lp-h2">{t.stepsH}</h2>
        <div className="lp-steps">
          {t.steps.map((s) => (
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
        <h2>{t.bandH}</h2>
        {isSignedIn ? (
          <Link href="/app" className="btn-primary lp-cta-lg">
            <Icon name="analyze" size={18} /> {t.bandOpen}
          </Link>
        ) : (
          <Link href="/sign-up" className="btn-primary lp-cta-lg">
            <Icon name="rocket" size={18} /> {t.bandCta}
          </Link>
        )}
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-brand">
          <span className="lp-brand-logo">◈</span>
          <span>STOCK<span className="accent">AI</span></span>
        </div>
        <p className="lp-disclaimer">{t.disclaimer}</p>
        <div className="lp-footer-links">
          <Link href={`/terms?lang=${lang}`}>{t.terms}</Link>
          <Link href={`/privacy?lang=${lang}`}>{t.privacy}</Link>
          <Link href="/sign-in">{t.signIn}</Link>
          <Link href="/sign-up">{t.getStarted}</Link>
        </div>
        <p className="lp-copyright">© {new Date().getFullYear()} StockAI · {isHe ? "כל הזכויות שמורות" : "All rights reserved"}</p>
      </footer>
    </div>
  );
}
