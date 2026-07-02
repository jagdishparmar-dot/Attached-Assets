---
name: Staff/driver dual-table linkage
description: Why drivers exist in two tables and how the mobile↔admin driver flow stays linked
---

# Staff/driver dual-table linkage

Coldverse has TWO tables for drivers:
- `staffTable` — what the mobile app authenticates against (phone + password), all 6+ roles.
- `driversTable` — what `deliveries.assignedDriverId` references; the admin assigns deliveries by `driversTable.id`.

They are linked by the shared unique `employeeId`.

**Rule:** any driver-role staff mutation must mirror into `driversTable`, and the
mobile session must carry the resolved `driverId`.
- `syncDriverFromStaff(row)` upserts driver by employeeId on login, POST/PATCH/bulk staff.
- Login + staff responses return `driverId`; mobile filters its deliveries by
  `?assignedDriverId=<driverId>`, NOT by `staff.id`.
- `DELETE /staff/:id` for a driver must first null out `deliveries.assignedDriverId/Name`
  for that driver, THEN delete the driver row — `deliveries.assignedDriverId` has NO FK
  constraint, so orphaned refs will otherwise dangle.

**Why:** originally `POST /staff` never created a driver row, so admin-created drivers
were invisible/unassignable in the mobile app. Forgetting the mirror or the driverId
resolution silently breaks the whole live-delivery flow.

**Gotchas:**
- Backend delivery status enum has NO `partial` (pending/assigned/in_transit/delivered/
  failed/rescheduled). Mobile maps `assigned`→`pending` for the driver UI.
- Mobile session key must bump (v2→v3…) whenever the staff session shape changes
  (e.g. adding `driverId`), or stale sessions ship without the new field until re-login.
