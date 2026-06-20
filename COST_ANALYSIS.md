# StockAI — Subscription Pricing vs. API Cost Model

_Working estimates. Refine with real usage data (see “How to refine” below)._

## 1. Cost of a single analysis

Each "Analyze" runs these external calls:

| Service | Role | Calls / analysis | Cost / analysis |
|---|---|---|---|
| **Gemini 2.5 Pro** (+ thinking) | the AI analysis | 1 | **$0.05 – 0.12** |
| Twelve Data | OHLCV for indicators | 2–3 credits | ~$0 (free tier: 800/day ≈ 8,000 analyses/mo) |
| Brave Search | news | 1 | ~$0.004 (free tier: 2,000/mo) |
| Yahoo / Nasdaq | live price | 1 | $0 |

**Gemini dominates.** Central working estimate: **≈ $0.08 per analysis** (≈3.5k input tokens @ $1.25/M + ≈5k output/thinking tokens @ $10/M).

Fixed monthly costs (independent of volume, at MVP scale):
- Vercel: $0 (Hobby) or ~$20 (Pro, if you need longer functions / more traffic)
- Twelve Data / Brave / Clerk: **$0** within free tiers

## 2. Per-plan economics (worst case = user maxes out the quota)

| Plan | Price | Analyses/mo | API cost @ $0.08 | Gross margin | Margin % |
|---|---|---|---|---|---|
| **Starter** | $9.99 | 20 | $1.60 | **$8.39** | 84% |
| **Trader** | $29.99 | 100 | $8.00 | **$21.99** | 73% |
| **Pro** | $69.99 | 400 | $32.00 | **$37.99** | 54% |
| **Elite** | $149.99 | ~1,500 (fair-use) | $120.00 | **$29.99** | 20% |

**Break-even usage** (price ÷ $0.08) — a user only costs you money if they exceed:
- Starter 125 · Trader 375 · Pro 875 · Elite 1,875 analyses/mo.

The quotas (20 / 100 / 400) keep Starter–Pro comfortably profitable no matter what.
Elite has no hard cap → keep a **fair-use cap (~1,500/mo)** so one power user can't run it negative.

### Free trial (first 7 days, full access)
The trial grants unlimited access for a week — a customer-acquisition cost, not a margin:
- Typical trial user runs ~20–60 analyses → **CAC ≈ $1.60–$4.80**.
- A heavy trial user could run hundreds. If that's a concern, add a **soft trial cap** (e.g., full access but ≤ 50 analyses) to bound CAC at ~$4.

> Reality check: most users use a **fraction** of their quota, so real margins are **higher** than the table (which assumes 100% utilization).

## 3. Sensitivity (if Gemini is pricier than estimated)

| Gemini cost/analysis | Pro plan cost (150) | Pro margin |
|---|---|---|
| $0.05 | $7.50 | $32.49 (81%) |
| $0.08 | $12.00 | $27.99 (70%) |
| $0.12 | $18.00 | $21.99 (55%) |

All tiers stay healthily profitable even at the high end.

## 4. Levers to widen margins
- **Flash on lower tiers**: use `gemini-2.5-flash` for Starter (~$0.01/analysis → ~99% margin); reserve Pro model for Trader+.
- Cap/trim the thinking budget for cheaper tiers.
- Twelve Data + Brave free tiers cover the MVP — only upgrade when volume demands.

## 5. How to refine with real numbers
Gemini returns `usageMetadata` (promptTokenCount, candidatesTokenCount, thoughtsTokenCount) on every call. Log it in `app/api/analyze/route.ts` for a week, average it, and plug the real token counts × Google's current per-token price into the table above for exact figures.
