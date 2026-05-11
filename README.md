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

## SolPoint: Your Network is Your Net Worth on Solana 🚀
> The Thesis
> In today’s market, we are drowning in AI-powered tools and high-skilled developers.
> Competition is at an all-time high, and building a product has never been easier. But here is the hard truth:

**You are not "one feature" away from success. You are one right connection away from success.**

In the Solana ecosystem, success isn't just about shipping code; it's about who knows you ship it, who trusts you, and who helps you scale. **SolPoint** is built to bridge that gap.

**Submission:** [Solana Frontier Hackathon 2026](https://colosseum.com/frontier)

**Product:** [Website](https://solpoint.xyz)

## Problem and Solution

| Problem | SolPoint |
|---|---|
| Web3 is borderless, but professional growth is often local. Founders and developers are scattered across the globe, making it impossible to know who is in your city or the country you just landed in. | SolPoint provides a real-time, global map that allows you to find Solana enthusiasts anywhere in the world—from your local cafe in Almaty to a tech hub in Kuala Lumpur. Find your peers based on geography, not just hashtags. |
| Most Solana events are a "black box." You see 100 people in a room but have no idea who is a senior dev, who is a VC, or who could be your next marketing lead. Networking becomes a game of chance. | SolPoint reveals the guest list before you even arrive. See exactly who is attending an event, browse their professional profiles, and plan your connections with surgical precision. |
| Platforms like X (Twitter) are great for hype but terrible for hiring or partnerships. A "bullish" bio doesn't tell you if a person has scaled a product to $80k MRR or if they have the skills you need. | Every user profile on SolPoint is a professional resume. Project Experience: Verified history of past builds and roles. Hard Skills & Interests: Clear data on what a user actually brings to the table. |

## Competitive Positioning

SolPoint is not just an event platform or a job board. It is the professional evidence layer that sits before and underneath those systems.

| Compared with | What they focus on | Where SolPoint fits |
|---|---|---|
| Luma | Event management, RSVP pages, and guest lists. | Attendee Intelligence: Providing deep professional profiles and verified backgrounds of guests before the event starts. |
| Superteam Talent | Job boards, recruitment, and hiring within the Solana ecosystem. | Interactive Networking Map: Discovering partners, co-founders, and leads by location and skills before a role is even posted. |
| LinkedIn | Broad professional networking without deep Web3 or on-chain context. | Solana-native Resume: Detailed profiles focused on specific project experience, skills, and roles within the Solana community.
| X (Twitter) | Social hype, viral reaches, and follower-count metrics. | Engagement Quality: Shifting from anonymous "vanity metrics" to verified professional identities and real ecosystem roles. |

## Founder info

| Name | Role | Contact |
|------|------|---------|
| Daniel Gladkov | Founder & Lead Engineer | [Telegram](https://t.me/insoldanny) · [X](https://x.com/insoldanny) |

Founder context:

- Second-time Founder with a proven track record of scaling Solana product from idea to $80,000 MRR in less than a year, fully bootstrapped.;
- Solana Superteam KZ member with $6000 grant;
- Accelerator Alumni: Selected for the Encode Club x Solana Foundation Accelerator.
- Events host: Member of RedotsClub with experience hosting Solana community events for 70+ participants.

  ## Why Solana

- **Hyper-Localization:** With the rapid expansion of Superteam chapters worldwide, the number of local IRL events is exploding. The community is moving from global Discord servers and TG chats to local hubs, creating a massive demand for proximity-based networking.
- **Unmatched Energy:** Solana consistently maintains the most vibrant and "sticky" community across all blockchains. This high level of social activity requires a dedicated tool to organize and verify professional identities within the chaos.
- **Technical vs. Social:** Solana’s technical infrastructure and developer tooling are world-class. However, the Social Experience and Networking UX are still fragmented.

  ## Features

- **Global Real-Time Discovery:** Find Solana enthusiasts and active events in your city, country, or any location worldwide.
- **Attendee Intelligence:** Access the full guest list before the event starts. Plan your networking with surgical precision by knowing exactly who is in the room.
- **Comprehensive Profiles:** Full professional identities featuring detailed skills, interests, and professional summaries.
- **Verified Project Experience:** A dedicated section for past contributions and roles, replacing "degen" bios with a verifiable track record of work.

  ## Business Model
  We are starting as free tool, however as new features come we will add subscribtions

| Product | Price | Audience |
|---|---:|---|
| Standard Networking | Free | Individual users, casual networkers |
| Pro Networking (Connect Limits) | $39 / month | Power users, scouts, founders looking for partners |
| User Spotlight (Temporary Highlight) | $50 / week | Developers or Founders seeking maximum visibility |
| Event Spotlight (Featured Status) | $100 / week | Event hosts and organizers driving attendance |
| Advanced Attendee Analytics | $500 / report | Professional event hosts, VCs, and marketing leads |

### Built

- [x] **Core Networking Infrastructure** - Interactive global map and real-time event discovery engine deployed and tested.
- [x] **Professional Identity Layer** - Verified profile system with project history, skill tagging, and ecosystem-specific roles (Founder, Dev, Marketing).
- [x] **Intelligent Event Surfaces** - Attendee list visualization, and "who is coming" professional insights.


### Coming next

- [ ] **Networking Gamification & Reputation** - Implementation of XP (Experience Points), unique ecosystem Badges, and Soulbound NFTs to reward active networkers, top contributors, and high-quality event attendees.
- [ ] **Web3 Native Messaging (Cherry.fun Partnership)** - Integration with Cherry.fun to enable a seamless, secure in-app messenger for users who have established a mutual connection.
- [ ] **Strategic Event Partnerships** - Expansion of official integrations with both local hubs (Central Asia, SE Asia) and global flagship Solana events to become the default attendee-layer tool.
- [ ] **1-on-1 Meeting Scheduler** - A built-in booking system allowing users to schedule professional coffee chats or deep-dives directly from the attendee list or map.
- [ ] **On-Chain Attestation for Skills** - Moving beyond self-reported skills to verified on-chain attestations of project contributions and hackathon wins.

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
