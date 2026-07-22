import { Router } from "express";
import { db } from "@workspace/db";
import { staffTable, attendanceRecords, hubsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { parsePagination, paginateArray } from "../lib/pagination";

const router = Router();

const TODAY = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Haversine distance in metres between two GPS points */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatWorkingHours(checkIn: string, checkOut: string): string {
  const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 1000 / 60;
  const h = Math.floor(diff / 60);
  const m = Math.floor(diff % 60);
  return `${h}h ${m}m`;
}

function determineStatus(checkIn: string, shiftStart: string | null): "present" | "late" | "half_day" {
  if (!shiftStart) return "present";
  const [sh, sm] = shiftStart.split(":").map(Number);
  const ci = new Date(checkIn);
  const shiftMinutes = sh * 60 + sm;
  const ciMinutes = ci.getHours() * 60 + ci.getMinutes();
  if (ciMinutes > shiftMinutes + 30) return "late";
  return "present";
}

async function toAttendanceApi(att: typeof attendanceRecords.$inferSelect, staffRow?: typeof staffTable.$inferSelect) {
  let s = staffRow;
  if (!s) {
    const [found] = await db.select().from(staffTable).where(eq(staffTable.id, att.staffId));
    s = found;
  }
  return {
    id: att.id,
    staffId: att.staffId,
    staffName: s?.name ?? "Unknown",
    role: s?.role ?? "unknown",
    hub: s?.hub ?? "",
    date: att.date,
    status: att.status,
    checkIn: att.checkIn,
    checkOut: att.checkOut,
    checkInLat: att.checkInLat,
    checkInLng: att.checkInLng,
    checkOutLat: att.checkOutLat,
    checkOutLng: att.checkOutLng,
    withinGeofence: att.withinGeofence,
    geofenceDistance: att.geofenceDistance,
    workingHours: att.workingHours,
  };
}

// POST /attendance/checkin
router.post("/attendance/checkin", async (req, res) => {
  const { staffId, lat, lng, accuracy } = req.body as {
    staffId: number; lat: number; lng: number; accuracy?: number;
  };
  if (!staffId || lat == null || lng == null) {
    return res.status(400).json({ error: "staffId, lat, lng required" });
  }
  const [staffRow] = await db.select().from(staffTable).where(eq(staffTable.id, staffId));
  if (!staffRow) return res.status(404).json({ error: "Staff not found" });

  const today = TODAY();
  const [existing] = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.staffId, staffId), eq(attendanceRecords.date, today)));
  if (existing?.checkIn) {
    return res.status(400).json({ error: "Already checked in today" });
  }

  // Geofence check — find closest hub by name
  const allHubs = await db.select().from(hubsTable);
  let distance = 99999;
  let withinGeofence = true;
  if (allHubs.length > 0) {
    // Find hub matching staff's hub name (partial match)
    const hub = allHubs.find((h) => staffRow.hub.toLowerCase().includes(h.name.toLowerCase().split(" ")[0])) ?? allHubs[0];
    distance = haversine(lat, lng, hub.lat, hub.lng);
    withinGeofence = distance <= hub.radiusMeters;
  }

  const now = new Date().toISOString();
  const status = determineStatus(now, staffRow.shiftStart);

  let att;
  if (existing) {
    const [updated] = await db.update(attendanceRecords).set({
      checkIn: now,
      checkInLat: lat,
      checkInLng: lng,
      withinGeofence,
      geofenceDistance: Math.round(distance),
      status,
    }).where(eq(attendanceRecords.id, existing.id)).returning();
    att = updated;
  } else {
    const [inserted] = await db.insert(attendanceRecords).values({
      staffId,
      date: today,
      checkIn: now,
      checkInLat: lat,
      checkInLng: lng,
      withinGeofence,
      geofenceDistance: Math.round(distance),
      status,
    }).returning();
    att = inserted;
  }

  return res.json(await toAttendanceApi(att, staffRow));
});

