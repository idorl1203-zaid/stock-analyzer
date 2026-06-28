export type PlanId = 'starter' | 'trader' | 'pro' | 'elite';

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // USD / month
  // -1 = unlimited
  limits: { analyses: number; watchlist: number; history: number };
  highlight?: boolean;
}

// Analyses are the only real cost driver (~$0.10 each on Sonnet 4.6), so quotas
// are tuned for a healthy margin (60-80%). Watchlist & history cost ~nothing →
// kept generous (unlimited on Trader+). Prices unchanged.
export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 9.99, limits: { analyses: 20, watchlist: 50, history: 200 } },
  { id: 'trader', name: 'Trader', price: 29.99, limits: { analyses: 70, watchlist: -1, history: -1 }, highlight: true },
  { id: 'pro', name: 'Pro', price: 69.99, limits: { analyses: 250, watchlist: -1, history: -1 } },
  { id: 'elite', name: 'Elite', price: 149.99, limits: { analyses: 600, watchlist: -1, history: -1 } },
];

export const getPlanById = (id: string): Plan => PLANS.find(p => p.id === id) || PLANS[0];
export const HISTORY_HARD_CAP = 1000; // safety cap for "unlimited" history
export const TRIAL_DAYS = 7;          // first week free, full access
