# Pulse Frontend

Next.js 15 App Router dashboard. Talks to the FastAPI backend via `NEXT_PUBLIC_API_BASE` (proxied by `next.config.mjs` so `/api/*` routes hit the backend).

## Prerequisites

- Node 20+
- Backend running at `http://localhost:8000` (see `../backend/README.md`)

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. Default credentials come pre-filled: `demo@pulse.app` / `demo123`.

## Stack

- **Next.js 15** App Router + React 19
- **TanStack Query** for server state (skeleton loading + refetch on filter change)
- **shadcn/ui** primitives (hand-copied — no CLI dependency)
- **Recharts** for charts (area, bar/waterfall, pie/donut, cohort grid as CSS)
- **next-themes** for dark/light mode (dark default)
- **Tailwind CSS** with HSL CSS-variable theming

## Structure

```
src/
├── app/
│   ├── layout.tsx              Root layout + providers
│   ├── login/                  Public: email/pw + Google OAuth entry
│   ├── auth/callback/          OAuth callback → stores JWT, redirects
│   └── (dashboard)/            Auth-guarded group
│       ├── layout.tsx          Sidebar + header wrapper
│       ├── page.tsx            Overview (KPIs, chart, donut, activity)
│       ├── customers/          Table + filters + slide-over detail
│       ├── revenue/            Cohort grid + MRR waterfall
│       └── settings/           Team / Billing / Notifications tabs
├── components/
│   ├── ui/                     shadcn primitives
│   ├── layout/                 Sidebar, header, theme toggle
│   └── features/               Domain components (kpi-card, revenue-chart, ...)
├── lib/                        api client, formatters, cn helper
├── hooks/                      use-auth, use-debounce
└── types/                      Shared with backend Pydantic schemas
```

## Auth flow

1. `/login` → `POST /api/auth/login` → JWT stored in `localStorage.pulse_token`
2. All subsequent `api()` calls send `Authorization: Bearer <token>`
3. 401 responses auto-clear the token and redirect to `/login`
4. Google OAuth: `/api/auth/google/login` → Google → backend callback → redirects to `/auth/callback?token=...` → stores token