// POST /attendance/checkout
router.post("/attendance/checkout", async (req, res) => {
  const { staffId, lat, lng } = req.body as { staffId: number; lat: number; lng: number };
  if (!staffId || lat == null || lng == null) {
    return res.status(400).json({ error: "staffId, lat, lng required" });
  }
  const [staffRow] = await db.select().from(staffTable).where(eq(staffTable.id, staffId));
  if (!staffRow) return res.status(404).json({ error: "Staff not found" });

  const today = TODAY();
  const [existing] = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.staffId, staffId), eq(attendanceRecords.date, today)));
  if (!existing?.checkIn) {
    return res.status(400).json({ error: "Not checked in today" });
  }
  if (existing.checkOut) {
    return res.status(400).json({ error: "Already checked out" });
  }

  const now = new Date().toISOString();
  const workingHours = formatWorkingHours(existing.checkIn!, now);

  // Determine if half day (< 4 hours)
  const diffH = (new Date(now).getTime() - new Date(existing.checkIn!).getTime()) / 1000 / 3600;
  const finalStatus = diffH < 4 ? "half_day" : existing.status;

  const [updated] = await db.update(attendanceRecords).set({
    checkOut: now,
    checkOutLat: lat,
    checkOutLng: lng,
    workingHours,
    status: finalStatus,
  }).where(eq(attendanceRecords.id, existing.id)).returning();

  return res.json(await toAttendanceApi(updated, staffRow));
});

// GET /attendance/my?staffId=&month=YYYY-MM
router.get("/attendance/my", async (req, res) => {
  const staffId = parseInt(req.query.staffId as string);
  const month = req.query.month as string;
  if (isNaN(staffId)) return res.status(400).json({ error: "staffId required" });

  let rows = await db.select().from(attendanceRecords).where(eq(attendanceRecords.staffId, staffId));
  if (month) rows = rows.filter((r) => r.date.startsWith(month));

  const [staffRow] = await db.select().from(staffTable).where(eq(staffTable.id, staffId));
  return res.json(await Promise.all(rows.map((r) => toAttendanceApi(r, staffRow))));
});

