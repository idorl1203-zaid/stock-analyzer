'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSettings, saveSettings } from '@/lib/storage';
import type { Language } from '@/lib/types';
import Icon from './Icon';

type Bi = { en: string; he: string };
export interface LegalContent {
  title: Bi;
  updated: Bi;
  intro: Bi;
  sections: { heading: Bi; body: Bi[] }[];
}

export default function LegalDoc({ doc }: { doc: LegalContent }) {
  const [lang, setLang] = useState<Language>('en');
  useEffect(() => { setLang(getSettings().language); }, []);
  const isHe = lang === 'he';
  const pick = (o: Bi) => (isHe ? o.he : o.en);
  const toggle = () => {
    const next: Language = isHe ? 'en' : 'he';
    setLang(next);
    saveSettings({ ...getSettings(), language: next });
  };

  return (
    <div className="landing legal" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="landing-grid" />

      <header className="lp-nav">
        <Link href="/" className="lp-brand" style={{ textDecoration: 'none' }}>
          <span className="lp-brand-logo">◈</span>
          <span>STOCK<span className="accent">AI</span></span>
        </Link>
        <div className="lp-nav-actions">
          <button className="lp-lang" onClick={toggle} title="Language">
            <Icon name="globe" size={15} /> {isHe ? 'EN' : 'עב'}
          </button>
          <Link href="/" className="lp-ghost">{isHe ? 'חזרה לדף הבית' : 'Back to home'}</Link>
        </div>
      </header>

      <article className="legal-doc">
        <h1>{pick(doc.title)}</h1>
        <p className="legal-updated">{pick(doc.updated)}</p>
        <p className="legal-intro">{pick(doc.intro)}</p>
        {doc.sections.map((s, i) => (
          <section className="legal-section" key={i}>
            <h2><span className="legal-n">{String(i + 1).padStart(2, '0')}</span>{pick(s.heading)}</h2>
            {s.body.map((b, j) => <p key={j}>{pick(b)}</p>)}
          </section>
        ))}
      </article>

      <footer className="lp-footer">
        <p className="lp-disclaimer">
          {isHe
            ? 'המידע באתר מיועד ללימוד בלבד ואינו מהווה ייעוץ או המלצה להשקעה.'
            : 'For educational purposes only. Not investment advice.'}
        </p>
        <div className="lp-footer-links">
          <Link href="/terms">{isHe ? 'תנאי שימוש' : 'Terms of Service'}</Link>
          <Link href="/privacy">{isHe ? 'מדיניות פרטיות' : 'Privacy Policy'}</Link>
          <Link href="/">{isHe ? 'דף הבית' : 'Home'}</Link>
        </div>
      </footer>
    </div>
  );
}
