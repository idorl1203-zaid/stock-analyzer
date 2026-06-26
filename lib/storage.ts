import { AnalysisRecord, JournalEntry, AppSettings, Theme, WatchlistItem, Portfolio, PaperPosition, CloseReason, Recommendation } from './types';
import { deleteChartImage, clearChartImages } from './imageStore';
import { getPlanById, HISTORY_HARD_CAP, PlanId, TRIAL_DAYS } from './plans';

const ANALYSIS_KEY = 'stockai_analyses';
const JOURNAL_KEY = 'stockai_journal';
const SETTINGS_KEY = 'stockai_settings';
const WATCHLIST_KEY = 'stockai_watchlist';
const PORTFOLIO_KEY = 'stockai_portfolio';
const PLAN_KEY = 'stockai_plan';
const USAGE_KEY = 'stockai_usage';
const TRIAL_KEY = 'stockai_trial';
const STARTING_CASH = 100000;

// ─── Safe localStorage helpers ───────────────────────────────────────────────

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ─── Cross-device sync hook ────────────────────────────────────────────────
// Each mutating save flags the affected collection as "dirty"; SyncManager
// listens for this and pushes it to the server (Upstash, keyed by Clerk userId).
export type SyncCollection = 'analyses' | 'journal' | 'watchlist' | 'portfolio';
function markDirty(collection: SyncCollection): void {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent('stockai-dirty', { detail: { collection } })); } catch { /* ignore */ }
}

function safeSet(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    // QuotaExceededError or other storage errors
    console.error(`[Storage] Failed to save "${key}":`, err);
    // Dispatch a custom event so the UI can show a toast
    try {
      window.dispatchEvent(new CustomEvent('storage-error', {
        detail: { key, error: err instanceof Error ? err.message : String(err) }
      }));
    } catch { /* ignore */ }
    return false;
  }
}

// ─── Analyses ────────────────────────────────────────────────────────────────

export function getAnalyses(): AnalysisRecord[] {
  return safeGet<AnalysisRecord[]>(ANALYSIS_KEY, []);
}

export function saveAnalysis(record: AnalysisRecord): boolean {
  const analyses = getAnalyses();
  analyses.unshift(record);
  const histLimit = getPlanById(getPlanId()).limits.history;
  const cap = histLimit === -1 ? HISTORY_HARD_CAP : histLimit;
  const trimmed = analyses.slice(0, cap);
  // free the IndexedDB images of records that fall outside the plan's history depth
  analyses.slice(cap).forEach(a => deleteChartImage(a.id));

  // First attempt: full save
  if (safeSet(ANALYSIS_KEY, trimmed)) { markDirty('analyses'); return true; }

  // Storage full — drop image data entirely (a truncated base64 renders as a broken image)
  console.warn('[Storage] Quota hit. Retrying without image data...');
  const stripped = trimmed.map(a => ({ ...a, imageBase64: '' }));
  const ok = safeSet(ANALYSIS_KEY, stripped);
  if (ok) markDirty('analyses');
  return ok;
}

export function deleteAnalysis(id: string): void {
  const analyses = getAnalyses().filter(a => a.id !== id);
  safeSet(ANALYSIS_KEY, analyses);
  deleteChartImage(id); // remove the high-res image from IndexedDB
  markDirty('analyses');
}

/** Overwrite the local analyses list without flagging it dirty (used by sync pull). */
export function setAnalysesLocal(list: AnalysisRecord[]): void { safeSet(ANALYSIS_KEY, list); }

/**
 * One-time migration: strips oversized base64 images from existing stored analyses.
 * Runs once per browser session (keyed by a flag in sessionStorage).
 * Safe to call multiple times — idempotent.
 */
