# BB Store

A minimalist, accessibility-first local shopping site prototype for BB Store.

## Current prototype

The starter includes:

- Minimalist glass / bubble UI
- Home page
- Product catalog
- Daily food + regular product categories
- Cart with local persistence
- Guest checkout flow (demo only)
- Pickup / nearby delivery choice
- Cash, GCash, MariBank, and bank-transfer choices (demo only)
- Order tracking prototype
- Customer account / order history layout
- Admin dashboard layout
- Supabase database schema starter

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth + Postgres + Storage (to connect in the next step)
- Vercel for deployment

Current Next.js and Supabase documentation recommends the App Router and Supabase's Next.js SSR setup for cookie-based authentication. See the official docs:

- https://nextjs.org/docs
- https://supabase.com/docs/guides/auth/quickstarts/nextjs
- https://vercel.com/frameworks/nextjs

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local`.
4. Add your Supabase Project URL and Publishable Key.
5. Install dependencies with `npm install`.
6. Start the development server with `npm run dev`.
7. Deploy the GitHub repository through Vercel.

## Important security note

Do not put service-role keys in the browser or commit them to GitHub. Keep privileged operations server-side. Row Level Security must remain enabled for customer/order data.

## Next build step

Connect Supabase Auth first, then replace the demo data with real database reads/writes. After that, add the admin role checks and real order creation/status updates. Finally, configure Google OAuth and the real payment instructions/receipt upload flow.
