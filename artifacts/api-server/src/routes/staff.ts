import { Router } from "express";
import { db } from "@workspace/db";
import { staffTable, attendanceRecords, driversTable, deliveriesTable } from "@workspace/db/schema";
import { eq, and, or, ilike, asc, count } from "drizzle-orm";
import { BulkCreateStaffBody } from "@workspace/api-zod";
import { parsePagination, toPaginated } from "../lib/pagination";

const router = Router();

const ROLES = ["driver", "picker", "sorter", "loader", "supervisor", "security", "house_keeper"] as const;
const TODAY = () => new Date().toISOString().split("T")[0];

// Drivers live in their own table (referenced by deliveries.assignedDriverId), while the
// mobile app authenticates against the staff table. To make a driver assignable in the
// admin AND loggable-in on mobile, every driver-role staff member is mirrored into the
// drivers table, linked by the shared unique employeeId.
async function syncDriverFromStaff(row: typeof staffTable.$inferSelect) {
  if (row.role !== "driver") return;
  const [existing] = await db.select().from(driversTable).where(eq(driversTable.employeeId, row.employeeId));
  if (existing) {
    await db.update(driversTable).set({
      name: row.name,
      phone: row.phone,
      hub: row.hub,
      status: row.status,
      licenseNumber: row.licenseNumber ?? existing.licenseNumber,
      licenseExpiry: row.licenseExpiry,
    }).where(eq(driversTable.id, existing.id));
  } else {
    await db.insert(driversTable).values({
      name: row.name,
      employeeId: row.employeeId,
      phone: row.phone,
      licenseNumber: row.licenseNumber ?? "",
      licenseExpiry: row.licenseExpiry,
      address: row.address,
      emergencyContact: row.emergencyContact,
      aadhaarNumber: row.aadhaarNumber,
      panNumber: row.panNumber,
      hub: row.hub,
      status: row.status,
      joiningDate: row.joiningDate,
    });
  }
}

async function resolveDriverId(row: typeof staffTable.$inferSelect): Promise<number | null> {
  if (row.role !== "driver") return null;
  const [driver] = await db.select({ id: driversTable.id }).from(driversTable).where(eq(driversTable.employeeId, row.employeeId));
  return driver?.id ?? null;
}

function toApi(row: typeof staffTable.$inferSelect, isCheckedIn = false, checkInTime: string | null = null, checkInLat: number | null = null, checkInLng: number | null = null, driverId: number | null = null) {
  return {
    id: row.id,
    name: row.name,
    employeeId: row.employeeId,
    role: row.role,
    phone: row.phone,
    hub: row.hub,
    status: row.status,
    joiningDate: row.joiningDate,
    address: row.address,
    emergencyContact: row.emergencyContact,
    aadhaarNumber: row.aadhaarNumber,
    panNumber: row.panNumber,
    licenseNumber: row.licenseNumber,
    licenseExpiry: row.licenseExpiry,
    shiftStart: row.shiftStart,
    shiftEnd: row.shiftEnd,
    isCheckedInToday: isCheckedIn,
    checkInTime,
    checkInLat,
    checkInLng,
    driverId,
  };
}

// POST /staff/login  (must be before /staff/:id)
router.post("/staff/login", async (req, res) => {
  const { phone, password } = req.body as { phone?: string; password?: string };
  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password required" });
  }
  const [row] = await db.select().from(staffTable).where(eq(staffTable.phone, phone));
  if (!row || row.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const today = TODAY();
  const [att] = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.staffId, row.id), eq(attendanceRecords.date, today)));

  const token = `cv-token-${row.id}-${Date.now()}`;
  const driverId = await resolveDriverId(row);
  return res.json({
    staff: toApi(row, !!att?.checkIn, att?.checkIn ?? null, att?.checkInLat ?? null, att?.checkInLng ?? null, driverId),
    token,
  });
});

// GET /staff
router.get("/staff", async (req, res) => {
  const { role, hub, status, q } = req.query as Record<string, string>;
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const conditions = [];
  if (role) conditions.push(eq(staffTable.role, role));
  if (hub) conditions.push(eq(staffTable.hub, hub));
  if (status) conditions.push(eq(staffTable.status, status));
  if (q?.trim()) {
    const pattern = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(staffTable.name, pattern),
        ilike(staffTable.employeeId, pattern),
        ilike(staffTable.phone, pattern),
        ilike(staffTable.hub, pattern),
      )!,
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const today = TODAY();
  const todayAtt = await db.select().from(attendanceRecords).where(eq(attendanceRecords.date, today));
  const attMap = new Map(todayAtt.map((a) => [a.staffId, a]));

  const mapRow = (r: typeof staffTable.$inferSelect) => {
    const att = attMap.get(r.id);
    return toApi(r, !!att?.checkIn, att?.checkIn ?? null, att?.checkInLat ?? null, att?.checkInLng ?? null);
  };

  if (!pagination.paginate) {
    const rows = await db.select().from(staffTable).where(whereClause).orderBy(asc(staffTable.name));
    return res.json(rows.map(mapRow));
  }

  const [totalRow] = await db.select({ value: count() }).from(staffTable).where(whereClause);
  const total = Number(totalRow?.value ?? 0);
  const rows = await db
    .select()
    .from(staffTable)
    .where(whereClause)
    .orderBy(asc(staffTable.name))
    .limit(pagination.pageSize)
    .offset(pagination.offset);

  return res.json(toPaginated(rows.map(mapRow), total, pagination.page, pagination.pageSize));
});

