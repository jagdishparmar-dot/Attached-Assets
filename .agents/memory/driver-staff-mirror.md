---
name: Driver ↔ Staff mirroring
description: Why and how a driver record is mirrored into the staff (workforce) table
---

`drivers` and `staff` are SEPARATE tables. A driver is also a workforce member, so
`POST /drivers` and `PATCH /drivers/:id` mirror the driver into `staffTable` with
`role: "driver"`.

**Why:** Admin users expect a driver added under Operations > Drivers to also appear
under Workforce > Staff (and to be able to log in to the mobile app). The two tables
were otherwise disjoint, so drivers never showed on the Staff page.

**How to apply:**
- Create: insert driver + mirror staff row inside one `db.transaction` (atomic).
  Use `.onConflictDoNothing({ target: staffTable.employeeId })` so an existing
  employeeId in staff doesn't break driver creation. The mirrored staff row gets the
  app's default seed password (see the seed script for the convention; the whole app
  uses plaintext passwords — pre-existing model, out of scope to rework).
- Update: inside a transaction, after updating the driver, `UPDATE staff ... WHERE
  employee_id = driver.employeeId` to keep name/phone/hub/status/license/etc. in sync.
  Do NOT change employeeId or role on sync.
- If you add driver delete/deactivate, mirror that to the staff row too for consistency.