export function migrateStorageIfNeeded(): void {
  if (typeof window === 'undefined') return;
  const FLAG = 'stockai_migrated_v2';
  try {
    if (sessionStorage.getItem(FLAG)) return; // already ran this session
    sessionStorage.setItem(FLAG, '1');

    const analyses = getAnalyses();
    if (analyses.length === 0) return;

    // Max ~30KB per thumbnail (base64 chars: 30000 * 0.75 ≈ 22KB image)
    const MAX_B64_CHARS = 40000;
    const needsMigration = analyses.some(a => (a.imageBase64?.length || 0) > MAX_B64_CHARS);
    if (!needsMigration) return;

    console.info('[Storage] Migrating oversized images...');
    const migrated = analyses.map(a => ({
      ...a,
      // Drop oversized images rather than truncating (a partial base64 is a broken image)
      imageBase64: (a.imageBase64?.length || 0) > MAX_B64_CHARS ? '' : a.imageBase64,
    }));
    safeSet(ANALYSIS_KEY, migrated);
    console.info(`[Storage] Migration done. ${analyses.length} records processed.`);
  } catch (e) {
    console.warn('[Storage] Migration failed:', e);
  }
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export function getJournalEntries(): JournalEntry[] {
  return safeGet<JournalEntry[]>(JOURNAL_KEY, []);
}

export function saveJournalEntry(entry: JournalEntry): boolean {
  const entries = getJournalEntries();
  const existing = entries.findIndex(e => e.id === entry.id);
  if (existing >= 0) {
    entries[existing] = entry;
  } else {
    entries.unshift(entry);
  }
  const ok = safeSet(JOURNAL_KEY, entries);
  if (ok) markDirty('journal');
  return ok;
}

export function deleteJournalEntry(id: string): void {
  const entries = getJournalEntries().filter(e => e.id !== id);
  safeSet(JOURNAL_KEY, entries);
  markDirty('journal');
}

/** Overwrite the local journal without flagging it dirty (used by sync pull). */
export function setJournalLocal(entries: JournalEntry[]): void { safeSet(JOURNAL_KEY, entries); }

// ─── Settings ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = { language: 'en', riskProfile: 'balanced', theme: 'dark' };

export function getSettings(): AppSettings {
  const saved = safeGet<Partial<AppSettings>>(SETTINGS_KEY, {});
  const merged = { ...DEFAULT_SETTINGS, ...saved };
  // Coerce any legacy theme id (dark-purple/dark-blue/…) to the current set.
  if (merged.theme !== 'dark' && merged.theme !== 'light') merged.theme = 'dark';
  return merged;
}

export function saveSettings(settings: AppSettings): void {
  safeSet(SETTINGS_KEY, settings);
}

export function saveTheme(theme: Theme): void {
  const settings = getSettings();
  settings.theme = theme;
  saveSettings(settings);
}

// ─── Subscription plan + monthly usage ────────────────────────────────────────

export function getPlanId(): PlanId {
  return safeGet<PlanId>(PLAN_KEY, 'starter');
}

export function setPlanId(id: PlanId): void {
  safeSet(PLAN_KEY, id);
}

/** Usage for the current calendar month (auto-resets when the month rolls over). */
export function getUsage(): { month: string; analyses: number } {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const u = safeGet<{ month: string; analyses: number }>(USAGE_KEY, { month, analyses: 0 });
  return u.month === month ? u : { month, analyses: 0 };
}

export function incrementAnalysisUsage(): void {
  const u = getUsage();
  safeSet(USAGE_KEY, { month: u.month, analyses: u.analyses + 1 });
}

/** Free trial (first week, full access) — starts on first use; tracked locally as a fallback. */
export function getTrial(): { active: boolean; daysLeft: number } {
  let start = safeGet<number>(TRIAL_KEY, 0);
  if (!start) { start = Date.now(); safeSet(TRIAL_KEY, start); }
  const msLeft = start + TRIAL_DAYS * 86400000 - Date.now();
  return { active: msLeft > 0, daysLeft: Math.max(0, Math.ceil(msLeft / 86400000)) };
}

/** Returns true if the current plan still allows another analysis this month. */
export function canRunAnalysis(): boolean {
  if (getTrial().active) return true; // first week = full access
  const limit = getPlanById(getPlanId()).limits.analyses;
  if (limit === -1) return true;
  return getUsage().analyses < limit;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export function getWatchlist(): WatchlistItem[] {
  return safeGet<WatchlistItem[]>(WATCHLIST_KEY, []);
}

export function saveWatchlistItem(item: WatchlistItem): boolean {
  const list = getWatchlist();
  const existing = list.findIndex(w => w.id === item.id);
  if (existing >= 0) {
    list[existing] = item;
  } else {
    list.push(item);
  }
  const ok = safeSet(WATCHLIST_KEY, list);
  if (ok) markDirty('watchlist');
  return ok;
}

export function deleteWatchlistItem(id: string): void {
  const list = getWatchlist().filter(w => w.id !== id);
  safeSet(WATCHLIST_KEY, list);
  markDirty('watchlist');
}

/** Overwrite the local watchlist without flagging it dirty (used by sync pull). */
export function setWatchlistLocal(list: WatchlistItem[]): void { safeSet(WATCHLIST_KEY, list); }

// ─── Paper trading portfolio ───────────────────────────────────────────────────

export function getPortfolio(): Portfolio {
  return safeGet<Portfolio>(PORTFOLIO_KEY, { cash: STARTING_CASH, startingCash: STARTING_CASH, positions: [], trades: [] });
}

export function savePortfolio(p: Portfolio): boolean {
  const ok = safeSet(PORTFOLIO_KEY, p);
  if (ok) markDirty('portfolio');
  return ok;
}

/** Overwrite the local portfolio without flagging it dirty (used by sync pull). */
export function setPortfolioLocal(p: Portfolio): void { safeSet(PORTFOLIO_KEY, p); }

/** Opens a paper position. Returns false if not enough virtual cash. */
export function openPosition(pos: PaperPosition): boolean {
  const p = getPortfolio();
  const cost = pos.entryPrice * pos.qty;
  if (cost > p.cash || pos.qty <= 0 || !isFinite(cost)) return false;
  p.cash -= cost;
  p.positions.unshift(pos);
  const ok = savePortfolio(p);
  if (ok) logPositionToJournal(pos); // every opened position is mirrored in the trading journal
  return ok;
}

/** Creates/updates the journal entry that mirrors a paper position (id: `pos-<positionId>`). */
function logPositionToJournal(pos: PaperPosition): void {
  const rec = (pos.recommendation || (pos.side === 'long' ? 'BUY' : 'SELL')) as Recommendation;
  saveJournalEntry({
    id: `pos-${pos.id}`,
    timestamp: pos.openedAt || Date.now(),
    stockName: pos.name || pos.symbol,
    stockSymbol: pos.symbol,
    analysisId: pos.analysisId,
    status: 'active',
    entryPrice: pos.entryPrice,
    notes: `${pos.side === 'long' ? 'LONG' : 'SHORT'} · ${pos.qty.toFixed(3)} × ${pos.symbol} @ $${pos.entryPrice.toFixed(2)} (paper)`,
    recommendation: rec,
    stopLoss: pos.stopLoss != null ? String(pos.stopLoss) : undefined,
    takeProfit: pos.takeProfit != null ? String(pos.takeProfit) : undefined,
  });
}

/** Closes a position at exitPrice, realising P&L back into cash. */
export function closePosition(id: string, exitPrice: number, reason: CloseReason = 'manual'): boolean {
  const p = getPortfolio();
  const i = p.positions.findIndex(x => x.id === id);
  if (i < 0) return false;
  const pos = p.positions[i];
  const pnl = (pos.side === 'long' ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice)) * pos.qty;
  const pnlPercent = pos.entryPrice ? (pnl / (pos.entryPrice * pos.qty)) * 100 : 0;
  p.cash += pos.entryPrice * pos.qty + pnl; // return committed capital + P&L
  p.positions.splice(i, 1);
  p.trades.unshift({ ...pos, exitPrice, closedAt: Date.now(), pnl, pnlPercent, closeReason: reason });
  p.trades = p.trades.slice(0, 200);
  const ok = savePortfolio(p);
  if (ok) {
    // keep the mirrored journal entry in sync — mark it closed with the realised result
    const entry = getJournalEntries().find(e => e.id === `pos-${id}`);
    if (entry) saveJournalEntry({ ...entry, status: 'closed', exitPrice, pnl, pnlPercent });
  }
  return ok;
}

export function updatePosition(id: string, fields: Partial<Pick<PaperPosition, 'stopLoss' | 'takeProfit'>>): boolean {
  const p = getPortfolio();
  const pos = p.positions.find(x => x.id === id);
  if (!pos) return false;
  if ('stopLoss' in fields) pos.stopLoss = fields.stopLoss;
  if ('takeProfit' in fields) pos.takeProfit = fields.takeProfit;
  return savePortfolio(p);
}

export function resetPortfolio(): void {
  savePortfolio({ cash: STARTING_CASH, startingCash: STARTING_CASH, positions: [], trades: [] });
}

// ─── Storage stats ───────────────────────────────────────────────────────────

export function getStorageStats(): { usedKB: number; analysesCount: number; journalCount: number } {
  if (typeof window === 'undefined') return { usedKB: 0, analysesCount: 0, journalCount: 0 };
  try {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (key.startsWith('stockai_')) {
        totalBytes += (localStorage.getItem(key) || '').length * 2;
      }
    }
    return {
      usedKB: Math.round(totalBytes / 1024),
      analysesCount: getAnalyses().length,
      journalCount: getJournalEntries().length,
    };
  } catch {
    return { usedKB: 0, analysesCount: 0, journalCount: 0 };
  }
}

// ─── Clear all data ──────────────────────────────────────────────────────────

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  try {
    [ANALYSIS_KEY, JOURNAL_KEY, WATCHLIST_KEY].forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
  clearChartImages();
}

// ─── Shared ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
