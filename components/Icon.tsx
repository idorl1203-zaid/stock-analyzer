'use client';
import { CSSProperties } from 'react';

// Lightweight Lucide-style icon set (stroke, currentColor) — no runtime deps.
export type IconName =
  | 'dashboard' | 'analyze' | 'watchlist' | 'history' | 'journal'
  | 'palette' | 'refresh' | 'trash' | 'edit' | 'plus' | 'close'
  | 'search' | 'chart' | 'target' | 'news' | 'brain' | 'market'
  | 'patterns' | 'indicators' | 'shield' | 'check' | 'warning'
  | 'rocket' | 'clock' | 'arrow-left' | 'trend-up' | 'pie'
  | 'ruler' | 'bar' | 'bookmark' | 'globe' | 'spark' | 'upload'
  | 'support' | 'resistance' | 'briefcase' | 'crown' | 'lock';

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  analyze: <><path d="M3 3v18h18" /><path d="M7 14l3-4 3 3 4-6" /><circle cx="17" cy="7" r="0.6" fill="currentColor" /></>,
  watchlist: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  history: <><path d="M3 3v6h6" /><path d="M3.5 9a9 9 0 1 1-1 5" /><path d="M12 8v4l3 2" /></>,
  journal: <><path d="M4 4a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2Z" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
  palette: <><circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" stroke="none" /><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a6 6 0 0 0 6-6c0-5-4.5-8.6-10-8.6Z" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v5h-5" /></>,
  trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6M10 11v6M14 11v6" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  close: <><path d="M18 6 6 18M6 6l12 12" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  chart: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="0.5" /><rect x="12" y="7" width="3" height="10" rx="0.5" /><rect x="17" y="13" width="3" height="4" rx="0.5" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></>,
  news: <><path d="M4 4h13a1 1 0 0 1 1 1v14a1 1 0 0 0 1 1 1 1 0 0 0 1-1V8" /><path d="M4 4v15a1 1 0 0 0 1 1h13" /><path d="M8 8h6M8 12h6M8 16h4" /></>,
  brain: <><path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 4 2 3 3 0 0 0 3-1V4a3 3 0 0 0-3-1Z" /><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-4 2 3 3 0 0 1-3-1" /></>,
  market: <><path d="M3 17l5-5 4 3 4-6 5 4" /><path d="M3 21h18" /><path d="M3 4v13" /></>,
  patterns: <><path d="M3 12h4l2-7 4 14 2-5h6" /></>,
  indicators: <><path d="M3 3v18h18" /><path d="M7 16c2-6 4-2 5-5s3 2 5-4" /></>,
  shield: <><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5Z" /><path d="m9 12 2 2 4-4" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  warning: <><path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  rocket: <><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.9.7-2.2-.2-3a2.1 2.1 0 0 0-2.8 0Z" /><path d="M12 15 9 12a14 14 0 0 1 3-8c2-2.5 5-3 8-3 0 3-.5 6-3 8a14 14 0 0 1-5 3Z" /><path d="M9 12H4s.5-2.8 2-4 4-1 4-1M12 15v5s2.8-.5 4-2 1-4 1-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  'arrow-left': <><path d="M19 12H5M12 19l-7-7 7-7" /></>,
  'trend-up': <><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></>,
  pie: <><path d="M12 3v9l7.5 4.5A9 9 0 1 0 12 3Z" /><path d="M21 12a9 9 0 0 0-9-9" /></>,
  ruler: <><rect x="2" y="7" width="20" height="10" rx="1" /><path d="M6 7v3M10 7v5M14 7v3M18 7v5" /></>,
  bar: <><path d="M3 3v18h18" /><rect x="6" y="10" width="3" height="7" /><rect x="11" y="6" width="3" height="11" /><rect x="16" y="13" width="3" height="4" /></>,
  bookmark: <><path d="M5 3h14a1 1 0 0 1 1 1v17l-8-5-8 5V4a1 1 0 0 1 1-1Z" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M12 3v13M7 8l5-5 5 5" /></>,
  support: <><path d="M3 16h18" /><path d="M7 16l3-4 3 2 4-6" /></>,
  resistance: <><path d="M3 8h18" /><path d="M7 8l3 4 3-2 4 6" /></>,
  briefcase: <><rect x="2.5" y="7" width="19" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M2.5 12h19" /></>,
  crown: <><path d="M3 7l4 4 5-7 5 7 4-4-1.5 12H4.5L3 7Z" /><path d="M4.5 19h15" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
};

export default function Icon({ name, size = 18, className, style, strokeWidth = 2 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
