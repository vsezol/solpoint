This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Application URL
# For local development use: http://localhost:3000
# For production use your domain: https://app.example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Allowed mobile deep-link schemes for OAuth callback redirects (comma-separated)
MOBILE_DEEP_LINK_SCHEMES=solpointmobile
```

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### Quick Deploy

1. Push your code to GitHub, GitLab, or Bitbucket
2. Import your repository on [Vercel](https://vercel.com/new)
3. Vercel will automatically detect Next.js and configure the build settings

### Environment Variables

Before deploying, make sure to add the following environment variables in your Vercel project settings (Settings → Environment Variables):

**Required:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
MOBILE_DEEP_LINK_SCHEMES=solpointmobile
```

**Optional:**
```env
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Deployment Steps

1. **Connect Repository:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository

2. **Configure Project:**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

3. **Add Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add all required variables listed above
   - Set them for Production, Preview, and Development environments as needed

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - Your app will be available at `https://your-project.vercel.app`

### Post-Deployment

After deployment, update `NEXT_PUBLIC_APP_URL` in Vercel environment variables to match your production domain.

For more details, check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
