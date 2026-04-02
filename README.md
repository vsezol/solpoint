This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
