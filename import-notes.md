# AIMPLIFY V1 Import Notes

Use `supabase-schema.sql` to create the V1 tables. The current React app uses typed seed data in `src/data.ts`; when the asset Excel sheet arrives, map each row into these core tables:

- `platform_families`
- `signature_solutions`
- `assets`
- `asset_changelog`
- `submissions`
- `activity_log`

Recommended Excel columns for assets:

- `id`
- `name`
- `family_id`
- `category`
- `solution`
- `description`
- `about`
- `owner`
- `owner_initials`
- `maturity`
- `effort`
- `clouds`
- `tags`
- `demo_url`
- `repo_url`
- `users_count`
- `deployments_count`
- `pipelines_count`
- `score`
- `architecture`
- `quick_start`
- `prerequisites`
- `dependencies`

For V1, keep `clouds`, `tags`, `architecture`, `quick_start`, `prerequisites`, and `dependencies` as pipe-delimited Excel cells, then convert them into JSON arrays during import.
