# sienna

A minimal personal image archive. Warm, editorial aesthetic.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** — Postgres + Storage
- **Vercel** — Deployment

---

## Setup

### 1. Supabase

1. Create a new Supabase project.
2. Go to **Storage** and create a public bucket named **`sienna`**.
3. Open the **SQL Editor** and run `supabase/schema.sql`.

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=       # Project URL from Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # anon public key
SUPABASE_SERVICE_ROLE_KEY=      # service_role secret key (server-side only)
UPLOAD_PASSWORD=                # your chosen upload password
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 4. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add all four environment variables in the Vercel project settings.
4. Deploy.

> **Tip:** Set `NEXT_PUBLIC_BASE_URL` to your Vercel URL (e.g. `https://sienna.vercel.app`) in the Vercel environment variables to ensure server-side photo fetching works correctly in production.

---

## Routes

| Route | Description |
|---|---|
| `/` | Public photo gallery |
| `/upload` | Password-protected upload & manage page |
| `GET /api/photos` | Returns all photos (JSON) |
| `POST /api/upload` | Upload a photo (requires `x-upload-password` header) |
| `DELETE /api/delete` | Delete a photo (requires `x-upload-password` header) |
