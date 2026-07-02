# Coldverse DMS

Delivery Management System for Coldverse Supply Chain Pvt. Ltd. — manages drivers, warehouse staff, attendance, and live GPS tracking across logistics hubs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Mobile release to Google Play (EAS Submit)

New builds upload straight to the Play **internal testing** track — no manual `.aab` download/upload.

**Backend URL (required for installed builds):** the mobile app reads its API/auth host from `EXPO_PUBLIC_DOMAIN` (`AuthContext.getApiBase`). This must be set as a Plain-text env var in the EAS **production** environment, pointing to the published Replit deployment domain (NOT a `*.replit.dev` dev domain). Currently `CompassdeliveryOps.replit.app`. Without it, release builds have no backend and cannot log in. Set/inspect via:
- `EAS_NO_VCS=1 ./node_modules/.bin/eas env:list production`
- `EAS_NO_VCS=1 ./node_modules/.bin/eas env:create production --name EXPO_PUBLIC_DOMAIN --value "<deploy-domain>" --visibility plaintext --type string --non-interactive`

One-time setup (manual, done in Google Play Console + EAS):
1. In Google Play Console → Setup → API access, create/link a **service account** and grant it the *Release manager* (or *Release to testing tracks*) permission. Download its **JSON key**.
2. Place the key at `artifacts/mobile/google-play-service-account.json` (gitignored — never commit it). Locally that is enough; `eas.json` references it via `submit.production.android.serviceAccountKeyPath`.
3. The app must already exist in Play Console with package `app.coldverse.in` and have one build uploaded by hand for the very first release (Google requires the first `.aab` to be uploaded manually).

Cut a new release (from `artifacts/mobile/`, always with `EAS_NO_VCS=1`):
- Build + auto-submit in one step:
  `EAS_NO_VCS=1 ./node_modules/.bin/eas build --platform android --profile production --auto-submit --non-interactive`
- Or submit an existing build separately:
  `EAS_NO_VCS=1 ./node_modules/.bin/eas submit --platform android --profile production --non-interactive`

`production` build uses `autoIncrement` so versionCode bumps automatically each release. Submit config: track `internal`, releaseStatus `completed`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 5000, path prefix `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)
- Admin: React + Vite (shadcn/ui, TailwindCSS, Leaflet maps)
- Mobile: Expo / React Native

## Where things live

- `lib/db/src/schema.ts` — DB schema source of truth (staff, hubs, attendance, locations, deliveries)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-client-react/src/` — generated React Query hooks (do not hand-edit)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/admin/src/pages/` — Admin panel pages (staff.tsx, tracking.tsx, …)
- `artifacts/mobile/app/(tabs)/` — Mobile app screens (index, attendance, track, profile)
- `artifacts/mobile/context/AuthContext.tsx` — Auth + staff session for mobile
- `scripts/src/seed.ts` — DB seed (14 staff, 4 hubs)

## Architecture decisions

- Contract-first API: OpenAPI spec drives codegen; never call raw fetch in clients, always use generated hooks.
- Session key `@coldverse_session_v3` (bumped when session shape changed; v3 added `driverId` to the mobile staff session so drivers link to their `driversTable` row).
- Role-based tab gating in mobile `_layout.tsx`: drivers get all 5 tabs; all others get Attendance + Track + Profile only, redirect enforced via `usePathname`.
- Geofence check-in uses Haversine distance on the server (hub lat/lng from DB); default radius 500m.
- GPS pings sent every 30 s from mobile `track.tsx`; admin Tracking page polls `/api/locations/active` every 30 s.

## Product

- **Admin Panel** (`/admin`): Staff CRUD (all 6 roles), Live Tracking map (Leaflet, role-colored markers), attendance overview.
- **Driver App** (`/mobile` via Expo): Role-aware tabs — Dashboard, Deliveries, Attendance (geo-fenced check-in/out), Track (background GPS), Profile.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use `restart_workflow` instead.
- After changing `lib/api-spec/openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before typechecking clients.
- After changing `lib/db` schema, run `pnpm --filter @workspace/db run push` then re-seed if needed.
- `useListActiveLocations` and other Orval hooks do not accept a `query.refetchInterval` option without also providing `queryKey`; either omit refetchInterval or pass the full query options shape.
- `expo-location` `LocationCoords.accuracy` is `number | null` — always use `?? 0` when assigning to a `number` field.
- Admin uses wouter with `base="/admin"` (from Vite BASE_URL): all Route paths, Links, and `navigate()` calls must be base-relative (e.g. `/staff`, NOT `/admin/staff`) — double-prefixing breaks deep links with 404s.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
