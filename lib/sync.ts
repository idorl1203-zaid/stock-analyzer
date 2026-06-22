import { AnalysisRecord, JournalEntry, WatchlistItem, Portfolio } from './types';
import {
  getAnalyses, getJournalEntries, getWatchlist, getPortfolio,
  setAnalysesLocal, setJournalLocal, setWatchlistLocal, setPortfolioLocal,
  type SyncCollection,
} from './storage';

// Cross-device sync against /api/data (Upstash, keyed by Clerk userId).
// The chart images (thumbnail + high-res) stay device-local — only the analysis
// data travels, so the payload stays small and the user's history/journal/portfolio
// follow them between the desktop and the phone.

const PUSH_CAP = 80; // most-recent analyses kept server-side

/** Build the value to store server-side for a collection (images stripped from analyses). */
function serialize(collection: SyncCollection): unknown {
  switch (collection) {
    case 'analyses':
      return getAnalyses().slice(0, PUSH_CAP).map(a => ({ ...a, imageBase64: '' }));
    case 'journal': return getJournalEntries();
    case 'watchlist': return getWatchlist();
    case 'portfolio': return getPortfolio();
  }
}

export async function pushCollection(collection: SyncCollection): Promise<void> {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, value: serialize(collection) }),
      keepalive: true,
    });
  } catch { /* offline / unauthenticated — local copy still stands */ }
}

/**
 * Pulls server data on sign-in and reconciles it with the local copy.
 * Server is the source of truth; for analyses we keep any local chart thumbnails
 * (matched by id) so the device that created them keeps its sharp previews.
 * Collections the server has never seen are seeded from local.
 * Returns true if anything local changed (so the UI can refresh).
 */
export async function pullUserData(): Promise<boolean> {
  let res: Response;
  try { res = await fetch('/api/data'); } catch { return false; }
  if (!res.ok) return false;
  const json = await res.json().catch(() => null);
  if (!json?.configured || !json.data) return false;
  const data = json.data as Record<SyncCollection, unknown>;
  let changed = false;

  // analyses — merge server records with local thumbnails
  if (Array.isArray(data.analyses)) {
    const local = getAnalyses();
    const imgById = new Map(local.map(a => [a.id, a.imageBase64]));
    const merged = (data.analyses as AnalysisRecord[]).map(a => ({
      ...a,
      imageBase64: imgById.get(a.id) || a.imageBase64 || '',
    }));
    setAnalysesLocal(merged);
    changed = true;
  } else if (data.analyses === null && getAnalyses().length) {
    void pushCollection('analyses');
  }

  if (Array.isArray(data.journal)) {
    setJournalLocal(data.journal as JournalEntry[]); changed = true;
  } else if (data.journal === null && getJournalEntries().length) {
    void pushCollection('journal');
  }

  if (Array.isArray(data.watchlist)) {
    setWatchlistLocal(data.watchlist as WatchlistItem[]); changed = true;
  } else if (data.watchlist === null && getWatchlist().length) {
    void pushCollection('watchlist');
  }

  if (data.portfolio && typeof data.portfolio === 'object') {
    setPortfolioLocal(data.portfolio as Portfolio); changed = true;
  } else if (data.portfolio === null) {
    const p = getPortfolio();
    if (p.positions.length || p.trades.length || p.cash !== p.startingCash) void pushCollection('portfolio');
  }

  return changed;
}
