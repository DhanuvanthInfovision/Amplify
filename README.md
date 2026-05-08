# AIMPLIFY (V1)

AIMPLIFY is an internal Accelerator OS for browsing reusable AI assets, submitting new accelerators, and moving submissions through a governed review pipeline until they are published in the catalog.

## What this app does

- **Dashboard:** Gives a quick command-center view of total assets, maturity, deploy counts, and pending review queue.
- **Catalog:** Lets teams discover accelerators by family, cloud, maturity, category, and search.
- **Asset details:** Shows architecture, quick start, prerequisites, dependencies, and links (demo/repo) for each asset.
- **Submit:** Allows contributors to submit a new accelerator with metadata.
- **Pipeline:** Lets reviewers move submissions through status gates and publish approved ones.

## End-to-end process flow

1. **Sign in** with a demo user.
2. **Browse catalog** to discover existing assets and avoid duplicate work.
3. **Submit a new asset** from the Submit page.
4. Submission enters pipeline with status progression:
   - `Submitted` -> `AI Review` -> `Needs Changes` (if required) -> `Manual Approval` -> `Approved` -> `Published`
5. Once published, the submission is added to the catalog as a new asset.

## Demo credentials (V1)

### Main user (default login)

- **Username (email):** `abhilash.vantaram@infovision.com`
- **Password:** `Aimplify@2026`

### Other seeded demo users

- `balram.aggarwal@infovision.com` / `Aimplify@2026`
- `dhanuvanth.senthilkumar@infovision.com` / `Aimplify@2026`
- `pratyoosh.patel@infovision.com` / `Aimplify@2026`
- `renju.devi@infovision.com` / `Aimplify@2026`
- `swetha.polumahanthi@infovision.com` / `Aimplify@2026`

> Note: These are demo-only seeded credentials in frontend data for V1. Production auth (SSO/role policies) is not yet wired.

## Data behavior (important)

- The app is pre-seeded with demo data so it works out of the box.
- If Supabase is configured, it loads/saves assets and submissions from database tables.
- If Supabase is not configured or unavailable, it gracefully falls back to seeded data.
- Local browser storage is used to remember current user and client-side state snapshots.

## Quick start

```bash
npm install
npm run dev
```

Open the local Vite URL shown in terminal (usually `http://localhost:5173`), then sign in with the demo credentials above.

## Optional: Supabase setup

Create a `.env.local` file with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_or_publishable_key
```

Use `supabase-schema.sql` to create required tables before testing database-backed behavior.
