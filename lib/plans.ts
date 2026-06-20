export type PlanId = 'starter' | 'trader' | 'pro' | 'elite';

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // USD / month
  // -1 = unlimited
  limits: { analyses: number; watchlist: number; history: number };
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 9.99, limits: { analyses: 20, watchlist: 5, history: 30 } },
  { id: 'trader', name: 'Trader', price: 29.99, limits: { analyses: 100, watchlist: 25, history: 150 }, highlight: true },
  { id: 'pro', name: 'Pro', price: 69.99, limits: { analyses: 400, watchlist: 100, history: 500 } },
  { id: 'elite', name: 'Elite', price: 149.99, limits: { analyses: -1, watchlist: -1, history: -1 } },
];

export const getPlanById = (id: string): Plan => PLANS.find(p => p.id === id) || PLANS[0];
export const HISTORY_HARD_CAP = 1000; // safety cap for "unlimited" history
export const TRIAL_DAYS = 7;          // first week free, full access
