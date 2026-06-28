# StockAI — Subscription Pricing vs. API Cost Model

_Engine: Anthropic Claude (Sonnet 4.6). Working estimates — refine with real usage (see §5)._

## 1. Cost of a single analysis

Each "Analyze" runs these external calls:

| Service | Role | Calls / analysis | Cost / analysis |
|---|---|---|---|
| **Claude Sonnet 4.6** (+ adaptive thinking) | the AI analysis | 1 | **$0.06 – 0.14** |
| Twelve Data | OHLCV for indicators | 2–3 credits | ~$0 (free tier: 800/day ≈ 8,000 analyses/mo) |
| Brave Search | news | 1 | ~$0.004 (free tier: 2,000/mo) |
| Yahoo / Nasdaq | live price | 1 | $0 |

**Claude dominates.** Central working estimate: **≈ $0.10 per analysis**
(≈5k input tokens [prompt + quant context + chart image] @ $3/M + ≈5k output/thinking tokens @ $15/M).
Thinking tokens bill as output. Verified Anthropic pricing (Jun 2026):

| Model | Input $/M | Output $/M | Est. cost/analysis |
|---|---|---|---|
| **Sonnet 4.6** (default) | $3 | $15 | **~$0.10** |
| Haiku 4.5 (fallback) | $1 | $5 | ~$0.03 |
| Opus 4.8 | $5 | $25 | ~$0.15–0.20 |

Fixed monthly costs (independent of volume, at MVP scale):
- Vercel: $0 (Hobby) or ~$20 (Pro, if you need longer functions / more traffic)
- Twelve Data / Brave / Clerk / Upstash: **$0** within free tiers

## 2. Per-plan economics (worst case = user maxes out the quota)

Prices unchanged. Analyses are the only real cost driver, so quotas are tuned for a
healthy margin. Watchlist & history cost ~nothing → kept generous (unlimited on Trader+).

| Plan | Price | Analyses/mo | Watchlist | History | API cost @ $0.10 | Gross margin | Margin % |
|---|---|---|---|---|---|---|---|
| **Starter** | $9.99 | 20 | 50 | 200 | $2.00 | **$7.99** | 80% |
| **Trader** | $29.99 | 70 | ∞ | ∞ | $7.00 | **$22.99** | 77% |
| **Pro** | $69.99 | 250 | ∞ | ∞ | $25.00 | **$44.99** | 64% |
| **Elite** | $149.99 | 600 (fair-use) | ∞ | ∞ | $60.00 | **$89.99** | 60% |

**Break-even usage** (price ÷ $0.10) — a user only costs you money if they exceed:
- Starter 100 · Trader 300 · Pro 700 · Elite 1,500 analyses/mo.

All four quotas sit well below break-even → every tier is profitable even at 100% utilization.

> Reality check: most users use a **fraction** of their quota, so real margins are **higher**
> than the table (which assumes 100% utilization).

### Free trial (first 7 days, full access)
The trial grants unlimited access for a week — a customer-acquisition cost, not a margin:
- Typical trial user runs ~20–60 analyses → **CAC ≈ $2–$6**.
- A heavy trial user could run hundreds. If that's a concern, add a **soft trial cap**
  (e.g., full access but ≤ 50 analyses) to bound CAC at ~$5.

## 3. Sensitivity (if Claude is pricier than estimated)

| Cost/analysis | Pro plan cost (250) | Pro margin |
|---|---|---|
| $0.06 | $15.00 | $54.99 (79%) |
| $0.10 | $25.00 | $44.99 (64%) |
| $0.14 | $35.00 | $34.99 (50%) |

All tiers stay healthily profitable even at the high end.

## 4. Levers to widen margins
- **Haiku on lower tiers**: route Starter to `claude-haiku-4-5` (~$0.03/analysis → ~94% margin);
  reserve Sonnet for Trader+. (Model is per-request configurable in `app/api/analyze/route.ts`.)
- The fallback already drops to Haiku if Sonnet errors.
- Twelve Data + Brave free tiers cover the MVP — only upgrade when volume demands.

## 5. How to refine with real numbers
Anthropic returns `usage` (`input_tokens`, `output_tokens`, `output_tokens_details.thinking_tokens`)
on every call — already logged in `app/api/analyze/route.ts`. Average a week of real calls and plug
the token counts × the per-token prices above into this table for exact figures.
