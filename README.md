# DealFlow OS

AI-assisted VC deal sourcing and investment analysis platform — built with Next.js, powered by real YC company data.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** for styling
- **Prisma + Vercel Postgres** (production) / stateless mode (local)
- **YC Algolia API** for real startup data
- **SVG Radar Chart** — no charting library

## Features

- **Deal Scan Engine** — searches YC directory for startups matching your investment thesis
- **5-Dimension Scoring** — Market Opportunity, Sector Growth, Founder Credibility, Funding Momentum, Product Differentiation
- **Analyst-Grade Investment Memos** — rule-based memo generation with conviction labels
- **Pipeline Management** — move companies through deal stages
- **Watchlist** — star and track companies across scans
- **Activity Log** — full audit trail of pipeline actions
- **Persistent Storage** — all scans, notes, and pipeline moves saved to Postgres on Vercel

## Getting Started (local)

```bash
npm install
npm run dev        # http://localhost:3000
```

> Without a `DATABASE_URL` env var the app runs in stateless mode — scans work but nothing persists between sessions.

## Deploying to Vercel

1. Push to GitHub and import the project on Vercel
2. Go to **Storage** → connect a Postgres database
3. Vercel auto-injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
4. Run `vercel env pull && npm run db:push` to create the tables
5. Redeploy — full persistence is enabled
