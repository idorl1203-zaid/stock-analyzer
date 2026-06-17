'use client';
import { useEffect, useState } from 'react';
import { Language } from '@/lib/types';

interface Props {
  language: Language;
  onDone: () => void;
}

const LINES_EN = [
  'INITIALIZING STOCKAI TERMINAL',
  'ESTABLISHING SECURE MARKET FEED',
  'LOADING NEURAL ENGINE // GEMINI 2.5',
  'CALIBRATING NEON GRID',
  'SYNCING WATCHLIST CHANNELS',
  'ACCESS GRANTED',
];
const LINES_HE = [
  'מאתחל טרמינל STOCKAI',
  'מקים ערוץ שוק מאובטח',
  'טוען מנוע נוירוני // GEMINI 2.5',
  'מכייל רשת ניאון',
  'מסנכרן ערוצי מעקב',
  'הגישה אושרה',
];

export default function BootSequence({ language, onDone }: Props) {
  const lines = language === 'he' ? LINES_HE : LINES_EN;
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 230 * (i + 1)));
    });
    timers.push(setTimeout(() => setClosing(true), 230 * lines.length + 480));
    timers.push(setTimeout(() => onDone(), 230 * lines.length + 980));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.round((step / lines.length) * 100);

  return (
    <div className={`boot-overlay ${closing ? 'boot-closing' : ''}`} dir="ltr">
      <div className="boot-scanlines" />
      <div className="boot-inner">
        <div className="boot-logo">◈ STOCK<span className="accent">AI</span> <span className="boot-logo-sub">// TERMINAL</span></div>
        <div className="boot-log">
          {lines.slice(0, step).map((l, i) => (
            <div className="boot-line" key={i}>
              <span className="boot-caret">▸</span> {l}
              <span className="boot-ok">{i === lines.length - 1 ? '■' : 'OK'}</span>
            </div>
          ))}
          {step < lines.length && (
            <div className="boot-line boot-line-active">
              <span className="boot-caret">▸</span> {lines[step]}<span className="boot-blink">_</span>
            </div>
          )}
        </div>
        <div className="boot-bar"><div className="boot-bar-fill" style={{ width: `${pct}%` }} /></div>
        <div className="boot-pct">{pct}%</div>
      </div>
    </div>
  );
}
