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
  { id: 'starter', name: 'Starter', price: 4.99, limits: { analyses: 5, watchlist: 3, history: 10 } },
  { id: 'trader', name: 'Trader', price: 14.99, limits: { analyses: 40, watchlist: 15, history: 50 }, highlight: true },
  { id: 'pro', name: 'Pro', price: 39.99, limits: { analyses: 150, watchlist: 50, history: 200 } },
  { id: 'elite', name: 'Elite', price: 99.99, limits: { analyses: -1, watchlist: -1, history: -1 } },
];

export const getPlanById = (id: string): Plan => PLANS.find(p => p.id === id) || PLANS[0];
export const HISTORY_HARD_CAP = 500; // safety cap for "unlimited" history