// POST /staff
router.post("/staff", async (req, res) => {
  const body = req.body as {
    name: string; employeeId: string; role: string; phone: string; hub: string;
    joiningDate: string; password: string; address?: string; emergencyContact?: string;
    aadhaarNumber?: string; panNumber?: string; licenseNumber?: string; licenseExpiry?: string;
    shiftStart?: string; shiftEnd?: string;
  };
  if (!body.name || !body.employeeId || !body.role || !body.phone || !body.hub || !body.joiningDate || !body.password) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!ROLES.includes(body.role as (typeof ROLES)[number])) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const [row] = await db.insert(staffTable).values({
    name: body.name,
    employeeId: body.employeeId,
    role: body.role,
    phone: body.phone,
    hub: body.hub,
    joiningDate: body.joiningDate,
    password: body.password,
    address: body.address ?? null,
    emergencyContact: body.emergencyContact ?? null,
    aadhaarNumber: body.aadhaarNumber ?? null,
    panNumber: body.panNumber ?? null,
    licenseNumber: body.licenseNumber ?? null,
    licenseExpiry: body.licenseExpiry ?? null,
    shiftStart: body.shiftStart ?? null,
    shiftEnd: body.shiftEnd ?? null,
    status: "active",
  }).returning();
  await syncDriverFromStaff(row);
  return res.status(201).json(toApi(row, false, null, null, null, await resolveDriverId(row)));
});

// POST /staff/bulk  (must be before /staff/:id)
router.post("/staff/bulk", async (req, res) => {
  const parsed = BulkCreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const errors: { row: number; message: string }[] = [];
  let created = 0;

  for (let i = 0; i < parsed.data.staff.length; i++) {
    const s = parsed.data.staff[i];
    try {
      const [inserted] = await db.insert(staffTable).values({
        name: s.name,
        employeeId: s.employeeId,
        role: s.role,
        phone: s.phone,
        hub: s.hub,
        joiningDate: s.joiningDate,
        password: s.password,
        address: s.address ?? null,
        emergencyContact: s.emergencyContact ?? null,
        aadhaarNumber: s.aadhaarNumber ?? null,
        panNumber: s.panNumber ?? null,
        licenseNumber: s.licenseNumber ?? null,
        licenseExpiry: s.licenseExpiry ?? null,
        shiftStart: s.shiftStart ?? null,
        shiftEnd: s.shiftEnd ?? null,
        status: "active",
      }).returning();
      await syncDriverFromStaff(inserted);
      created++;
    } catch (err) {
      const cause = err instanceof Error ? (err.cause as { code?: string; message?: string } | undefined) : undefined;
      const text = `${err instanceof Error ? err.message : ""} ${cause?.message ?? ""}`;
      const isDuplicate = cause?.code === "23505" || /unique|duplicate/i.test(text);
      const message = isDuplicate
        ? `Employee ID "${s.employeeId}" or phone already exists`
        : "Could not import this row";
      errors.push({ row: i + 1, message });
    }
  }

  return res.json({ created, failed: errors.length, errors });
});

// GET /staff/:id
router.get("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(staffTable).where(eq(staffTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });

  const today = TODAY();
  const [att] = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.staffId, id), eq(attendanceRecords.date, today)));
  return res.json(toApi(row, !!att?.checkIn, att?.checkIn ?? null, att?.checkInLat ?? null, att?.checkInLng ?? null));
});

// PATCH /staff/:id
router.patch("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const body = req.body as Partial<{
    name: string; phone: string; hub: string; status: string;
    address: string | null; emergencyContact: string | null;
    shiftStart: string | null; shiftEnd: string | null; password: string | null;
  }>;
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.phone !== undefined) update.phone = body.phone;
  if (body.hub !== undefined) update.hub = body.hub;
  if (body.status !== undefined) update.status = body.status;
  if (body.address !== undefined) update.address = body.address;
  if (body.emergencyContact !== undefined) update.emergencyContact = body.emergencyContact;
  if (body.shiftStart !== undefined) update.shiftStart = body.shiftStart;
  if (body.shiftEnd !== undefined) update.shiftEnd = body.shiftEnd;
  if (body.password) update.password = body.password;

  const [row] = await db.update(staffTable).set(update).where(eq(staffTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await syncDriverFromStaff(row);

  const today = TODAY();
  const [att] = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.staffId, id), eq(attendanceRecords.date, today)));
  return res.json(toApi(row, !!att?.checkIn, att?.checkIn ?? null, att?.checkInLat ?? null, att?.checkInLng ?? null, await resolveDriverId(row)));
});

// DELETE /staff/:id
router.delete("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(staffTable).where(eq(staffTable.id, id));
  await db.delete(staffTable).where(eq(staffTable.id, id));
  if (row?.role === "driver") {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.employeeId, row.employeeId));
    if (driver) {
      // Unassign any deliveries pointing at this driver so we don't leave dangling
      // assignedDriverId references (deliveries.assignedDriverId has no FK constraint).
      await db.update(deliveriesTable)
        .set({ assignedDriverId: null, assignedDriverName: null })
        .where(eq(deliveriesTable.assignedDriverId, driver.id));
      await db.delete(driversTable).where(eq(driversTable.id, driver.id));
    }
  }
  return res.status(204).send();
});

export default router;
