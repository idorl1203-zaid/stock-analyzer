import { AnalysisRecord, JournalEntry, AppSettings, Theme, WatchlistItem } from './types';
import { deleteChartImage, clearChartImages } from './imageStore';

const ANALYSIS_KEY = 'stockai_analyses';
const JOURNAL_KEY = 'stockai_journal';
const SETTINGS_KEY = 'stockai_settings';
const WATCHLIST_KEY = 'stockai_watchlist';

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
  const trimmed = analyses.slice(0, 50);

  // First attempt: full save
  if (safeSet(ANALYSIS_KEY, trimmed)) return true;

  // Storage full — drop image data entirely (a truncated base64 renders as a broken image)
  console.warn('[Storage] Quota hit. Retrying without image data...');
  const stripped = trimmed.map(a => ({ ...a, imageBase64: '' }));
  return safeSet(ANALYSIS_KEY, stripped);
}

export function deleteAnalysis(id: string): void {
  const analyses = getAnalyses().filter(a => a.id !== id);
  safeSet(ANALYSIS_KEY, analyses);
  deleteChartImage(id); // remove the high-res image from IndexedDB
}

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
  return safeSet(JOURNAL_KEY, entries);
}

export function deleteJournalEntry(id: string): void {
  const entries = getJournalEntries().filter(e => e.id !== id);
  safeSet(JOURNAL_KEY, entries);
}

// ─── Settings ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = { language: 'en', riskProfile: 'balanced', theme: 'dark-purple' };

export function getSettings(): AppSettings {
  const saved = safeGet<Partial<AppSettings>>(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: AppSettings): void {
  safeSet(SETTINGS_KEY, settings);
}

export function saveTheme(theme: Theme): void {
  const settings = getSettings();
  settings.theme = theme;
  saveSettings(settings);
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
  return safeSet(WATCHLIST_KEY, list);
}

export function deleteWatchlistItem(id: string): void {
  const list = getWatchlist().filter(w => w.id !== id);
  safeSet(WATCHLIST_KEY, list);
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
