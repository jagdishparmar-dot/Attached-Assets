---
name: Delivery number generation
description: How CV-DEL delivery numbers are generated and why it must tolerate concurrency
---

`delivery_number` (`CV-DEL-YYYYMMDD-NNNN`) is generated server-side in
`getNextDeliveryNumber()` and is the ONLY unique column on the deliveries table
(`order_number` is NOT unique). The next sequence is derived by scanning existing
numbers for today's prefix and returning `max+1`.

**Why scan instead of an in-memory counter:** an in-memory counter resets to `0001`
on every server restart and then collides with already-persisted numbers, so the
first create after a restart failed with a unique-violation. Deriving from the DB is
restart-safe.

**Why the scan still needs concurrency handling:** two concurrent requests can both
read the same `max` and compute the same next number, racing on the unique
constraint. Single-request bulk loops are safe (sequential awaits bump the max), but
cross-request concurrency is not.

**How to apply:** in the bulk handler each row's writes (delivery insert + activity
insert + customer `total_deliveries` increment) run in one `db.transaction`, and the
whole transaction is retried (up to 5x) with a freshly generated number on a 23505
unique-violation — on retry the re-scan reflects the other request's committed row.
Use atomic SQL (`total_deliveries = total_deliveries + 1`), never read-modify-write,
to avoid lost increments. If this ever needs to be bulletproof, switch to a Postgres
sequence; retry-on-conflict is the pragmatic, migration-free choice for this scale.
