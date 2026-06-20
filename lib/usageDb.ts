import { Redis } from '@upstash/redis';
import { getPlanById, PLANS, PlanId, TRIAL_DAYS } from './plans';

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
const trialKey = (u: string) => `trial:${u}`;

export interface Account { plan: PlanId; analyses: number; limit: number; trialActive: boolean; trialDaysLeft: number; }

/** Returns the trial start (ms), creating it on first contact (trial starts on first use). */
async function ensureTrialStart(userId: string): Promise<number> {
  if (!redis) return Date.now();
  let start = await redis.get<string>(trialKey(userId));
  if (!start) { start = new Date().toISOString(); await redis.set(trialKey(userId), start); }
  return new Date(start).getTime();
}

export async function getAccount(userId: string): Promise<Account | null> {
  if (!redis) return null;
  const [plan, count, start] = await Promise.all([
    redis.get<PlanId>(planKey(userId)),
    redis.get<number>(useKey(userId)),
    ensureTrialStart(userId),
  ]);
  const p = getPlanById(plan || 'starter');
  const msLeft = start + TRIAL_DAYS * 86400000 - Date.now();
  return {
    plan: p.id,
    analyses: Number(count) || 0,
    limit: p.limits.analyses,
    trialActive: msLeft > 0,
    trialDaysLeft: Math.max(0, Math.ceil(msLeft / 86400000)),
  };
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
  if (acct.trialActive) return true; // first week = full access
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
