# Solpoint

The event and networking hub for the Solana ecosystem. Discover events, build your on-chain profile, and connect with founders, developers, and community members across Solana.

## Features

- **Event Discovery** — Browse and search Solana ecosystem events synced from Luma and other sources
- **Interactive Map** — Visualize events and communities geographically with MapLibre GL
- **Wallet Auth** — Sign in with any Solana wallet (Phantom, Backpack, Solflare, and more)
- **Profiles** — On-chain identity with community badges, DAO memberships, and accelerator alumni status
- **Hubs & Communities** — Find your people by project, track, or ecosystem vertical
- **3D Visualizations** — Three.js-powered ecosystem views

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Blockchain | Solana Web3.js, Wallet Adapter |
| Backend | Supabase (auth + database), NextAuth |
| Maps | MapLibre GL, Leaflet |
| 3D | Three.js, React Three Fiber |
| State | Zustand, TanStack React Query |

## Getting Started

### Prerequisites

- Node.js ≥ 18.0.0
- A Supabase project

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# App URL
# Local: http://localhost:3000
# Production: https://your-domain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth deep-link schemes (comma-separated)
MOBILE_DEEP_LINK_SCHEMES=solpointmobile

# Optional: Google Analytics
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run luma-scraper:*   # Collect event data from Luma
npm run luma-sync:events # Sync events to database
npm run backfill:organizers # Populate organizer data
```

## Deploy on Vercel

### Quick Deploy

1. Push your code to GitHub, GitLab, or Bitbucket
2. Import the repository at [vercel.com/new](https://vercel.com/new)
3. Vercel auto-detects Next.js — no build config needed

### Environment Variables

In your Vercel project: **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` |
| `MOBILE_DEEP_LINK_SCHEMES` | `solpointmobile` |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | *(optional)* Your GA4 ID |

Set variables for **Production**, **Preview**, and **Development** environments as needed.

After first deploy, update `NEXT_PUBLIC_APP_URL` to match your production domain.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── events/       # Event discovery
│   ├── map*/         # Map views (v1, v2, cn)
│   ├── profile*/     # User profiles
│   ├── hubs/         # Community hubs
│   ├── communities/  # Communities
│   ├── dashboard/    # User dashboard
│   ├── chats/        # Messaging
│   ├── projects/     # Projects directory
│   └── admin/        # Admin panel
├── components/       # Shared UI components
└── lib/              # Utilities and helpers
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