// GET /attendance/all?date=YYYY-MM-DD&startDate=&endDate=&hub=&status=&q=&page=&pageSize=
router.get("/attendance/all", async (req, res) => {
  const { date, startDate, endDate, hub, status, q } = req.query as Record<string, string>;
  const pagination = parsePagination(req.query as Record<string, unknown>, { pageSize: 50 });

  let rows;
  if (startDate && endDate) {
    rows = await db.select().from(attendanceRecords).where(
      and(
        gte(attendanceRecords.date, startDate),
        lte(attendanceRecords.date, endDate),
      ),
    ).orderBy(desc(attendanceRecords.date));
  } else {
    const targetDate = date ?? TODAY();
    rows = await db.select().from(attendanceRecords).where(eq(attendanceRecords.date, targetDate))
      .orderBy(desc(attendanceRecords.date));
  }

  const staffRows = await db.select().from(staffTable);
  const staffMap = new Map(staffRows.map((s) => [s.id, s]));

  let results = await Promise.all(rows.map((r) => toAttendanceApi(r, staffMap.get(r.staffId))));
  if (hub) results = results.filter((r) => r.hub === hub);
  if (status) results = results.filter((r) => r.status === status);
  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    results = results.filter(
      (r) =>
        r.staffName.toLowerCase().includes(needle) ||
        r.role.toLowerCase().includes(needle) ||
        r.hub.toLowerCase().includes(needle),
    );
  }

  if (!pagination.paginate) {
    return res.json(results);
  }

  const page = paginateArray(results, pagination.page, pagination.pageSize);
  const checkIns = results.filter((r) => r.checkIn);
  const geofenced = checkIns.filter((r) => r.withinGeofence);

  const roleOrder = ["driver", "picker", "sorter", "loader", "supervisor", "security", "house_keeper"];
  const byRoleMap = new Map<
    string,
    {
      role: string;
      total: number;
      onSite: number;
      present: number;
      late: number;
      halfDay: number;
      absent: number;
      stillIn: number;
    }
  >();

  for (const r of results) {
    const role = r.role || "unknown";
    let row = byRoleMap.get(role);
    if (!row) {
      row = {
        role,
        total: 0,
        onSite: 0,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        stillIn: 0,
      };
      byRoleMap.set(role, row);
    }
    row.total += 1;
    if (r.status === "present") row.present += 1;
    else if (r.status === "late") row.late += 1;
    else if (r.status === "half_day") row.halfDay += 1;
    else if (r.status === "absent") row.absent += 1;
    if (r.status !== "absent") row.onSite += 1;
    if (r.checkIn && !r.checkOut) row.stillIn += 1;
  }

  const byRole = Array.from(byRoleMap.values()).sort((a, b) => {
    const ai = roleOrder.indexOf(a.role);
    const bi = roleOrder.indexOf(b.role);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || b.onSite - a.onSite;
  });

  return res.json({
    ...page,
    summary: {
      total: results.length,
      present: results.filter((r) => r.status === "present").length,
      late: results.filter((r) => r.status === "late").length,
      halfDay: results.filter((r) => r.status === "half_day").length,
      absent: results.filter((r) => r.status === "absent").length,
      onSite: results.filter((r) => r.status !== "absent").length,
      stillIn: results.filter((r) => r.checkIn && !r.checkOut).length,
      geofenceComplianceRate:
        checkIns.length > 0 ? Math.round((geofenced.length / checkIns.length) * 100) : 100,
      checkIns: checkIns.length,
      geofenced: geofenced.length,
      byRole,
    },
  });
});

// PUT /attendance/:id
router.put("/attendance/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const { status, checkIn, checkOut, workingHours, date } = req.body;

  const [existing] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id));
  if (!existing) return res.status(404).json({ error: "Record not found" });

  const [updated] = await db.update(attendanceRecords).set({
    status: status ?? existing.status,
    checkIn: checkIn !== undefined ? checkIn : existing.checkIn,
    checkOut: checkOut !== undefined ? checkOut : existing.checkOut,
    workingHours: workingHours !== undefined ? workingHours : existing.workingHours,
    date: date ?? existing.date,
  }).where(eq(attendanceRecords.id, id)).returning();

  return res.json(await toAttendanceApi(updated));
});

// POST /attendance/manual
router.post("/attendance/manual", async (req, res) => {
  const { staffId, date, status, checkIn, checkOut, workingHours } = req.body;
  if (!staffId || !date || !status) {
    return res.status(400).json({ error: "staffId, date, status are required" });
  }

  const [staffRow] = await db.select().from(staffTable).where(eq(staffTable.id, staffId));
  if (!staffRow) return res.status(404).json({ error: "Staff not found" });

  // Check if record already exists for this staff and date
  const [existing] = await db.select().from(attendanceRecords).where(
    and(eq(attendanceRecords.staffId, staffId), eq(attendanceRecords.date, date))
  );
  if (existing) {
    return res.status(400).json({ error: "Attendance record already exists for this date" });
  }

  const [inserted] = await db.insert(attendanceRecords).values({
    staffId,
    date,
    status,
    checkIn: checkIn ?? null,
    checkOut: checkOut ?? null,
    workingHours: workingHours ?? null,
    withinGeofence: true,
    geofenceDistance: 0,
  }).returning();

  return res.json(await toAttendanceApi(inserted, staffRow));
});

// DELETE /attendance/:id
router.delete("/attendance/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [existing] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id));
  if (!existing) return res.status(404).json({ error: "Record not found" });

  await db.delete(attendanceRecords).where(eq(attendanceRecords.id, id));
  return res.json({ success: true });
});

export default router;
