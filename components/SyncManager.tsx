'use client';
import { useEffect } from 'react';
import { pullUserData, pushCollection } from '@/lib/sync';
import type { SyncCollection } from '@/lib/storage';

interface Props {
  /** Called after the initial pull changed local data, so the UI can refresh. */
  onSynced: () => void;
}

/**
 * Headless sync coordinator. On mount it pulls the signed-in user's data from the
 * server and reconciles it with local storage; afterwards it listens for "dirty"
 * events from storage mutations and pushes the affected collection back (debounced).
 */
export default function SyncManager({ onSynced }: Props) {
  useEffect(() => {
    let ready = false;
    let cancelled = false;
    const pending = new Set<SyncCollection>();
    const timers = new Map<SyncCollection, ReturnType<typeof setTimeout>>();

    const onDirty = (e: Event) => {
      const c = (e as CustomEvent).detail?.collection as SyncCollection;
      if (!c) return;
      if (!ready) { pending.add(c); return; }
      clearTimeout(timers.get(c));
      timers.set(c, setTimeout(() => void pushCollection(c), 1500));
    };
    window.addEventListener('stockai-dirty', onDirty);

    pullUserData().then(changed => {
      if (cancelled) return;
      ready = true;
      if (changed) onSynced();
      pending.forEach(c => void pushCollection(c));
      pending.clear();
    });

    return () => {
      cancelled = true;
      window.removeEventListener('stockai-dirty', onDirty);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
