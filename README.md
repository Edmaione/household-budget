# Household Budget

A clean, simple household budget tracker built with Next.js and Supabase.

## Features

- **Add transactions** with smart autofill from past entries
- **Monthly dashboard** showing budget vs. actual spending by category
- **Transaction history** with search, edit, and delete
- **Budget management** — tap to edit any budget amount
- **Shared household** — both users see all transactions
- **Mobile-first** design with bottom navigation

## Quick Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon public key** from Settings > API

### 2. Run the Database Schema

In the Supabase SQL Editor, run these files **in order**:

1. `supabase/schema.sql` — creates tables, indexes, RLS policies, and views
2. `supabase/seed.sql` — loads categories, budget amounts, and your 122 imported transactions

### 3. Create User Accounts

In Supabase Dashboard > Authentication > Users, click "Add User" to create accounts for you and your wife. Use email/password.

### 4. Configure the App

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

### 6. Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo to Vercel and it will auto-deploy. Add the same environment variables in Vercel's project settings.

## Category Structure

| Category | Subcategories | Monthly Budget |
|----------|--------------|----------------|
| 🏠 Housing | Mortgage, Maintenance, Tax, Insurance | $3,855 |
| ⚡ Utilities | Electric, Gas, Water, Internet, Mobile | $900 |
| 🛒 Groceries | Groceries | $1,000 |
| 🏡 Household | Supplies, Clothing, Subscriptions | $450 |
| 👶 Kids | Childcare, Activities, Clothing, School | $1,300 |
| 🚗 Transportation | Fuel, Car Payment, Insurance, Maintenance, Parking | $870 |
| ❤️ Health | Medical, Prescriptions, Dental, Personal Care | $200 |
| 🐕 Pets | Food, Vet, Grooming | $430 |
| 🍽️ Dining Out | Dining Out | $100 |
| 🎉 Fun & Lifestyle | Entertainment, Outings, Travel, Gifts | $300 |
| 💰 Income | Primary, Secondary, Bonus, Reimbursements | $9,800 |

All categories and budgets are editable in the app.

## Tech Stack

- **Next.js 15** (App Router)
- **Supabase** (Postgres, Auth, RLS)
- **Tailwind CSS**
- **TypeScript**
- **Vercel** for hosting
