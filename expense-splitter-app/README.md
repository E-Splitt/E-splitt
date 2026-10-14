# E-Split

Split expenses with friends — groups, settle-up, periods, chat, and analytics. Built with React, Vite, and Supabase.

## Quick start

1. **Install**

   ```bash
   cd expense-splitter-app
   npm ci
   ```

2. **Configure Supabase**

   Copy `.env.example` to `.env` and set:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   In the [Supabase SQL Editor](https://supabase.com/dashboard), run these scripts **in order**:

   1. `supabase_auth_setup.sql`
   2. `supabase_members_and_periods.sql` (members, periods, invite RPCs)
   3. `create_logs_table.sql` (optional telemetry)

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5174](http://localhost:5174).

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `npm run dev`  | Local dev server     |
| `npm run build`| Production build     |
| `npm test`     | Vitest unit tests    |
| `npm run lint` | ESLint               |

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md). Set the same `VITE_*` variables in your host (Netlify, Vercel, etc.).

## Security note

Never commit `.env`. Rotate Supabase keys if they were ever checked into git.
