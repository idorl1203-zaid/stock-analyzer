import { Redis } from '@upstash/redis';

// Server-side per-user store for the user's own data (analyses, journal, watchlist,
// portfolio) so it follows them across devices. Keyed by Clerk userId. Each collection
// is a single JSON value. Gracefully no-ops when Upstash isn't configured.

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const userDataConfigured = (): boolean => !!redis;

export const SYNC_COLLECTIONS = ['analyses', 'journal', 'watchlist', 'portfolio'] as const;
export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

const key = (userId: string, c: SyncCollection) => `udata:${userId}:${c}`;
// ~40 days TTL, refreshed on every write — keeps abandoned accounts from lingering.
const TTL = 60 * 60 * 24 * 90;

export async function getAllUserData(userId: string): Promise<Record<SyncCollection, unknown> | null> {
  if (!redis) return null;
  const vals = await Promise.all(SYNC_COLLECTIONS.map(c => redis.get(key(userId, c))));
  const out = {} as Record<SyncCollection, unknown>;
  SYNC_COLLECTIONS.forEach((c, i) => { out[c] = vals[i] ?? null; });
  return out;
}

export async function setUserData(userId: string, collection: SyncCollection, value: unknown): Promise<boolean> {
  if (!redis) return false;
  if (!SYNC_COLLECTIONS.includes(collection)) return false;
  await redis.set(key(userId, collection), value, { ex: TTL });
  return true;
}
