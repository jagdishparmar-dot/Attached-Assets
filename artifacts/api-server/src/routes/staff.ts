import { Router } from "express";
import { db } from "@workspace/db";
import { staffTable, attendanceRecords } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const ROLES = ["driver", "picker", "sorter", "loader", "supervisor", "security"] as const;
const TODAY = () => new Date().toISOString().split("T")[0];

function toApi(row: typeof staffTable.$inferSelect, isCheckedIn = false, checkInTime: string | null = null, checkInLat: number | null = null, checkInLng: number | null = null) {
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
  return res.json({
    staff: toApi(row, !!att?.checkIn, att?.checkIn ?? null, att?.checkInLat ?? null, att?.checkInLng ?? null),
    token,
  });
});

// GET /staff
router.get("/staff", async (req, res) => {
  const { role, hub, status } = req.query as Record<string, string>;
  let rows = await db.select().from(staffTable);
  if (role) rows = rows.filter((r) => r.role === role);
  if (hub) rows = rows.filter((r) => r.hub === hub);
  if (status) rows = rows.filter((r) => r.status === status);

  const today = TODAY();
  const todayAtt = await db.select().from(attendanceRecords).where(eq(attendanceRecords.date, today));
  const attMap = new Map(todayAtt.map((a) => [a.staffId, a]));

  return res.json(rows.map((r) => {
    const att = attMap.get(r.id);
    return toApi(r, !!att?.checkIn, att?.checkIn ?? null, att?.checkInLat ?? null, att?.checkInLng ?? null);
  }));
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
  return res.status(201).json(toApi(row));
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

  const today = TODAY();
  const [att] = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.staffId, id), eq(attendanceRecords.date, today)));
  return res.json(toApi(row, !!att?.checkIn, att?.checkIn ?? null, att?.checkInLat ?? null, att?.checkInLng ?? null));
});

// DELETE /staff/:id
router.delete("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(staffTable).where(eq(staffTable.id, id));
  return res.status(204).send();
});

export default router;
