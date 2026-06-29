import { Router } from "express";
import { db } from "@workspace/db";
import { staffTable, staffLocations, attendanceRecords } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const TODAY = () => new Date().toISOString().split("T")[0];

// POST /locations/ping — mobile calls this every 30s
router.post("/locations/ping", async (req, res) => {
  const { staffId, lat, lng, accuracy, speed, heading } = req.body as {
    staffId: number; lat: number; lng: number;
    accuracy?: number; speed?: number; heading?: number;
  };
  if (!staffId || lat == null || lng == null) {
    return res.status(400).json({ error: "staffId, lat, lng required" });
  }

  const [staffRow] = await db.select().from(staffTable).where(eq(staffTable.id, staffId));
  if (!staffRow) return res.status(404).json({ error: "Staff not found" });

  const today = TODAY();
  const [att] = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.staffId, staffId), eq(attendanceRecords.date, today)));
  const isCheckedIn = !!att?.checkIn && !att?.checkOut;

  // Upsert location
  const now = new Date();
  const existing = await db.select().from(staffLocations).where(eq(staffLocations.staffId, staffId));
  let loc;
  if (existing.length > 0) {
    const [updated] = await db.update(staffLocations).set({
      lat, lng,
      accuracy: accuracy ?? null,
      speed: speed ?? null,
      heading: heading ?? null,
      isActive: true,
      updatedAt: now,
    }).where(eq(staffLocations.staffId, staffId)).returning();
    loc = updated;
  } else {
    const [inserted] = await db.insert(staffLocations).values({
      staffId, lat, lng,
      accuracy: accuracy ?? null,
      speed: speed ?? null,
      heading: heading ?? null,
      isActive: true,
      updatedAt: now,
    }).returning();
    loc = inserted;
  }

  return res.json({
    staffId: loc.staffId,
    staffName: staffRow.name,
    role: staffRow.role,
    hub: staffRow.hub,
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy,
    speed: loc.speed,
    heading: loc.heading,
    updatedAt: loc.updatedAt.toISOString(),
    isActive: loc.isActive,
    isCheckedIn,
  });
});

// GET /locations — admin map polls this
router.get("/locations", async (req, res) => {
  const { hub } = req.query as Record<string, string>;

  const locs = await db.select().from(staffLocations).where(eq(staffLocations.isActive, true));
  const staffRows = await db.select().from(staffTable);
  const staffMap = new Map(staffRows.map((s) => [s.id, s]));

  const today = TODAY();
  const todayAtt = await db.select().from(attendanceRecords).where(eq(attendanceRecords.date, today));
  const attMap = new Map(todayAtt.map((a) => [a.staffId, a]));

  // Mark stale (not updated in last 5 minutes)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  let results = locs
    .filter((loc) => staffMap.has(loc.staffId))
    .map((loc) => {
      const s = staffMap.get(loc.staffId)!;
      const att = attMap.get(loc.staffId);
      const isCheckedIn = !!att?.checkIn && !att?.checkOut;
      return {
        staffId: loc.staffId,
        staffName: s.name,
        role: s.role,
        hub: s.hub,
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        updatedAt: loc.updatedAt.toISOString(),
        isActive: loc.updatedAt > fiveMinAgo,
        isCheckedIn,
      };
    });

  if (hub) results = results.filter((r) => r.hub === hub);
  return res.json(results);
});

export default router;
