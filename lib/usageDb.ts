import { Redis } from '@upstash/redis';
import { getPlanById, PLANS, PlanId } from './plans';

// Server-side source of truth for plan + monthly analysis usage, keyed by Clerk userId.
// Gracefully no-ops when Upstash isn't configured yet (the app keeps working on the
// client-side localStorage limits until you provision the DB).

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const dbConfigured = (): boolean => !!redis;

const month = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const planKey = (u: string) => `plan:${u}`;
const useKey = (u: string) => `use:${u}:${month()}`;

export interface Account { plan: PlanId; analyses: number; limit: number; }

export async function getAccount(userId: string): Promise<Account | null> {
  if (!redis) return null;
  const [plan, count] = await Promise.all([
    redis.get<PlanId>(planKey(userId)),
    redis.get<number>(useKey(userId)),
  ]);
  const p = getPlanById(plan || 'starter');
  return { plan: p.id, analyses: Number(count) || 0, limit: p.limits.analyses };
}

export async function setAccountPlan(userId: string, planId: PlanId): Promise<boolean> {
  if (!redis) return false;
  if (!PLANS.some((p) => p.id === planId)) return false;
  await redis.set(planKey(userId), planId);
  return true;
}

export async function canAnalyze(userId: string): Promise<boolean> {
  if (!redis) return true; // no DB → don't block here (client-side limits still apply)
  const acct = await getAccount(userId);
  if (!acct) return true;
  return acct.limit === -1 || acct.analyses < acct.limit;
}

/** Atomically counts one analysis for the user's current month. Returns the new total. */
export async function recordAnalysis(userId: string): Promise<number> {
  if (!redis) return 0;
  const key = useKey(userId);
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60 * 60 * 24 * 40); // auto-clears ~40 days later
  return n;
}
