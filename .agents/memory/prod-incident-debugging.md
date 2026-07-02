---
name: Prod mobile app incident debugging
description: How to triage "published app not working" complaints for Coldverse DMS
---
When users report the Play Store app "not working", the cause is usually data/ops, not code:
- Verify backend first: `curl https://<deploy-domain>/api/healthz`, then `fetch_deployment_logs` for 401s/errors.
- Prod DB is separate from dev — inspect via read-only prod SQL (database skill, environment:"production"). Table names: staff, hubs, attendance_records (NOT attendance).
- Staff login is phone+password; the admin add-staff form applies a known default password to new staff — most "login broken" reports are wrong-password, not backend failures.
- Hub rows seeded with city-center placeholder coords; geofence warnings until admin sets real warehouse lat/lng. Server records attendance even outside geofence.
- Check-in "button not working" was a silent GPS catch in mobile attendance screen (fixed with Alert) — if no POST /api/attendance/checkin appears in prod logs, failure is client-side before the request.
**Why:** avoids rebuilding/redeploying when the fix is credentials, hub coords, or user training.
**How to apply:** on any prod complaint, run the healthz + logs + prod-SQL triage before touching code.
